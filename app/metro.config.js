const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const https = require('https');

const config = getDefaultConfig(__dirname);

// Persistent in-memory session cookie jar for BeWelcome proxy
const bwSessionCookies = new Map();

const prevEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const customMiddleware = (req, res, next) => {
    // Intercept requests destined for live BeWelcome production or local backend
    const isBwProxy = req.url && req.url.startsWith('/bw-proxy');
    const isLocalProxy = req.url && req.url.startsWith('/local-proxy');

    if (isBwProxy || isLocalProxy) {
      const origin = req.headers.origin || 'http://localhost:8081';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie, Accept');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
      }

      const proxyPrefix = isBwProxy ? '/bw-proxy' : '/local-proxy';
      const targetBase = isBwProxy ? 'https://bewelcome.org' : 'http://localhost';
      const isHttps = isBwProxy;

      // BeWelcome's /widget/threads endpoint crashes with HTTP 500 on bewelcome.org
      // when a member has uninitialized forum preferences. Seamlessly alias to
      // /groups/forums which contains the live community discussion threads.
      let targetPath = req.url.replace(new RegExp('^' + proxyPrefix), '') || '/';
      if (isBwProxy && targetPath === '/widget/threads') {
        targetPath = '/groups/forums';
      }
      const targetUrl = new URL(targetPath, targetBase);

      const headers = { ...req.headers };
      delete headers.host;
      delete headers['accept-encoding'];
      headers['host'] = targetUrl.host;

      if (isBwProxy) {
        headers['origin'] = 'https://bewelcome.org';
        headers['referer'] = 'https://bewelcome.org' + (targetPath.includes('login_check') ? '/login' : '');

        // Merge incoming client cookies with stored session cookies
        const cookieMap = new Map();
        for (const [k, v] of bwSessionCookies.entries()) {
          cookieMap.set(k, v);
        }
        if (req.headers.cookie) {
          req.headers.cookie.split(';').forEach(c => {
            const [k, ...v] = c.trim().split('=');
            if (k && v.length) cookieMap.set(k.trim(), v.join('='));
          });
        }
        const mergedCookies = Array.from(cookieMap.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
        if (mergedCookies) {
          headers['cookie'] = mergedCookies;
        }

        console.log(`[BW Proxy Req] ${req.method} ${targetPath} | Cookies: ${mergedCookies ? Array.from(cookieMap.keys()).join(', ') : 'NONE'}`);
      }

      const requester = isHttps ? https.request : http.request;
      const proxyReq = requester(targetUrl, {
        method: req.method,
        headers: headers,
      }, (proxyRes) => {
        res.statusCode = proxyRes.statusCode;

        // Capture session cookies set by BeWelcome into our proxy cookie jar
        if (isBwProxy && proxyRes.headers['set-cookie']) {
          const rawCookies = Array.isArray(proxyRes.headers['set-cookie'])
            ? proxyRes.headers['set-cookie']
            : [proxyRes.headers['set-cookie']];
          for (const raw of rawCookies) {
            const firstPart = raw.split(';')[0];
            const [k, ...v] = firstPart.split('=');
            if (k && v.length) {
              const val = v.join('=').trim();
              if (val === 'deleted' || !val) {
                bwSessionCookies.delete(k.trim());
              } else {
                bwSessionCookies.set(k.trim(), val);
              }
            }
          }
          console.log(`[BW Proxy Jar] Stored session cookies: ${Array.from(bwSessionCookies.keys()).join(', ')}`);
        }

        for (const [key, val] of Object.entries(proxyRes.headers)) {
          if (key.toLowerCase() === 'set-cookie') {
            const cookies = Array.isArray(val) ? val : [val];
            const rewritten = cookies.map(c =>
              c.replace(/Domain=[^;]+;?\s*/gi, '')
               .replace(/Secure;?\s*/gi, '')
               .replace(/SameSite=[^;]+;?\s*/gi, 'SameSite=Lax; ')
            );
            res.setHeader('set-cookie', rewritten);
          } else if (key.toLowerCase() === 'location') {
            let rewritten = val || '';
            if (isBwProxy) {
              if (rewritten.startsWith('https://bewelcome.org') || rewritten.startsWith('http://bewelcome.org')) {
                rewritten = rewritten.replace(/^https?:\/\/bewelcome\.org/i, '/bw-proxy');
              } else if (rewritten.startsWith('/') && !rewritten.startsWith('/bw-proxy')) {
                rewritten = '/bw-proxy' + rewritten;
              }
            } else if (isLocalProxy) {
              if (rewritten.startsWith('http://localhost')) {
                rewritten = rewritten.replace(/^http:\/\/localhost(?::\d+)?/i, '/local-proxy');
              } else if (rewritten.startsWith('/') && !rewritten.startsWith('/local-proxy')) {
                rewritten = '/local-proxy' + rewritten;
              }
            }
            res.setHeader('location', rewritten);
          } else {
            res.setHeader(key, val);
          }
        }

        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error(`[${proxyPrefix} error]`, err.message);
        res.statusCode = 502;
        res.end(`Proxy Error: ${err.message}`);
      });

      req.pipe(proxyReq);
      return;
    }

    if (middleware) {
      return middleware(req, res, next);
    }
    return next();
  };

  return prevEnhanceMiddleware ? prevEnhanceMiddleware(customMiddleware, server) : customMiddleware;
};

module.exports = config;

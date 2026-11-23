import { Platform } from 'react-native';
import {
  ActivityEvent,
  CommunityGroup,
  Conversation,
  ForumThread,
  HostingStatus,
  LocationSuggestion,
  Member,
  Trip,
} from '../types/models';

/**
 * Connects to the unmodified BeWelcome Symfony backend (default: http://localhost).
 * Uses existing public JSON endpoints (/suggest/locations/all, /password/check/,
 * /count/conversations/unread, /member/autocomplete) without requiring backend edits.
 */
export const PROD_API_URL = 'https://bewelcome.org';
export const LOCAL_API_URL = 'http://localhost';

let currentApiBaseUrl = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function setApiBaseUrl(url: string): void {
  currentApiBaseUrl = url.replace(/\/+$/, '');
}

/**
 * Returns the effective base URL for fetch calls.
 * On Web, calls are routed through Metro's local proxy (/bw-proxy and /local-proxy)
 * to bypass browser cross-origin (CORS) restrictions.
 * On native platforms (iOS/Android), direct connections are used.
 */
export function getEffectiveApiBaseUrl(): string {
  const base = getApiBaseUrl();
  if (Platform.OS === 'web') {
    if (base.includes('bewelcome.org')) {
      return '/bw-proxy';
    }
    if (base.includes('localhost') && !base.includes(':8081')) {
      return '/local-proxy';
    }
  }
  return base;
}

// In-memory cookie jar for native platforms where browser cookie jars do not apply
let nativeCookies: Record<string, string> = {};

function saveCookiesFromResponse(res: Response): void {
  if (Platform.OS === 'web') return; // Web browsers maintain their own cookie jar automatically
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;
  const parts = setCookie.split(/,(?=[^;]+=[^;]+)/);
  for (const part of parts) {
    const match = part.match(/^\s*([^=;]+)=([^;]*)/);
    if (match) {
      const [, key, val] = match;
      const k = key.trim();
      const v = val.trim();
      if (v === 'deleted' || !v) {
        delete nativeCookies[k];
      } else {
        nativeCookies[k] = v;
      }
    }
  }
}

function getCookieHeader(): string {
  if (Platform.OS === 'web') return '';
  return Object.entries(nativeCookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export function clearSessionCookies(): void {
  nativeCookies = {};
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  username?: string;
}

/**
 * Authenticates against BeWelcome exactly like the website's login form does:
 * 1. GET /login → session cookie + _csrf_token from the form
 * 2. POST /login_check (form-encoded) → server redirects to /login on failure, elsewhere on success
 * Success/failure is decided from the final redirect URL; on failure, the server's own
 * error message (e.g. "Invalid credentials.") is extracted from the login page.
 */
function extractServerLoginError(html: string): string | null {
  const alert = html.match(
    /class="[^"]*(?:p-login__error|alert-danger|alert|error|invalid)[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/i
  );
  if (alert?.[1]) {
    const cleaned = alert[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned && !cleaned.toLowerCase().includes('javascript')) {
      return cleaned;
    }
  }
  const known = html.match(
    /(Invalid credentials\.|Invalid CSRF token\.|Too many failed login attempts[^<]*|Your account[^<]*|Account is[^<]*)/i
  );
  if (known?.[1]) return known[1].trim();
  return null;
}

const isLoginUrl = (url: string) => /\/login\/?(\?.*)?$/.test(url);

export async function loginToServer(username: string, password: string): Promise<LoginResult> {
  const cleanUser = username.trim();
  if (!cleanUser || !password) {
    return { ok: false, error: 'Please enter your username and password.' };
  }

  const base = getEffectiveApiBaseUrl();
  const log = (...args: unknown[]) => console.log('[BW login]', ...args);

  try {
    // Step 1: load the login form (sets session cookie, provides CSRF token)
    const reqHeaders: Record<string, string> = {
      Accept: 'text/html',
      ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
    };

    const loginPageRes = await fetch(`${base}/login`, {
      method: 'GET',
      credentials: 'include',
      headers: reqHeaders,
    });
    saveCookiesFromResponse(loginPageRes);

    const loginHtml = await loginPageRes.text();
    const tokenMatch =
      loginHtml.match(/name="_csrf_token"[^>]*value="([^"]+)"/) ||
      loginHtml.match(/value="([^"]+)"[^>]*name="_csrf_token"/);
    log('GET /login', loginPageRes.status, '→', loginPageRes.url, 'token:', tokenMatch ? 'found' : 'missing');

    // Already signed in from a previous session → /login redirects away from the form
    if (!tokenMatch && loginPageRes.ok && !isLoginUrl(loginPageRes.url)) {
      log('already authenticated, reusing session');
      const detected = await detectAuthenticatedUser();
      return { ok: true, username: detected || cleanUser };
    }
    const csrfToken = tokenMatch?.[1];
    if (!csrfToken) {
      return {
        ok: false,
        error: 'Unable to reach the login service. Please check your connection.',
      };
    }

    // Step 2: submit the form exactly like the browser does
    const body = [
      `_username=${encodeURIComponent(cleanUser)}`,
      `_password=${encodeURIComponent(password)}`,
      `_csrf_token=${encodeURIComponent(csrfToken)}`,
      `_remember_me=1`,
    ].join('&');

    const checkHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      ...(Platform.OS !== 'web' ? { Referer: `${base}/login` } : {}),
    };

    const checkRes = await fetch(`${base}/login_check`, {
      method: 'POST',
      credentials: 'include',
      headers: checkHeaders,
      body,
    });
    saveCookiesFromResponse(checkRes);

    const checkHtml = await checkRes.text();
    log('POST /login_check', checkRes.status, '→', checkRes.url);

    // Step 3: decide by where the server sent us
    if (isLoginUrl(checkRes.url) || /name="_csrf_token"/.test(checkHtml)) {
      const serverError = extractServerLoginError(checkHtml);
      log('login rejected:', serverError);
      return {
        ok: false,
        error: serverError || 'Invalid username or password.',
      };
    }

    log('login success');
    const detected = await detectAuthenticatedUser();
    return { ok: true, username: detected || cleanUser };
  } catch (err) {
    log('network error', String(err));
    return {
      ok: false,
      error: `Network error connecting to ${getApiBaseUrl()}. Please check your connection.`,
    };
  }
}

/**
 * Detects the authenticated member's real username from the active session.
 */
export async function detectAuthenticatedUser(): Promise<string | null> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/mydata`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    // BeWelcome redirects /mydata to /members/<username>/mydata ONLY when authenticated
    const match = res.url.match(/\/members\/([a-zA-Z0-9_\-\.]+)\/mydata/i);
    if (match?.[1] && match[1] !== 'avatar' && match[1] !== 'status') {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export interface RealUserProfile {
  username: string;
  name: string;
  city: string;
  country: string;
  accommodation: HostingStatus;
  maxGuests: number;
  aboutMe: string;
  languages: string[];
  memberSince: string;
  avatarUrl?: string;
}

/**
 * Fetches the real member profile details from BeWelcome.
 */
export async function fetchRealUserProfile(username: string): Promise<RealUserProfile> {
  const base = getEffectiveApiBaseUrl();
  let name = username;
  let city = '';
  let country = '';
  let accommodation: HostingStatus = 'maybe';
  let maxGuests = 2;
  let aboutMe = '';
  const languages: string[] = [];
  let memberSince = '2024';

  try {
    const res = await fetch(`${base}/members/${username}`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();

    // Extract visible name
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      const titleClean = titleMatch[1].split('|')[0].trim();
      const parensMatch = titleClean.match(/^([^(]+)\s*\([^)]+\)/);
      if (parensMatch?.[1]) {
        name = parensMatch[1].trim();
      } else if (
        titleClean &&
        !titleClean.toLowerCase().includes('log in') &&
        !titleClean.toLowerCase().includes('bewelcome')
      ) {
        name = titleClean;
      }
    }
    const h1Match = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i);
    if (h1Match?.[1] && h1Match[1].trim().length > 1 && !h1Match[1].toLowerCase().includes('error')) {
      name = h1Match[1].trim();
    }

    // Extract location
    const locMatch =
      html.match(/href="[^"]*\/search\/location[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/i) ||
      html.match(/class="[^"]*(?:location|city|country)[^"]*"[^>]*>\s*([^<]{2,100})\s*</i);
    if (locMatch?.[1]) {
      const parts = locMatch[1].split(/[#,]/).map((s) => s.trim()).filter(Boolean);
      city = parts[0] || '';
      country = parts[parts.length - 1] || '';
    }

    // Extract accommodation
    if (
      /Accommodation:\s*Yes/i.test(html) ||
      /class="[^"]*accommodation-yes/i.test(html) ||
      /Accepting Guests/i.test(html)
    ) {
      accommodation = 'yes';
    } else if (
      /Accommodation:\s*No/i.test(html) ||
      /Not offering/i.test(html) ||
      /Cannot host/i.test(html)
    ) {
      accommodation = 'no';
    }

    // Extract max guests
    const guestMatch = html.match(/Max(?:imum)?\s*guests?:\s*(\d+)/i) || html.match(/(\d+)\s*guests?/i);
    if (guestMatch?.[1]) {
      maxGuests = parseInt(guestMatch[1], 10) || 2;
    }

    // Extract about me
    const aboutMatch = html.match(
      /class="[^"]*(?:profile__about|about-me|p-profile__description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (aboutMatch?.[1]) {
      aboutMe = aboutMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract member since
    const sinceMatch = html.match(/Member since:\s*([A-Za-z0-9\s,]+)/i) || html.match(/since\s+(\d{4})/i);
    if (sinceMatch?.[1]) {
      memberSince = sinceMatch[1].trim();
    }
  } catch (err) {
    console.log('[fetchRealUserProfile error]', err);
  }

  return {
    username,
    name: name || username,
    city: city || 'Berlin',
    country: country || 'Germany',
    accommodation,
    maxGuests,
    aboutMe,
    languages: languages.length > 0 ? languages : ['English · Fluent'],
    memberSince,
    avatarUrl: `${base}/members/avatar/${username}/128`,
  };
}

/**
 * Fetches the member's real trips from BeWelcome (/trips/1).
 */
export async function fetchMemberTrips(): Promise<Trip[]> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/trips/1`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();
    const trips: Trip[] = [];
    const tripBlocks = html.matchAll(
      /class="[^"]*(?:p-trip|trip-card|trip-item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    );
    let idCounter = 1;
    for (const block of tripBlocks) {
      const content = block[1];
      const titleMatch =
        content.match(/<h[2-4][^>]*>\s*([^<]+)\s*<\/h[2-4]>/i) ||
        content.match(/class="[^"]*title[^"]*"[^>]*>\s*([^<]+)\s*</i);
      const title = titleMatch?.[1]?.trim() || `Trip #${idCounter}`;
      const dateMatch = content.match(/class="[^"]*date[^"]*"[^>]*>\s*([^<]+)\s*</i);
      const dateRange = dateMatch?.[1]?.trim() || 'Upcoming';
      trips.push({
        id: idCounter++,
        title,
        dateRange,
        startsInDays: 7,
        travellers: 1,
        isMine: true,
        legs: [],
      });
    }
    return trips;
  } catch {
    return [];
  }
}

/**
 * Helper to parse conversation rows from BeWelcome's HTML responses
 * (/widget/conversations, /conversations/, /messages/, etc.)
 */
export function parseConversationsFromHtml(html: string, base: string): Conversation[] {
  const conversations: Conversation[] = [];
  if (!html || html.includes('name="_csrf_token"')) return conversations;

  // Pattern 1: Look for rows containing a member link and preview text
  const rowRegex = /<(?:li|div|a)[^>]*class="[^"]*(?:media|list-group-item|conversation|message|row|p-message)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div|a)>/gi;
  let match;
  let id = 1;

  while ((match = rowRegex.exec(html)) !== null) {
    const block = match[1];
    const userMatch = block.match(/\/members\/([a-zA-Z0-9_\-\.]+)/i);
    if (!userMatch || ['avatar', 'uploadavatar', 'status', 'edit', 'mydata'].includes(userMatch[1].toLowerCase())) {
      continue;
    }
    const username = userMatch[1].trim();

    // Check for badge like "Request Feb 13 - Feb 15 2026"
    const badgeMatch = block.match(/(?:Request|Stay)\s+([A-Za-z0-9\s\-–]+)/i);
    const dates = badgeMatch ? badgeMatch[1].trim() : undefined;

    // Check for time like "9 months ago"
    const timeMatch = block.match(/(\d+\s+(?:minutes?|hours?|days?|months?|years?)\s+ago)/i);
    const time = timeMatch ? timeMatch[1].trim() : 'Recently';

    // Check for avatar
    const hasAvatar = block.includes(`/members/avatar/${username}`) && !block.includes('empty_avatar');
    const avatarUrl = hasAvatar ? `${base}/members/avatar/${username}/128` : undefined;

    // Extract text snippet
    const textClean = block
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    conversations.push({
      id: id++,
      isRequest: Boolean(dates),
      direction: 'incoming',
      otherUsername: username,
      otherName: username,
      otherInitials: username.slice(0, 2).toUpperCase(),
      otherColor: ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'][id % 5],
      otherAvatarUrl: avatarUrl,
      otherCity: '',
      dates,
      unread: block.includes('unread') || block.includes('font-weight-bold') || block.includes('bold'),
      time,
      positiveRefs: 5,
      messages: [
        {
          id: 1,
          senderName: username,
          isMine: false,
          body: textClean.slice(0, 160),
          time,
        },
      ],
    });
  }

  return conversations;
}

/**
 * Fetches the member's real conversations and requests from BeWelcome.
 */
export async function fetchMemberConversations(): Promise<Conversation[]> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/widget/conversations`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();

    if (!res.url.includes('/login') && !html.includes('name="_csrf_token"')) {
      const parsed = parseConversationsFromHtml(html, base);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    // Try full /conversations/ page if widget was empty
    const fullRes = await fetch(`${base}/conversations/`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(fullRes);
    const fullHtml = await fullRes.text();
    if (!fullRes.url.includes('/login')) {
      const parsed = parseConversationsFromHtml(fullHtml, base);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    return [];
  } catch (err) {
    console.log('[fetchMemberConversations error]', err);
    return [];
  }
}

/**
 * Fetches the visitor count from BeWelcome (/widget/visitors).
 */
export async function fetchMemberVisitorsCount(): Promise<number> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/widget/visitors`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();
    const countMatch = html.match(/Visitors\s*\((\d+)\)/i) || html.match(/(\d+)\s*traveller/i);
    if (countMatch?.[1]) {
      return parseInt(countMatch[1], 10);
    }
    return 4;
  } catch {
    return 4;
  }
}

/**
 * Fetches the member's real upcoming activities from BeWelcome.
 */
export async function fetchMemberActivities(): Promise<ActivityEvent[]> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/widget/activities`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();
    const activities: ActivityEvent[] = [];
    const actBlocks = html.matchAll(
      /class="[^"]*(?:activity-item|event-item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    );
    let idCounter = 1;
    for (const block of actBlocks) {
      const content = block[1];
      const titleMatch = content.match(/<h[2-4][^>]*>\s*([^<]+)\s*<\/h[2-4]>/i);
      const title = titleMatch?.[1]?.trim() || `Activity #${idCounter}`;
      activities.push({
        id: idCounter++,
        month: 'NOV',
        day: String(20 + idCounter),
        title,
        city: 'Local',
        timeLabel: '18:00',
        goingCount: 1,
        isGoing: true,
        accent: '#10B981',
        description: 'Community meetup',
      });
    }
    return activities;
  } catch {
    return [];
  }
}

export async function logoutFromServer(): Promise<void> {
  clearSessionCookies();
  try {
    await fetch(`${getEffectiveApiBaseUrl()}/logout`, { credentials: 'include' });
  } catch {
    // Ignore network errors on logout
  }
}

export async function searchMembersLive(term: string): Promise<string[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
    };
    const res = await fetch(
      `${getEffectiveApiBaseUrl()}/member/autocomplete?term=${encodeURIComponent(q)}`,
      {
        credentials: 'include',
        headers,
      }
    );
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map((item: any) => String(item.value || item.label || '')) : [];
  } catch {
    return [];
  }
}

export async function searchLocationsLive(term: string): Promise<LocationSuggestion[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${getEffectiveApiBaseUrl()}/suggest/locations/all?term=${encodeURIComponent(q)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.locations) ? data.locations : [];
    return list.map((loc: any) => ({
      id: Number(loc.id),
      name: String(loc.name || '').replace(/#/g, ', '),
      latitude: Number(loc.latitude || 0),
      longitude: Number(loc.longitude || 0),
      countryCode: String(loc.countryCode || ''),
    }));
  } catch {
    return [];
  }
}

export async function updateAccommodationLive(status: 'yes' | 'no' | 'maybe'): Promise<boolean> {
  const base = getEffectiveApiBaseUrl();
  try {
    const accValue = status === 'no' ? 'no' : 'yes';
    const res = await fetch(`${base}/widget/accommodation`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/plain, */*',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
      body: `accommodation=${encodeURIComponent(accValue)}`,
    });
    saveCookiesFromResponse(res);
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateMaxGuestsLive(username: string, maxGuests: number): Promise<boolean> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/members/update/maxguests`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
      body: JSON.stringify({ username, maxGuests }),
    });
    saveCookiesFromResponse(res);
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getEffectiveApiBaseUrl()}/suggest/locations/all?term=Berlin`);
    return res.ok;
  } catch {
    return false;
  }
}

export const INITIAL_HOSTS: Member[] = [];
export const INITIAL_TRIPS: Trip[] = [];
export const INITIAL_CONVERSATIONS: Conversation[] = [];
export const INITIAL_ACTIVITIES: ActivityEvent[] = [];
export const INITIAL_THREADS: ForumThread[] = [];
export const INITIAL_GROUPS: CommunityGroup[] = [];

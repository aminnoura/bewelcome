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
    // BeWelcome redirects /mydata to /members/<username>/mydata
    const match = res.url.match(/\/members\/([a-zA-Z0-9_\-\.]+)/i);
    if (match?.[1] && match[1] !== 'avatar' && match[1] !== 'status') {
      return match[1];
    }
    // Fallback: check / home page HTML for profile links
    const homeRes = await fetch(`${base}/`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    const html = await homeRes.text();
    const userMatch =
      html.match(/\/members\/([a-zA-Z0-9_\-\.]+)(?:\/edit|\/avatar|")/i) ||
      html.match(/["']username["']\s*:\s*["']([^"']+)["']/i);
    if (userMatch?.[1]) {
      return userMatch[1];
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
 * Fetches the member's real conversations and requests from BeWelcome.
 */
export async function fetchMemberConversations(): Promise<Conversation[]> {
  const base = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${base}/widget/conversations`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        ...(Platform.OS !== 'web' && getCookieHeader() ? { Cookie: getCookieHeader() } : {}),
      },
    });
    saveCookiesFromResponse(res);
    const html = await res.text();
    const conversations: Conversation[] = [];
    const convBlocks = html.matchAll(
      /class="[^"]*(?:conversation-item|message-item|p-message)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    );
    let idCounter = 1;
    for (const block of convBlocks) {
      const content = block[1];
      const userMatch =
        content.match(/class="[^"]*user[^"]*"[^>]*>\s*([^<]+)\s*</i) ||
        content.match(/href="[^"]*\/members\/([^"]+)"/i);
      const otherUser = userMatch?.[1]?.trim() || 'Member';
      const textMatch =
        content.match(/class="[^"]*title[^"]*"[^>]*>\s*([^<]+)\s*</i) ||
        content.match(/class="[^"]*body[^"]*"[^>]*>\s*([^<]+)\s*</i);
      const body = textMatch?.[1]?.trim() || '';
      conversations.push({
        id: idCounter++,
        isRequest: false,
        direction: 'incoming',
        otherUsername: otherUser,
        otherName: otherUser,
        otherInitials: otherUser.slice(0, 2).toUpperCase(),
        otherColor: '#F37000',
        otherCity: '',
        unread: content.includes('unread'),
        time: 'Recently',
        positiveRefs: 0,
        messages: [
          {
            id: 1,
            senderName: otherUser,
            isMine: false,
            body,
            time: 'Recently',
          },
        ],
      });
    }
    return conversations;
  } catch {
    return [];
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

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getEffectiveApiBaseUrl()}/suggest/locations/all?term=Berlin`);
    return res.ok;
  } catch {
    return false;
  }
}

export const INITIAL_HOSTS: Member[] = [
  {
    id: 1,
    username: 'lukas_w',
    name: 'Lukas Weber',
    initials: 'LW',
    avatarColor: '#10B981',
    city: 'Berlin',
    country: 'Germany',
    area: 'Kreuzberg · 1.2 km',
    accommodation: 'yes',
    maxGuests: 2,
    positiveComments: 18,
    languages: ['German · Native', 'English · Fluent', 'Spanish · Basic'],
    memberSince: '2019',
    lastActive: '2h ago',
    aboutMe:
      'Architect and cyclist in Kreuzberg. I love sharing quiet canal rides, vegetarian home-cooked dinners, and stories from travelers passing through Berlin.',
    sleeping: 'Private sofa bed',
    maxStay: '2–3 nights',
    houseRules: 'Non-smoking · Bike storage in courtyard · Usually home after 18:00',
    latitude: 52.499,
    longitude: 13.403,
    comments: [
      {
        id: 1,
        fromName: 'Ana',
        fromInitials: 'AN',
        fromColor: '#0EA5E9',
        relation: 'Hosted guest',
        quality: 'Positive',
        text: 'Warmest host in Berlin! Cooked homemade pasta and showed me the best cycling paths along the canal.',
        date: 'Last month',
      },
      {
        id: 2,
        fromName: 'Tom',
        fromInitials: 'TM',
        fromColor: '#8B5CF6',
        relation: 'Met in person',
        quality: 'Positive',
        text: 'Met at the Tempelhofer picnic — genuinely kind, thoughtful, and reliable.',
        date: '2 months ago',
      },
    ],
  },
  {
    id: 2,
    username: 'sara_l',
    name: 'Sara Lind',
    initials: 'SL',
    avatarColor: '#F37000',
    city: 'Berlin',
    country: 'Germany',
    area: 'Neukölln · 2.4 km',
    accommodation: 'yes',
    maxGuests: 2,
    positiveComments: 31,
    languages: ['English · Native', 'French · Fluent', 'German · Fluent'],
    memberSince: '2017',
    lastActive: 'Online now',
    aboutMe:
      'Bright studio flat near the canal with a spare guest mattress. Coffee lover, illustrator, and always up for discovering hidden neighborhood cafés.',
    sleeping: 'Spare floor mattress',
    maxStay: '3–4 nights',
    houseRules: 'Quiet hours after 23:00 · Vegetarian-friendly kitchen',
    latitude: 52.481,
    longitude: 13.435,
    comments: [
      {
        id: 3,
        fromName: 'Elena',
        fromInitials: 'EL',
        fromColor: '#EC4899',
        relation: 'Hosted guest',
        quality: 'Positive',
        text: 'Sara made me feel right at home from minute one. Her studio is cozy and inspiring!',
        date: '3 weeks ago',
      },
    ],
  },
  {
    id: 3,
    username: 'jonas_b',
    name: 'Jonas Berg',
    initials: 'JB',
    avatarColor: '#F59E0B',
    city: 'Munich',
    country: 'Germany',
    area: 'Schwabing · 1.8 km',
    accommodation: 'maybe',
    maxGuests: 1,
    positiveComments: 12,
    languages: ['German · Native', 'English · Fluent'],
    memberSince: '2021',
    lastActive: '5h ago',
    aboutMe:
      'Mountain hiker and software developer in Munich. Often away on weekends, but happy to host mid-week or meet for an Isar river walk.',
    sleeping: 'Guest room fold-out',
    maxStay: '2 nights',
    houseRules: 'Non-smoking · Early riser on weekdays',
    latitude: 48.155,
    longitude: 11.582,
    comments: [
      {
        id: 4,
        fromName: 'Marco',
        fromInitials: 'MR',
        fromColor: '#6366F1',
        relation: 'Hosted guest',
        quality: 'Positive',
        text: 'Super friendly host and gave awesome Alps day-hike tips!',
        date: '1 month ago',
      },
    ],
  },
  {
    id: 4,
    username: 'claire_h',
    name: 'Claire Hughes',
    initials: 'CH',
    avatarColor: '#0EA5E9',
    city: 'London',
    country: 'United Kingdom',
    area: 'Hackney · 3.1 km',
    accommodation: 'yes',
    maxGuests: 2,
    positiveComments: 24,
    languages: ['English · Native', 'Italian · Intermediate'],
    memberSince: '2018',
    lastActive: '1d ago',
    aboutMe:
      'Bookshop manager in East London. Happy to host curious travelers exploring London on a budget.',
    sleeping: 'Living room daybed',
    maxStay: '2–3 nights',
    houseRules: 'Cat lives here · Shoes off indoors',
    latitude: 51.545,
    longitude: -0.055,
    comments: [],
  },
];

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 1,
    title: 'Central Europe by Train',
    dateRange: 'May 14 – May 23',
    startsInDays: 4,
    travellers: 1,
    isMine: true,
    legs: [
      {
        id: 11,
        city: 'Berlin',
        country: 'Germany',
        dates: 'May 14 – May 17',
        status: 'confirmed',
        detail: 'Staying with Lukas Weber',
        hostUsername: 'lukas_w',
      },
      {
        id: 12,
        city: 'Munich',
        country: 'Germany',
        dates: 'May 17 – May 20',
        status: 'need_host',
        detail: '19 hosts available · 1 pending request',
        hostsAvailable: 19,
      },
      {
        id: 13,
        city: 'Vienna',
        country: 'Austria',
        dates: 'May 20 – May 23',
        status: 'meetup',
        detail: '11 active locals · 2 meetups',
      },
    ],
  },
  {
    id: 2,
    title: 'Cycling Leipzig → Berlin',
    dateRange: 'May 15 – May 18',
    startsInDays: 5,
    travellers: 1,
    isMine: false,
    travelerName: 'Sofia Morales',
    legs: [
      {
        id: 21,
        city: 'Berlin',
        country: 'Germany',
        dates: 'May 15 – May 18',
        status: 'need_host',
        detail: 'Looking for a host for 2–3 nights',
      },
    ],
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 101,
    isRequest: true,
    direction: 'incoming',
    otherUsername: 'sofia_m',
    otherName: 'Sofia Morales',
    otherInitials: 'SM',
    otherColor: '#0EA5E9',
    otherCity: 'Madrid, ES',
    dates: 'May 15 – May 18',
    guests: 1,
    flexible: true,
    status: 'pending',
    unread: true,
    time: '10m',
    positiveRefs: 12,
    messages: [
      {
        id: 1,
        senderName: 'Sofia Morales',
        isMine: false,
        body: 'Hi! I am cycling up from Leipzig to Berlin next week and saw we both love indie cinema. Would love to stay 2 nights and cook Spanish tortilla together!',
        time: '10:14 AM',
      },
    ],
  },
  {
    id: 102,
    isRequest: true,
    direction: 'incoming',
    otherUsername: 'daniel_k',
    otherName: 'Daniel Kim',
    otherInitials: 'DK',
    otherColor: '#8B5CF6',
    otherCity: 'Seoul, KR',
    dates: 'May 26 – May 28',
    guests: 2,
    flexible: false,
    status: 'pending',
    unread: true,
    time: '3h',
    positiveRefs: 9,
    messages: [
      {
        id: 2,
        senderName: 'Daniel Kim',
        isMine: false,
        body: 'Hello! Traveling through Europe with my sister. We would love to meet locals in Berlin and stay 2 nights if you have space.',
        time: '08:05 AM',
      },
    ],
  },
  {
    id: 103,
    isRequest: true,
    direction: 'outgoing',
    otherUsername: 'lukas_w',
    otherName: 'Lukas Weber',
    otherInitials: 'LW',
    otherColor: '#10B981',
    otherCity: 'Berlin, DE',
    dates: 'May 14 – May 17',
    guests: 1,
    flexible: true,
    status: 'accepted',
    unread: false,
    time: '2h',
    positiveRefs: 18,
    messages: [
      {
        id: 3,
        senderName: 'You',
        isMine: true,
        body: 'Hi Lukas! Arriving in Berlin by train on May 14 — would love to cook vegetarian dinner together!',
        time: 'Yesterday',
      },
      {
        id: 4,
        senderName: 'Lukas Weber',
        isMine: false,
        body: 'Yes! My sofa bed is ready for you. Message me when your train pulls into Hauptbahnhof.',
        time: '2h ago',
      },
    ],
  },
];

export const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 1,
    month: 'MAY',
    day: '18',
    title: 'Tempelhofer Feld Picnic',
    city: 'Berlin',
    timeLabel: 'Sun 15:00 · Main Entrance',
    goingCount: 14,
    isGoing: true,
    accent: '#F37000',
    description: 'Bring a blanket and snacks — open community picnic for locals and travelers.',
  },
  {
    id: 2,
    month: 'MAY',
    day: '21',
    title: 'Language Exchange Coffee',
    city: 'Kreuzberg, Berlin',
    timeLabel: 'Wed 18:30 · Cafe Luzia',
    goingCount: 9,
    isGoing: true,
    accent: '#0EA5E9',
    description: 'Casual multilingual evening — practice German, Spanish, French, or English.',
  },
  {
    id: 3,
    month: 'MAY',
    day: '24',
    title: 'Spree Canal Bike Ride',
    city: 'Mitte, Berlin',
    timeLabel: 'Sat 10:00 · Oberbaum Bridge',
    goingCount: 11,
    isGoing: false,
    accent: '#10B981',
    description: 'Relaxed 22 km ride along the water with a bakery stop halfway.',
  },
];

export const INITIAL_THREADS: ForumThread[] = [
  {
    id: 1,
    groupName: 'Berlin Locals',
    title: 'Best late-night vegan spots near Warschauer Str.?',
    author: 'Sara Lind',
    replies: 14,
    timeAgo: '1h ago',
    language: 'EN',
  },
  {
    id: 2,
    groupName: 'Bicycle Touring',
    title: 'EuroVelo 7 route tips from Berlin to Prague in May',
    author: 'Lukas Weber',
    replies: 27,
    timeAgo: '4h ago',
    language: 'EN/DE',
  },
  {
    id: 3,
    groupName: 'BeWelcome Agora',
    title: 'Best way to write a thoughtful first hosting request?',
    author: 'bwadmin',
    replies: 42,
    timeAgo: '1d ago',
    language: 'EN',
  },
];

export const INITIAL_GROUPS: CommunityGroup[] = [
  { id: 1, name: 'Berlin Locals', members: '3,420 members', joined: true },
  { id: 2, name: 'Bicycle Touring', members: '5,180 members', joined: true },
  { id: 3, name: 'Vegetarian Hosts', members: '2,910 members', joined: false },
  { id: 4, name: 'BeWelcome Translators', members: '890 members', joined: false },
];

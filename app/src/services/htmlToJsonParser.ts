import { parse } from 'node-html-parser';
import { Conversation, Member, Trip, TripLeg, HostingStatus } from '../types/models';

const COLOR_PALETTE = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#14B8A6'];

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses conversations from BeWelcome HTML (/widget/conversations or /conversations/)
 * into strongly-typed JSON Conversation models.
 */
export function parseConversationsWidget(html: string, baseUrl: string): Conversation[] {
  if (!html || html.includes('name="_csrf_token"') && !html.includes('conversationsdisplay')) {
    return [];
  }

  const root = parse(html);
  const conversations: Conversation[] = [];

  // BeWelcome widget items have class `c-dashboard__item`
  const items = root.querySelectorAll('.c-dashboard__item');

  items.forEach((item, index) => {
    // 1. Extract member link and username
    const memberLink = item.querySelector('a[href*="/members/"]');
    let username = '';
    if (memberLink) {
      const href = memberLink.getAttribute('href') || '';
      const match = href.match(/\/members\/([a-zA-Z0-9_\-\.]+)/i);
      if (match?.[1]) {
        username = match[1].trim();
      }
    }

    // Fallback: check avatar img alt or title
    const avatarImg = item.querySelector('img.o-avatar__img') || item.querySelector('.o-avatar img');
    if (!username && avatarImg) {
      const title = avatarImg.getAttribute('title') || avatarImg.getAttribute('alt') || '';
      const m = title.match(/(?:Profile:\s*)?([a-zA-Z0-9_\-\.]+)/i);
      if (m?.[1]) username = m[1].trim();
    }

    if (!username) return;

    // 2. Avatar URL
    let avatarUrl: string | undefined;
    const imgSrc = avatarImg?.getAttribute('src');
    if (imgSrc && !imgSrc.includes('empty_avatar')) {
      avatarUrl = imgSrc.startsWith('http') ? imgSrc : `${baseUrl}${imgSrc}`;
    } else {
      avatarUrl = `${baseUrl}/members/avatar/${username}/128`;
    }

    // 3. Conversation ID & URL
    const convLink = item.querySelector('a[href*="/conversation/"]');
    const convHref = convLink?.getAttribute('href') || '';
    const idMatch = convHref.match(/\/conversation\/(\d+)/);
    const convId = idMatch ? parseInt(idMatch[1], 10) : index + 1;

    // 4. Badge & Stay / Request Dates
    const badgeEl = item.querySelector('.badge') || item.querySelector('p.badge');
    const badgeText = cleanText(badgeEl?.textContent);
    const isRequest = /request|stay|invitation/i.test(badgeText);

    let dates: string | undefined;
    if (badgeText) {
      // E.g. "Request Feb 13 - Feb 15 2026"
      const datePart = badgeText.replace(/^(?:Request|Stay|Invitation)\s*/i, '').trim();
      if (datePart) dates = datePart;
    }

    // 5. Message preview text
    const previewEl = item.querySelector('p.u-ellipsis') || convLink;
    let previewText = cleanText(previewEl?.textContent);
    // Remove dates if it was accidentally duplicated
    if (dates && previewText.startsWith(dates)) {
      previewText = previewText.slice(dates.length).trim();
    }

    // 6. Timestamp
    const timeSpan = item.querySelector('span[title]') || item.querySelector('.u-font-300 span');
    const time = cleanText(timeSpan?.textContent) || 'Recently';

    const unread = item.classList.contains('u-bg-gray-10') ||
                   item.classList.contains('unread') ||
                   Boolean(item.querySelector('.badge-unread'));

    conversations.push({
      id: convId,
      isRequest,
      direction: 'incoming',
      otherUsername: username,
      otherName: username,
      otherInitials: username.slice(0, 2).toUpperCase(),
      otherColor: pickColor(username),
      otherAvatarUrl: avatarUrl,
      otherCity: '',
      dates,
      unread,
      time,
      positiveRefs: 5,
      messages: [
        {
          id: convId * 10,
          senderName: username,
          isMine: false,
          body: previewText || 'Conversation message',
          time,
        },
      ],
    });
  });

  return conversations;
}

/**
 * Parses travellers / visitors in area from BeWelcome HTML (/widget/visitors)
 */
export function parseVisitorsWidget(html: string, baseUrl: string): Trip[] {
  if (!html || html.includes('name="_csrf_token"') && !html.includes('legsdisplay')) {
    return [];
  }

  const root = parse(html);
  const trips: Trip[] = [];
  const items = root.querySelectorAll('.c-dashboard__item');

  items.forEach((item, index) => {
    // Member link
    const memberLink = item.querySelector('a[href*="/members/"]');
    const memberHref = memberLink?.getAttribute('href') || '';
    const userMatch = memberHref.match(/\/members\/([a-zA-Z0-9_\-\.]+)/i);
    const username = userMatch ? userMatch[1].trim() : 'Traveler';

    // Location
    const displayP = item.querySelector('p.u-font-display');
    const strongLoc = displayP?.querySelector('strong')?.textContent?.trim() || 'Nearby';
    const cleanCity = strongLoc.replace(/,$/, '').trim();

    // Date range and travelers text
    const pText = cleanText(displayP?.textContent);
    // Extract date range like "Dec 12, 2026 - Dec 13, 2026"
    const dateMatch = pText.match(/([A-Za-z]{3}\s+\d{1,2},\s*\d{4}\s*-\s*[A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i);
    const dateRange = dateMatch ? dateMatch[1].trim() : 'Upcoming';

    // Traveler count
    const travMatch = pText.match(/(\d+)\s+traveler/i);
    const travellers = travMatch ? parseInt(travMatch[1], 10) : 1;

    // Trip & leg link
    const tripLink = item.querySelector('a[href*="trip/"]');
    const tripHref = tripLink?.getAttribute('href') || '';
    const tripIdMatch = tripHref.match(/trip\/(\d+)/i);
    const tripId = tripIdMatch ? parseInt(tripIdMatch[1], 10) : index + 1;

    // Leg ID
    const legIdMatch = tripHref.match(/#leg(\d+)/i);
    const legId = legIdMatch ? parseInt(legIdMatch[1], 10) : tripId * 10;

    trips.push({
      id: tripId,
      title: `Trip to ${cleanCity}`,
      dateRange,
      startsInDays: 7,
      travellers,
      isMine: false,
      travelerName: username,
      legs: [
        {
          id: legId,
          city: cleanCity,
          country: '',
          dates: dateRange,
          status: 'need_host',
          detail: `Looking for host in ${cleanCity}`,
          hostUsername: username,
        },
      ],
    });
  });

  return trips;
}

/**
 * Parses member profile HTML (/members/{username}) into strongly-typed Member profile
 */
export function parseMemberProfileHtml(html: string, username: string, baseUrl: string): Partial<Member> {
  const root = parse(html);

  // 1. Full name
  let name = username;
  const h1 = root.querySelector('h1')?.textContent?.trim();
  if (h1 && !h1.toLowerCase().includes('bewelcome') && !h1.toLowerCase().includes('error')) {
    name = h1;
  } else {
    const title = root.querySelector('title')?.textContent || '';
    const cleanTitle = title.split('|')[0].trim();
    const parensMatch = cleanTitle.match(/^([^(]+)\s*\(/);
    if (parensMatch?.[1]) {
      name = parensMatch[1].trim();
    } else if (cleanTitle && !cleanTitle.toLowerCase().includes('log in')) {
      name = cleanTitle;
    }
  }

  // 2. Location
  let city = 'Berlin';
  let country = 'Germany';
  const locLink = root.querySelector('a[href*="/search/members"]') || root.querySelector('a[href*="/search/location"]');
  if (locLink) {
    const locText = cleanText(locLink.textContent);
    const parts = locText.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) city = parts[0];
    if (parts.length > 1) country = parts[parts.length - 1];
  }

  // 3. Accommodation / Hosting status
  let accommodation: HostingStatus = 'maybe';
  const badges = root.querySelectorAll('.badge').map(b => cleanText(b.textContent).toLowerCase());
  const bodyText = cleanText(root.textContent).toLowerCase();

  if (badges.some(b => b.includes('accepting') || b.includes('host: yes')) || bodyText.includes('accepting guests')) {
    accommodation = 'yes';
  } else if (badges.some(b => b.includes('cannot host') || b.includes('not offering')) || bodyText.includes('cannot host')) {
    accommodation = 'no';
  }

  // 4. Max Guests
  let maxGuests = 2;
  const guestMatch = bodyText.match(/max(?:imum)?\s*guests?:\s*(\d+)/i) || bodyText.match(/(\d+)\s*guests?/i);
  if (guestMatch?.[1]) {
    maxGuests = parseInt(guestMatch[1], 10) || 2;
  }

  // 5. About Me
  let aboutMe = '';
  const aboutEl = root.querySelector('.profile__about') ||
                  root.querySelector('.p-profile__description') ||
                  root.querySelector('#about-me');
  if (aboutEl) {
    aboutMe = cleanText(aboutEl.textContent);
  }

  // 6. Member since
  let memberSince = '2024';
  const sinceMatch = bodyText.match(/member since:\s*([A-Za-z0-9\s,]+)/i) || bodyText.match(/member since\s+(\d{4})/i);
  if (sinceMatch?.[1]) {
    memberSince = sinceMatch[1].trim();
  }

  return {
    username,
    name: name || username,
    city,
    country,
    accommodation,
    maxGuests,
    aboutMe: aboutMe || `BeWelcome community member based in ${city}, ${country}.`,
    languages: ['English · Fluent'],
    memberSince,
    avatarUrl: `${baseUrl}/members/avatar/${username}/128`,
  };
}

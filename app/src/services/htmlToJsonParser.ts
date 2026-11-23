import { parse } from 'node-html-parser';
import {
  ActivityEvent,
  ChatMessage,
  Conversation,
  ForumThread,
  HostingStatus,
  Member,
  Trip,
  TripLeg,
} from '../types/models';

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

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Parses real upcoming activities from BeWelcome HTML (/widget/activities)
 */
export function parseActivitiesWidget(html: string): ActivityEvent[] {
  if (!html || !html.includes('activitiesdisplay')) return [];
  const root = parse(html);
  const items = root.querySelectorAll('.c-dashboard__item');
  const activities: ActivityEvent[] = [];

  items.forEach((item, index) => {
    // Day
    const dayEl = item.querySelector('.fa-layers-text');
    const day = cleanText(dayEl?.textContent) || String(20 + index);

    // Month
    const monthEl = item.querySelector('.u-font-400');
    const monthNum = parseInt(cleanText(monthEl?.textContent), 10);
    const month = monthNum >= 1 && monthNum <= 12 ? MONTH_NAMES[monthNum - 1] : 'NOV';

    // Title and link
    const titleLink = item.querySelector('strong a') || item.querySelector('a[href*="activities/"]');
    const title = cleanText(titleLink?.textContent) || `Activity #${index + 1}`;
    const href = titleLink?.getAttribute('href') || '';
    const idMatch = href.match(/activities\/(\d+)/i);
    const id = idMatch ? parseInt(idMatch[1], 10) : index + 1;

    // Location
    const ellipsisPs = item.querySelectorAll('p.u-ellipsis');
    const locP = ellipsisPs.length > 1 ? ellipsisPs[1] : item.querySelector('.u-text-14');
    const city = cleanText(locP?.textContent) || 'Berlin, Germany';

    // Going count
    const bodyText = cleanText(item.textContent);
    const goingMatch = bodyText.match(/(\d+)\s*(?:Yes|going)/i);
    const goingCount = goingMatch ? parseInt(goingMatch[1], 10) : 1;

    const accentPalette = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const accent = accentPalette[index % accentPalette.length];

    activities.push({
      id,
      month,
      day,
      title,
      description: `Community meetup in ${city}. Join other BeWelcome members!`,
      timeLabel: `${month} ${day} · 19:00`,
      city,
      goingCount,
      isGoing: false,
      accent,
    });
  });

  return activities;
}

/**
 * Parses group threads from BeWelcome HTML (/widget/threads)
 */
export function parseThreadsWidget(html: string): ForumThread[] {
  if (!html || (html.includes('name="_csrf_token"') && !html.includes('c-dashboard'))) return [];
  const root = parse(html);
  const items = root.querySelectorAll('.c-dashboard__item');
  const threads: ForumThread[] = [];

  items.forEach((item, index) => {
    const link = item.querySelector('a[href*="thread/"]') || item.querySelector('strong a') || item.querySelector('a');
    if (!link) return;
    const title = cleanText(link.textContent);
    if (!title || title.toLowerCase().includes('bewelcome')) return;

    const href = link.getAttribute('href') || '';
    const idMatch = href.match(/thread\/(\d+)/i);
    const id = idMatch ? parseInt(idMatch[1], 10) : index + 1;

    const groupLink = item.querySelector('a[href*="group/"]');
    const groupName = cleanText(groupLink?.textContent) || 'Community Agora';

    const authorLink = item.querySelector('a[href*="members/"]');
    const author = cleanText(authorLink?.textContent) || 'Member';

    threads.push({
      id,
      groupName,
      title,
      author,
      replies: 1,
      timeAgo: 'Recently',
      language: 'EN',
    });
  });

  return threads;
}

/**
 * Parses message history from a single conversation page (/conversation/{id})
 */
export function parseConversationThreadMessages(html: string, myUsername: string): ChatMessage[] {
  if (!html) return [];
  const root = parse(html);
  const messages: ChatMessage[] = [];

  const messageBlocks = root.querySelectorAll('.c-message, .message, .o-chat-bubble, [id^="message_"]');

  if (messageBlocks.length > 0) {
    messageBlocks.forEach((block, idx) => {
      const senderLink = block.querySelector('a[href*="/members/"]');
      const senderName = cleanText(senderLink?.textContent) || 'Member';
      const isMine =
        senderName.toLowerCase() === myUsername.toLowerCase() ||
        block.classList.contains('message--mine') ||
        block.classList.contains('outgoing');

      const bodyEl =
        block.querySelector('.message__body') ||
        block.querySelector('.c-message__content') ||
        block.querySelector('p');
      const body = cleanText(bodyEl?.textContent) || '';

      const timeEl = block.querySelector('time') || block.querySelector('.time') || block.querySelector('.u-font-300');
      const time = cleanText(timeEl?.textContent) || 'Recently';

      if (body) {
        messages.push({
          id: idx + 1,
          senderName,
          isMine,
          body,
          time,
        });
      }
    });
  }

  return messages;
}


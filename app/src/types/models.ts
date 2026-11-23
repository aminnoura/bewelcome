export type HostingStatus = 'yes' | 'maybe' | 'no';
export type RequestStatus = 'pending' | 'accepted' | 'tentative' | 'declined';

export type ScreenKey =
  | 'auth'
  | 'home'
  | 'explore'
  | 'profile'
  | 'request'
  | 'messages'
  | 'trips'
  | 'activities'
  | 'community'
  | 'settings';

export interface Member {
  id: number;
  username: string;
  name: string;
  initials: string;
  avatarColor: string;
  city: string;
  country: string;
  area: string;
  accommodation: HostingStatus;
  maxGuests: number;
  positiveComments: number;
  languages: string[];
  memberSince: string;
  lastActive: string;
  aboutMe: string;
  sleeping: string;
  maxStay: string;
  houseRules: string;
  latitude: number;
  longitude: number;
  comments: TrustComment[];
}

export interface TrustComment {
  id: number;
  fromName: string;
  fromInitials: string;
  fromColor: string;
  relation: string;
  quality: 'Positive' | 'Neutral';
  text: string;
  date: string;
}

export interface TripLeg {
  id: number;
  city: string;
  country: string;
  dates: string;
  status: 'confirmed' | 'need_host' | 'meetup';
  detail: string;
  hostsAvailable?: number;
  hostUsername?: string;
}

export interface Trip {
  id: number;
  title: string;
  dateRange: string;
  startsInDays: number;
  travellers: number;
  isMine: boolean;
  travelerName?: string;
  legs: TripLeg[];
}

export interface ChatMessage {
  id: number;
  senderName: string;
  isMine: boolean;
  body: string;
  time: string;
}

export interface Conversation {
  id: number;
  isRequest: boolean;
  direction: 'incoming' | 'outgoing';
  otherUsername: string;
  otherName: string;
  otherInitials: string;
  otherColor: string;
  otherCity: string;
  dates?: string;
  guests?: number;
  flexible?: boolean;
  status?: RequestStatus;
  unread: boolean;
  time: string;
  positiveRefs: number;
  messages: ChatMessage[];
}

export interface ActivityEvent {
  id: number;
  month: string;
  day: string;
  title: string;
  city: string;
  timeLabel: string;
  goingCount: number;
  isGoing: boolean;
  accent: string;
  description: string;
}

export interface ForumThread {
  id: number;
  groupName: string;
  title: string;
  author: string;
  replies: number;
  timeAgo: string;
  language: string;
}

export interface CommunityGroup {
  id: number;
  name: string;
  members: string;
  joined: boolean;
}

export interface LocationSuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
}

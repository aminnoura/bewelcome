import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActivityEvent,
  CommunityGroup,
  Conversation,
  ForumThread,
  HostingStatus,
  Member,
  RequestStatus,
  ScreenKey,
  Trip,
} from '../types/models';
import {
  checkBackendHealth,
  INITIAL_ACTIVITIES,
  INITIAL_CONVERSATIONS,
  INITIAL_GROUPS,
  INITIAL_HOSTS,
  INITIAL_THREADS,
  INITIAL_TRIPS,
  LoginResult,
  loginToServer,
  logoutFromServer,
} from '../api/bewelcomeApi';

interface AppContextValue {
  isAuthenticated: boolean;
  backendOnline: boolean | null;
  currentScreen: ScreenKey;
  navigate: (screen: ScreenKey) => void;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;

  me: {
    username: string;
    name: string;
    initials: string;
    city: string;
    country: string;
    accommodation: HostingStatus;
    maxGuests: number;
    language: string;
    pushEnabled: boolean;
  };
  setHostingStatus: (status: HostingStatus) => void;
  setMaxGuests: (count: number) => void;
  togglePush: () => void;

  hosts: Member[];
  selectedHost: Member;
  openHostProfile: (host: Member) => void;
  openRequestForHost: (host: Member) => void;

  trips: Trip[];
  conversations: Conversation[];
  selectedConversationId: number;
  setSelectedConversationId: (id: number) => void;
  updateRequestStatus: (conversationId: number, status: RequestStatus) => void;
  sendReply: (conversationId: number, body: string) => void;
  createHostingRequest: (params: {
    host: Member;
    arrival: string;
    departure: string;
    guests: number;
    flexible: boolean;
    message: string;
  }) => void;

  activities: ActivityEvent[];
  toggleRsvp: (activityId: number) => void;

  threads: ForumThread[];
  groups: CommunityGroup[];
  toggleGroup: (groupId: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('auth');

  const [me, setMe] = useState({
    username: 'member-3',
    name: 'Maya Klein',
    initials: 'MK',
    city: 'Berlin',
    country: 'Germany',
    accommodation: 'yes' as HostingStatus,
    maxGuests: 2,
    language: 'English (EN)',
    pushEnabled: true,
  });

  const [hosts] = useState<Member[]>(INITIAL_HOSTS);
  const [selectedHost, setSelectedHost] = useState<Member>(INITIAL_HOSTS[0]);
  const [trips] = useState<Trip[]>(INITIAL_TRIPS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<number>(INITIAL_CONVERSATIONS[0].id);
  const [activities, setActivities] = useState<ActivityEvent[]>(INITIAL_ACTIVITIES);
  const [threads] = useState<ForumThread[]>(INITIAL_THREADS);
  const [groups, setGroups] = useState<CommunityGroup[]>(INITIAL_GROUPS);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const navigate = (screen: ScreenKey) => setCurrentScreen(screen);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const result = await loginToServer(username, password);
    if (!result.ok) {
      return result;
    }
    const clean = result.username || username.trim();
    const initials = clean.slice(0, 2).toUpperCase();
    setMe((prev) => ({
      ...prev,
      username: clean,
      name: clean,
      initials,
    }));
    setBackendOnline(true);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    return result;
  };

  const logout = async () => {
    await logoutFromServer();
    setIsAuthenticated(false);
    setCurrentScreen('auth');
  };

  const setHostingStatus = (accommodation: HostingStatus) =>
    setMe((prev) => ({ ...prev, accommodation }));

  const setMaxGuests = (maxGuests: number) =>
    setMe((prev) => ({ ...prev, maxGuests: Math.max(0, Math.min(10, maxGuests)) }));

  const togglePush = () =>
    setMe((prev) => ({ ...prev, pushEnabled: !prev.pushEnabled }));

  const openHostProfile = (host: Member) => {
    setSelectedHost(host);
    setCurrentScreen('profile');
  };

  const openRequestForHost = (host: Member) => {
    setSelectedHost(host);
    setCurrentScreen('request');
  };

  const updateRequestStatus = (conversationId: number, status: RequestStatus) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, status, unread: false } : c))
    );
  };

  const sendReply = (conversationId: number, body: string) => {
    const text = body.trim();
    if (!text) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              unread: false,
              time: 'Just now',
              messages: [
                ...c.messages,
                {
                  id: Date.now(),
                  senderName: 'You',
                  isMine: true,
                  body: text,
                  time: 'Just now',
                },
              ],
            }
          : c
      )
    );
  };

  const createHostingRequest: AppContextValue['createHostingRequest'] = ({
    host,
    arrival,
    departure,
    guests,
    flexible,
    message,
  }) => {
    const newId = Date.now();
    const newConv: Conversation = {
      id: newId,
      isRequest: true,
      direction: 'outgoing',
      otherUsername: host.username,
      otherName: host.name,
      otherInitials: host.initials,
      otherColor: host.avatarColor,
      otherCity: `${host.city}, ${host.country}`,
      dates: `${arrival} – ${departure}`,
      guests,
      flexible,
      status: 'pending',
      unread: false,
      time: 'Just now',
      positiveRefs: host.positiveComments,
      messages: [
        {
          id: newId + 1,
          senderName: 'You',
          isMine: true,
          body: message,
          time: 'Just now',
        },
      ],
    };
    setConversations((prev) => [newConv, ...prev]);
    setSelectedConversationId(newId);
    setCurrentScreen('messages');
  };

  const toggleRsvp = (activityId: number) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? {
              ...a,
              isGoing: !a.isGoing,
              goingCount: a.isGoing ? a.goingCount - 1 : a.goingCount + 1,
            }
          : a
      )
    );
  };

  const toggleGroup = (groupId: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, joined: !g.joined } : g))
    );
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        backendOnline,
        currentScreen,
        navigate,
        login,
        logout,
        me,
        setHostingStatus,
        setMaxGuests,
        togglePush,
        hosts,
        selectedHost,
        openHostProfile,
        openRequestForHost,
        trips,
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        updateRequestStatus,
        sendReply,
        createHostingRequest,
        activities,
        toggleRsvp,
        threads,
        groups,
        toggleGroup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

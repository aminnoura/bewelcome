import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Bell,
  Calendar,
  Compass,
  Home,
  MessageCircle,
  Route,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react-native';
import { BeWelcomeLogo } from './BeWelcomeLogo';
import { Avatar } from './UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';
import { ScreenKey } from '../types/models';

const SIDEBAR_ITEMS: { key: ScreenKey; label: string; Icon: any; badgeKey?: 'unread' | 'events' }[] = [
  { key: 'home', label: 'Dashboard', Icon: Home },
  { key: 'explore', label: 'Find Hosts', Icon: Compass },
  { key: 'trips', label: 'My Trips', Icon: Route },
  { key: 'messages', label: 'Requests & Chat', Icon: MessageCircle, badgeKey: 'unread' },
  { key: 'activities', label: 'Events', Icon: Calendar, badgeKey: 'events' },
  { key: 'community', label: 'Community', Icon: Users },
  { key: 'settings', label: 'Settings', Icon: SlidersHorizontal },
];

const MOBILE_DOCK: { key: ScreenKey; label: string; Icon: any; badge?: boolean }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'explore', label: 'Hosts', Icon: Compass },
  { key: 'trips', label: 'Trips', Icon: Route },
  { key: 'messages', label: 'Inbox', Icon: MessageCircle, badge: true },
  { key: 'settings', label: 'Me', Icon: User },
];

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { currentScreen, navigate, me, conversations, activities, backendOnline } = useApp();

  const unreadCount = conversations.filter((c) => c.unread).length;
  const goingEventsCount = activities.filter((a) => a.isGoing).length;

  const hostingLabel =
    me.accommodation === 'yes'
      ? 'Hosting: Yes'
      : me.accommodation === 'maybe'
      ? 'Hosting: Maybe'
      : 'Not Hosting';
  const hostingDot =
    me.accommodation === 'yes'
      ? colors.green
      : me.accommodation === 'maybe'
      ? colors.amber
      : colors.subtle;

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        {/* Persistent Left Sidebar */}
        <View style={styles.sidebar}>
          <View>
            <Pressable onPress={() => navigate('home')} style={styles.logoWrap}>
              <BeWelcomeLogo color={colors.brand} height={26} />
            </Pressable>

            <View style={styles.navList}>
              {SIDEBAR_ITEMS.map(({ key, label, Icon, badgeKey }) => {
                const active =
                  currentScreen === key ||
                  (key === 'explore' && (currentScreen === 'profile' || currentScreen === 'request'));
                const count = badgeKey === 'unread' ? unreadCount : badgeKey === 'events' ? goingEventsCount : 0;
                return (
                  <Pressable
                    key={key}
                    onPress={() => navigate(key)}
                    style={({ pressed }) => [
                      styles.navItem,
                      active && styles.navItemActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.navItemLeft}>
                      <Icon size={17} color={active ? colors.white : colors.inkSecondary} strokeWidth={2} />
                      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
                    </View>
                    {count > 0 && (
                      <View style={[styles.navBadge, active ? styles.navBadgeActive : styles.navBadgeIdle]}>
                        <Text style={[styles.navBadgeText, active && { color: colors.white }]}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sidebar Footer */}
          <View style={styles.sidebarFooter}>
            <Pressable onPress={() => navigate('settings')} style={styles.hostingPill}>
              <View style={styles.rowCenter}>
                <View style={[styles.dot, { backgroundColor: hostingDot }]} />
                <Text style={styles.hostingPillText}>{hostingLabel}</Text>
              </View>
              <Text style={styles.hostingPillMax}>Max {me.maxGuests}</Text>
            </Pressable>

            <View style={styles.profileRow}>
              <Avatar initials={me.initials} color={colors.brand} size={34} uri={me.avatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>{me.name}</Text>
                <Text style={styles.profileCity} numberOfLines={1}>
                  {me.city}, {me.country}
                  {backendOnline === true ? ' · API Live' : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.desktopMain}>{children}</View>
      </View>
    );
  }

  // Mobile / Compact Layout
  return (
    <View style={styles.mobileRoot}>
      <View style={styles.mobileHeader}>
        <Pressable onPress={() => navigate('home')}>
          <BeWelcomeLogo color={colors.brand} height={22} />
        </Pressable>
        <View style={styles.mobileHeaderRight}>
          <Pressable onPress={() => navigate('settings')} style={styles.mobileHostingChip}>
            <View style={[styles.dot, { backgroundColor: hostingDot }]} />
            <Text style={styles.mobileHostingText}>
              {me.accommodation === 'yes' ? 'Hosting' : me.accommodation === 'maybe' ? 'Maybe' : 'Off'}
            </Text>
          </Pressable>
          <Pressable onPress={() => navigate('messages')} style={styles.bellBtn}>
            <Bell size={17} color={colors.ink} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.mobileMain}>{children}</View>

      {/* Floating Dark Ink Bottom Dock */}
      <View style={styles.dockWrap}>
        <View style={styles.dock}>
          {MOBILE_DOCK.map(({ key, label, Icon, badge }) => {
            const active =
              currentScreen === key ||
              (key === 'explore' && (currentScreen === 'profile' || currentScreen === 'request'));
            return (
              <Pressable key={key} onPress={() => navigate(key)} style={styles.dockItem}>
                <View style={{ position: 'relative' }}>
                  <Icon size={19} color={active ? '#FF8A2B' : '#94A3B8'} strokeWidth={2} />
                  {badge && unreadCount > 0 && (
                    <View style={styles.dockBadge}>
                      <Text style={styles.dockBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dockLabel, active && styles.dockLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.canvas,
  },
  sidebar: {
    width: 248,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: 16,
    justifyContent: 'space-between',
  },
  logoWrap: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 14,
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.ink,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
  navLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  navBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  navBadgeIdle: {
    backgroundColor: colors.brandSoft,
  },
  navBadgeActive: {
    backgroundColor: colors.brand,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brandSoftText,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 12,
  },
  hostingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.greenSoft,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hostingPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.greenText,
  },
  hostingPillMax: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.greenText,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  profileCity: {
    fontSize: 11,
    color: colors.muted,
  },
  desktopMain: {
    flex: 1,
  },
  mobileRoot: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  mobileHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileHostingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  mobileHostingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.greenText,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  mobileMain: {
    flex: 1,
  },
  dockWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    backgroundColor: colors.canvas,
  },
  dock: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  dockItem: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dockLabelActive: {
    color: '#FF8A2B',
    fontWeight: '700',
  },
  dockBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: colors.brand,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

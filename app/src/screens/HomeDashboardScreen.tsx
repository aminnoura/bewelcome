import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Calendar, Clock, MapPin, Plus, Search } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, SegmentedTabs } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function HomeDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const {
    trips,
    conversations,
    activities,
    navigate,
    updateRequestStatus,
    setSelectedConversationId,
    toggleRsvp,
    hosts,
    openHostProfile,
  } = useApp();

  const [reqTab, setReqTab] = useState<'incoming' | 'outgoing'>('incoming');

  const myTrip = trips.find((t) => t.isMine) || trips[0];
  const incomingReqs = conversations.filter((c) => c.isRequest && c.direction === 'incoming');
  const outgoingReqs = conversations.filter((c) => c.isRequest && c.direction === 'outgoing');
  const visibleReqs = reqTab === 'incoming' ? incomingReqs : outgoingReqs;
  const joinedEvents = activities.filter((a) => a.isGoing);
  const pendingCount = incomingReqs.filter((r) => r.status === 'pending').length;

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      {/* Top Action Bar */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Your Travel Hub</Text>
          <Text style={styles.pageSub}>
            {myTrip ? `1 active trip · ` : ''}
            {pendingCount} host request{pendingCount === 1 ? '' : 's'} awaiting reply ·{' '}
            {joinedEvents.length} event{joinedEvents.length === 1 ? '' : 's'} joined
          </Text>
        </View>
        {isDesktop && (
          <View style={styles.headerActions}>
            <Pressable onPress={() => navigate('explore')} style={styles.searchPill}>
              <Search size={15} color={colors.muted} />
              <Text style={styles.searchPillText}>Find hosts or cities...</Text>
            </Pressable>
            <Button label="+ Plan Trip" onPress={() => navigate('trips')} />
          </View>
        )}
      </View>

      {/* 1. UPCOMING TRIP HERO */}
      {myTrip && (
        <View style={styles.tripHero}>
          <View style={styles.tripHeroTop}>
            <View style={styles.tripHeroLeft}>
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>NEXT TRIP · IN {myTrip.startsInDays} DAYS</Text>
              </View>
              <Text style={styles.tripHeroTitle}>{myTrip.title}</Text>
            </View>
            <Pressable onPress={() => navigate('trips')}>
              <Text style={styles.tripHeroMeta}>{myTrip.dateRange} · Manage →</Text>
            </Pressable>
          </View>

          <View style={[styles.legsGrid, isDesktop && styles.legsGridDesktop]}>
            {myTrip.legs.map((leg, i) => {
              const badgeBg =
                leg.status === 'confirmed'
                  ? 'rgba(16,185,129,0.22)'
                  : leg.status === 'need_host'
                  ? 'rgba(243,112,0,0.28)'
                  : 'rgba(14,165,233,0.22)';
              const badgeFg =
                leg.status === 'confirmed'
                  ? '#6EE7B7'
                  : leg.status === 'need_host'
                  ? '#FF9B42'
                  : '#7DD3FC';
              const badgeLabel =
                leg.status === 'confirmed'
                  ? 'Host Confirmed'
                  : leg.status === 'need_host'
                  ? 'Need Host'
                  : 'Meetup Only';

              return (
                <Pressable
                  key={leg.id}
                  onPress={() => {
                    if (leg.status === 'need_host') navigate('explore');
                    else if (leg.hostUsername) {
                      const found = hosts.find((h) => h.username === leg.hostUsername);
                      if (found) openHostProfile(found);
                    } else navigate('trips');
                  }}
                  style={[
                    styles.legCard,
                    leg.status === 'need_host' && { borderColor: 'rgba(243,112,0,0.55)' },
                  ]}
                >
                  <View style={styles.legHeader}>
                    <Text style={styles.legCity}>
                      {i + 1}. {leg.city}
                    </Text>
                    <View style={[styles.legBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.legBadgeText, { color: badgeFg }]}>{badgeLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.legSub}>
                    {leg.dates} · {leg.detail}
                  </Text>
                  <View style={styles.legFooter}>
                    <View style={styles.rowGap4}>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={styles.legCountry}>{leg.country}</Text>
                    </View>
                    <Text style={styles.legCta}>
                      {leg.status === 'need_host'
                        ? 'Browse Hosts →'
                        : leg.status === 'confirmed'
                        ? 'View Host →'
                        : 'See Leg →'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* 2. HOST REQUESTS + 3. EVENTS YOU'RE JOINING */}
      <View style={[styles.twoCol, isDesktop && styles.twoColDesktop]}>
        {/* Host Requests */}
        <Card style={isDesktop ? { flex: 7 } : undefined}>
          <View style={styles.sectionHeader}>
            <View style={styles.rowGap8}>
              <Text style={styles.sectionTitle}>Host Requests</Text>
              {pendingCount > 0 && <Badge label={`${pendingCount} Pending`} tone="brand" />}
            </View>
            <View style={{ width: 175 }}>
              <SegmentedTabs
                options={[
                  { key: 'incoming', label: `Incoming (${incomingReqs.length})` },
                  { key: 'outgoing', label: `Sent (${outgoingReqs.length})` },
                ]}
                value={reqTab}
                onChange={setReqTab}
              />
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            {visibleReqs.map((req) => {
              const lastMsg = req.messages[req.messages.length - 1];
              const statusTone =
                req.status === 'accepted'
                  ? 'green'
                  : req.status === 'tentative'
                  ? 'blue'
                  : req.status === 'declined'
                  ? 'neutral'
                  : 'amber';
              const statusLabel =
                req.status === 'accepted'
                  ? 'Accepted'
                  : req.status === 'tentative'
                  ? 'Tentative'
                  : req.status === 'declined'
                  ? 'Declined'
                  : 'Awaiting Reply';

              return (
                <View key={req.id} style={styles.reqItem}>
                  <View style={styles.reqTop}>
                    <View style={styles.rowGap10}>
                      <Avatar initials={req.otherInitials} color={req.otherColor} size={38} />
                      <View>
                        <Text style={styles.reqName}>
                          {req.otherName} <Text style={styles.reqCity}>· {req.otherCity}</Text>
                        </Text>
                        <View style={styles.rowGap6}>
                          <Calendar size={12} color={colors.muted} />
                          <Text style={styles.reqMeta}>
                            {req.dates} · {req.guests} guest{req.guests === 1 ? '' : 's'}
                            {req.flexible ? ' · Flexible' : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Badge label={statusLabel} tone={statusTone} />
                  </View>

                  <Text style={styles.reqBody} numberOfLines={2}>
                    “{lastMsg?.body}”
                  </Text>

                  <View style={styles.reqActions}>
                    {req.direction === 'incoming' && req.status === 'pending' ? (
                      <>
                        <Button
                          label="Accept"
                          variant="green"
                          size="sm"
                          onPress={() => updateRequestStatus(req.id, 'accepted')}
                        />
                        <Button
                          label="Tentative"
                          variant="outline"
                          size="sm"
                          onPress={() => updateRequestStatus(req.id, 'tentative')}
                        />
                        <Button
                          label="Decline"
                          variant="ghost"
                          size="sm"
                          onPress={() => updateRequestStatus(req.id, 'declined')}
                        />
                      </>
                    ) : (
                      <Button
                        label="Open Thread"
                        variant="ink"
                        size="sm"
                        onPress={() => {
                          setSelectedConversationId(req.id);
                          navigate('messages');
                        }}
                      />
                    )}
                    <Text style={styles.refsText}>{req.positiveRefs} positive refs</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Events You're Joining */}
        <Card style={isDesktop ? { flex: 5 } : undefined}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Events You’re Joining</Text>
            <Pressable onPress={() => navigate('activities')}>
              <Text style={styles.linkText}>All events →</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            {(joinedEvents.length > 0 ? joinedEvents : activities.slice(0, 2)).map((ev) => (
              <View key={ev.id} style={styles.eventItem}>
                <View style={styles.eventRow}>
                  <View style={[styles.dateBox, { backgroundColor: ev.accent }]}>
                    <Text style={styles.dateMonth}>{ev.month}</Text>
                    <Text style={styles.dateDay}>{ev.day}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <View style={styles.rowGap4}>
                      <Clock size={12} color={colors.muted} />
                      <Text style={styles.eventMeta}>
                        {ev.timeLabel} · {ev.city}
                      </Text>
                    </View>
                  </View>
                  <Badge label={ev.isGoing ? 'Going' : 'Open'} tone={ev.isGoing ? 'green' : 'neutral'} />
                </View>

                <View style={styles.eventFooter}>
                  <Text style={styles.eventGoingText}>{ev.goingCount} members going</Text>
                  <Pressable onPress={() => toggleRsvp(ev.id)}>
                    <Text style={styles.linkText}>{ev.isGoing ? 'Leave' : 'Join Event'}</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable onPress={() => navigate('activities')} style={styles.addEventRow}>
              <Plus size={14} color={colors.brand} />
              <Text style={styles.addEventText}>Discover more meetups near Berlin</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 18,
    paddingBottom: 28,
  },
  scrollDesktop: {
    padding: 28,
    maxWidth: 1220,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  pageSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 240,
  },
  searchPillText: {
    fontSize: 13,
    color: colors.muted,
  },
  tripHero: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: 20,
    gap: 16,
  },
  tripHeroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tripHeroLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  countdownPill: {
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  countdownText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tripHeroTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  tripHeroMeta: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  legsGrid: {
    gap: 10,
  },
  legsGridDesktop: {
    flexDirection: 'row',
  },
  legCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.md,
    padding: 14,
    gap: 8,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  legCity: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  legBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  legBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legSub: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  legFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  legCountry: {
    color: '#94A3B8',
    fontSize: 11,
  },
  legCta: {
    color: '#FF9B42',
    fontSize: 11,
    fontWeight: '700',
  },
  twoCol: {
    gap: 18,
  },
  twoColDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  rowGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowGap6: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rowGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowGap10: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  reqItem: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  reqTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  reqName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  reqCity: {
    fontWeight: '400',
    color: colors.muted,
  },
  reqMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  reqBody: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 19,
  },
  reqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  refsText: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  eventItem: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  dateDay: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 17,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  eventMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  eventGoingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  addEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  addEventText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
});

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Badge, Button, Card, SegmentedTabs } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function TripsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { trips, navigate } = useApp();
  const [tab, setTab] = useState<'mine' | 'nearby'>('mine');

  const list = trips.filter((t) => (tab === 'mine' ? t.isMine : !t.isMine));

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Public Trips</Text>
          <Text style={styles.sub}>
            Share your multi-city itinerary so hosts can invite you, or host travelers visiting Berlin.
          </Text>
        </View>
        <View style={{ width: 220 }}>
          <SegmentedTabs
            options={[
              { key: 'mine', label: 'My Trips' },
              { key: 'nearby', label: 'Visiting Berlin' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
      </View>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        <View style={[{ gap: 14 }, isDesktop && { flex: 7 }]}>
          {list.map((trip) => (
            <Card key={trip.id} style={{ gap: 14 }}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <Text style={styles.tripMeta}>
                    {trip.dateRange} · {trip.travellers} traveler
                    {trip.travellers === 1 ? '' : 's'}
                    {trip.travelerName ? ` · by ${trip.travelerName}` : ''}
                  </Text>
                </View>
                <Badge label={`In ${trip.startsInDays} days`} tone="brand" />
              </View>

              <View style={styles.timeline}>
                {trip.legs.map((leg) => {
                  const tone =
                    leg.status === 'confirmed'
                      ? 'green'
                      : leg.status === 'need_host'
                      ? 'brand'
                      : 'blue';
                  const lbl =
                    leg.status === 'confirmed'
                      ? 'Host Confirmed'
                      : leg.status === 'need_host'
                      ? 'Need Host'
                      : 'Meetup Only';
                  return (
                    <View key={leg.id} style={styles.legRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legCity}>
                          {leg.city}, {leg.country}
                        </Text>
                        <Text style={styles.legSub}>
                          {leg.dates} · {leg.detail}
                        </Text>
                      </View>
                      <Badge label={lbl} tone={tone} />
                    </View>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label={trip.isMine ? 'Find Hosts Along Route' : 'Offer to Host'}
                  variant={trip.isMine ? 'brand' : 'green'}
                  size="sm"
                  onPress={() => navigate(trip.isMine ? 'explore' : 'messages')}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Visual Route Map */}
        <Card style={[{ gap: 12 }, isDesktop && { flex: 5 }]}>
          <Text style={styles.tripTitle}>Route Overview</Text>
          <View style={styles.mapBox}>
            <Svg viewBox="0 0 320 210" width="100%" height={210}>
              <Rect width="320" height="210" fill="#ECEAE4" />
              <Path
                d="M85 45 Q135 100 145 125 T245 165"
                stroke="#F37000"
                strokeWidth="3"
                strokeDasharray="6 4"
                fill="none"
              />
              <Circle cx="85" cy="45" r="8" fill="#10B981" stroke="#fff" strokeWidth="2.5" />
              <SvgText x="100" y="49" fontSize="11" fontWeight="700" fill="#0F172A">
                Berlin
              </SvgText>
              <Circle cx="145" cy="125" r="8" fill="#F37000" stroke="#fff" strokeWidth="2.5" />
              <SvgText x="160" y="129" fontSize="11" fontWeight="700" fill="#0F172A">
                Munich
              </SvgText>
              <Circle cx="245" cy="165" r="8" fill="#0EA5E9" stroke="#fff" strokeWidth="2.5" />
              <SvgText x="195" y="190" fontSize="11" fontWeight="700" fill="#0F172A">
                Vienna
              </SvgText>
            </Svg>
          </View>
          <View style={styles.inviteBanner}>
            <Text style={styles.inviteText}>4 travelers visiting Berlin this week</Text>
            <Button label="View" variant="brand" size="sm" onPress={() => setTab('nearby')} />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  tripMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  timeline: {
    borderLeftWidth: 2,
    borderLeftColor: colors.brand,
    paddingLeft: 14,
    gap: 10,
  },
  legRow: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legCity: { fontSize: 13, fontWeight: '700', color: colors.ink },
  legSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  mapBox: { borderRadius: radii.md, overflow: 'hidden' },
  inviteBanner: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inviteText: { color: colors.white, fontSize: 12, fontWeight: '700', flex: 1 },
});

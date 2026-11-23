import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Clock, MapPin, Users } from 'lucide-react-native';
import { Badge, Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function ActivitiesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { activities, toggleRsvp } = useApp();

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Events &amp; Meetups</Text>
          <Text style={styles.sub}>Join local BeWelcome gatherings in Berlin and along your trip.</Text>
        </View>
      </View>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {activities.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
              No upcoming events
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', maxWidth: 360 }}>
              There are no upcoming gatherings nearby. Check back soon or organize a community meetup!
            </Text>
          </Card>
        ) : (
          activities.map((ev) => (
            <Card key={ev.id} style={[styles.card, isDesktop && { flex: 1 }]}>
            <View style={[styles.banner, { backgroundColor: ev.accent }]}>
              <View style={styles.datePill}>
                <Text style={styles.dateMonth}>{ev.month}</Text>
                <Text style={styles.dateDay}>{ev.day}</Text>
              </View>
              {ev.isGoing && <Badge label="Going ✓" tone="green" />}
            </View>

            <View style={styles.body}>
              <Text style={styles.evTitle}>{ev.title}</Text>
              <Text style={styles.evDesc}>{ev.description}</Text>

              <View style={styles.metaList}>
                <View style={styles.metaRow}>
                  <Clock size={13} color={colors.muted} />
                  <Text style={styles.metaText}>{ev.timeLabel}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color={colors.muted} />
                  <Text style={styles.metaText}>{ev.city}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.metaRow}>
                  <Users size={13} color={colors.muted} />
                  <Text style={styles.goingText}>{ev.goingCount} going</Text>
                </View>
                <Button
                  label={ev.isGoing ? 'Going' : 'Join Event'}
                  variant={ev.isGoing ? 'green' : 'ink'}
                  size="sm"
                  onPress={() => toggleRsvp(ev.id)}
                />
              </View>
            </View>
          </Card>
        ))
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  card: { padding: 0, overflow: 'hidden' },
  banner: {
    height: 92,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  datePill: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateMonth: { fontSize: 9, fontWeight: '800', color: colors.brand },
  dateDay: { fontSize: 15, fontWeight: '800', color: colors.ink, lineHeight: 17 },
  body: { padding: 16, gap: 10, flex: 1, justifyContent: 'space-between' },
  evTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  evDesc: { fontSize: 12, color: colors.inkSecondary, lineHeight: 18 },
  metaList: { gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.muted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  goingText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
});

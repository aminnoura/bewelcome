import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { Avatar, Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';
import { HostingStatus } from '../types/models';

export function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { me, setHostingStatus, setMaxGuests, togglePush, logout, backendOnline } = useApp();

  const statuses: { key: HostingStatus; title: string; sub: string; dot: string }[] = [
    { key: 'yes', title: 'Yes, I can host', sub: 'Visible in host search', dot: colors.green },
    { key: 'maybe', title: 'Maybe', sub: 'Depends on dates', dot: colors.amber },
    { key: 'no', title: 'Not right now', sub: 'Meetups only', dot: colors.subtle },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <View>
        <Text style={styles.title}>Hosting &amp; Preferences</Text>
        <Text style={styles.sub}>Control your hosting status, alerts, and account settings.</Text>
      </View>

      <Card style={styles.profileCard}>
        <Avatar initials={me.initials} color={colors.brand} size={52} uri={me.avatarUrl} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me.name}</Text>
          <Text style={styles.sub}>
            @{me.username} · {me.city}, {me.country}
          </Text>
        </View>
        <Button label="Log Out" variant="outline" size="sm" onPress={logout} />
      </Card>

      {/* 3-State Hosting Availability */}
      <Card style={{ gap: 12 }}>
        <Text style={styles.sectionTitle}>Hosting Availability</Text>
        <View style={styles.statusGrid}>
          {statuses.map((s) => {
            const active = me.accommodation === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setHostingStatus(s.key)}
                style={[styles.statusCard, active && styles.statusCardActive]}
              >
                <View style={[styles.dot, { backgroundColor: s.dot }]} />
                <Text style={styles.statusTitle}>{s.title}</Text>
                <Text style={styles.statusSub}>{s.sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>Max Guests</Text>
            <Text style={styles.prefSub}>Maximum travelers you can host at once</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable onPress={() => setMaxGuests(me.maxGuests - 1)} style={styles.stepBtn}>
              <Text style={styles.stepTxt}>−</Text>
            </Pressable>
            <Text style={styles.stepVal}>{me.maxGuests}</Text>
            <Pressable onPress={() => setMaxGuests(me.maxGuests + 1)} style={styles.stepBtn}>
              <Text style={styles.stepTxt}>+</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* Notifications & Language */}
      <Card style={{ gap: 14 }}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Push Notifications</Text>
            <Text style={styles.prefSub}>Instant alerts for hosting requests &amp; events</Text>
          </View>
          <Switch
            value={me.pushEnabled}
            onValueChange={togglePush}
            trackColor={{ true: colors.brand, false: '#CBD5E1' }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>Interface Language</Text>
            <Text style={styles.prefSub}>305+ community-translated languages</Text>
          </View>
          <Text style={styles.valuePill}>{me.language}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>Local Backend Status</Text>
            <Text style={styles.prefSub}>Connected to unmodified Symfony rox API</Text>
          </View>
          <Text
            style={[
              styles.valuePill,
              backendOnline ? { backgroundColor: colors.greenSoft, color: colors.greenText } : {},
            ]}
          >
            {backendOnline === null ? 'Checking...' : backendOnline ? 'Connected' : 'Offline Mode'}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 820, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  statusGrid: { flexDirection: 'row', gap: 10 },
  statusCard: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: 12,
    alignItems: 'center',
    gap: 5,
  },
  statusCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  statusSub: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  prefTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  prefSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 16, fontWeight: '700', color: colors.ink },
  stepVal: { fontSize: 14, fontWeight: '800', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  valuePill: {
    backgroundColor: colors.surfaceAlt,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeft, BedDouble, MapPin, ShieldCheck } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, SegmentedTabs } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function MemberProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { selectedHost: m, navigate, openRequestForHost } = useApp();
  const [tab, setTab] = useState<'about' | 'home' | 'refs'>('about');

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <Pressable onPress={() => navigate('explore')} style={styles.backRow}>
        <ArrowLeft size={16} color={colors.ink} />
        <Text style={styles.backText}>Back to Hosts</Text>
      </Pressable>

      {/* Profile Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Avatar initials={m.initials} color={m.avatarColor} size={62} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{m.name}</Text>
              <Badge
                label={
                  m.accommodation === 'yes'
                    ? `Accepting Guests · Max ${m.maxGuests}`
                    : 'Maybe Hosting'
                }
                tone={m.accommodation === 'yes' ? 'green' : 'amber'}
              />
            </View>
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.muted} />
              <Text style={styles.metaText}>
                {m.area} · {m.city}, {m.country} · Member since {m.memberSince}
              </Text>
            </View>
            <View style={styles.langRow}>
              {m.languages.map((lang) => (
                <Badge key={lang} label={lang} tone="neutral" />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Button
            label="Request to Stay"
            variant="brand"
            onPress={() => openRequestForHost(m)}
            style={{ flex: 1 }}
          />
          <Button
            label="Send Message"
            variant="outline"
            onPress={() => navigate('messages')}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {!isDesktop && (
        <SegmentedTabs
          options={[
            { key: 'about', label: 'About' },
            { key: 'home', label: 'My Home' },
            { key: 'refs', label: `Refs (${m.positiveComments})` },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
        {(isDesktop || tab === 'about' || tab === 'home') && (
          <View style={[{ gap: 14 }, isDesktop && { flex: 1 }]}>
            {(isDesktop || tab === 'about') && (
              <Card style={{ gap: 8 }}>
                <Text style={styles.kicker}>ABOUT {m.name.split(' ')[0].toUpperCase()}</Text>
                <Text style={styles.paragraph}>{m.aboutMe}</Text>
              </Card>
            )}

            {(isDesktop || tab === 'home') && (
              <Card style={{ gap: 12 }}>
                <Text style={styles.kicker}>MY HOME &amp; SLEEPING</Text>
                <View style={styles.homeGrid}>
                  <View style={styles.homeBox}>
                    <BedDouble size={16} color={colors.brand} />
                    <Text style={styles.homeLbl}>Sleeping</Text>
                    <Text style={styles.homeVal}>{m.sleeping}</Text>
                  </View>
                  <View style={styles.homeBox}>
                    <ShieldCheck size={16} color={colors.green} />
                    <Text style={styles.homeLbl}>Max Stay</Text>
                    <Text style={styles.homeVal}>{m.maxStay}</Text>
                  </View>
                </View>
                <Text style={styles.rulesText}>{m.houseRules}</Text>
              </Card>
            )}
          </View>
        )}

        {(isDesktop || tab === 'refs') && (
          <Card style={[{ gap: 12 }, isDesktop && { flex: 1 }]}>
            <View style={styles.refsHeader}>
              <Text style={styles.kicker}>TRUST REFERENCES ({m.positiveComments})</Text>
              <Badge label="100% Positive" tone="green" />
            </View>
            {m.comments.length === 0 ? (
              <Text style={styles.paragraph}>No written references yet.</Text>
            ) : (
              m.comments.map((c) => (
                <View key={c.id} style={styles.refCard}>
                  <View style={styles.refTop}>
                    <View style={styles.refAuthorRow}>
                      <Avatar initials={c.fromInitials} color={c.fromColor} size={28} />
                      <Text style={styles.refAuthor}>
                        {c.fromName} · <Text style={{ fontWeight: '400' }}>{c.relation}</Text>
                      </Text>
                    </View>
                    <Text style={styles.refPositive}>POSITIVE</Text>
                  </View>
                  <Text style={styles.paragraph}>“{c.text}”</Text>
                  <Text style={styles.refDate}>{c.date}</Text>
                </View>
              ))
            )}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  headerCard: { gap: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: colors.muted },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  body: { gap: 14 },
  bodyDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.muted },
  paragraph: { fontSize: 13, color: colors.inkSecondary, lineHeight: 20 },
  homeGrid: { flexDirection: 'row', gap: 10 },
  homeBox: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
  },
  homeLbl: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  homeVal: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  rulesText: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  refsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refCard: { backgroundColor: colors.canvas, borderRadius: radii.md, padding: 13, gap: 6 },
  refTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refAuthor: { fontSize: 12, fontWeight: '700', color: colors.ink },
  refPositive: { fontSize: 10, fontWeight: '800', color: colors.greenText },
  refDate: { fontSize: 11, color: colors.subtle },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { Badge, Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors } from '../theme/tokens';

export function CommunityScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { threads, groups, toggleGroup } = useApp();

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <View>
        <Text style={styles.title}>Community Forums &amp; Groups</Text>
        <Text style={styles.sub}>Local recommendations, travel tips, and BeWelcome groups.</Text>
      </View>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {/* Discussions */}
        <View style={[{ gap: 12 }, isDesktop && { flex: 8 }]}>
          {threads.length === 0 ? (
            <Card style={{ padding: 32, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
                No discussions yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
                Join groups to follow community discussions and travel recommendations.
              </Text>
            </Card>
          ) : (
            threads.map((t) => (
              <Card key={t.id} style={{ gap: 8 }}>
              <View style={styles.rowBetween}>
                <Badge label={t.groupName} tone="brand" />
                <Text style={styles.meta}>
                  {t.language} · {t.timeAgo}
                </Text>
              </View>
              <Text style={styles.threadTitle}>{t.title}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.meta}>
                  Started by <Text style={{ fontWeight: '700', color: colors.ink }}>{t.author}</Text>
                </Text>
                <View style={styles.replyRow}>
                  <MessageSquare size={13} color={colors.muted} />
                  <Text style={styles.meta}>{t.replies} replies</Text>
                </View>
              </View>
            </Card>
          ))
        )}
        </View>

        {/* Groups Sidebar */}
        <Card style={[{ gap: 12 }, isDesktop && { flex: 4 }]}>
          <Text style={styles.sectionTitle}>Local &amp; Interest Groups</Text>
          {groups.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted, paddingVertical: 12 }}>
              No joined groups yet.
            </Text>
          ) : (
            groups.map((g) => (
            <View key={g.id} style={styles.groupRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.meta}>{g.members}</Text>
              </View>
              <Button
                label={g.joined ? 'Joined' : 'Join'}
                variant={g.joined ? 'outline' : 'ink'}
                size="sm"
                onPress={() => toggleGroup(g.id)}
              />
            </View>
          ))
        )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: colors.muted },
  threadTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  groupName: { fontSize: 13, fontWeight: '700', color: colors.ink },
});

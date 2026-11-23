import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { MapPin, Search } from 'lucide-react-native';
import { Avatar, Badge, Button, Card } from '../components/UI';
import { searchLocationsLive, searchMembersLive } from '../api/bewelcomeApi';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';
import { HostingStatus, LocationSuggestion } from '../types/models';

export function ExploreHostsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { hosts, openHostProfile, openHostProfileByUsername, openRequestForHost } = useApp();

  const [query, setQuery] = useState('');
  const [filterAcc, setFilterAcc] = useState<'all' | HostingStatus>('all');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [liveMembers, setLiveMembers] = useState<string[]>([]);
  const [focusedHostId, setFocusedHostId] = useState<number>(hosts[0]?.id ?? 1);

  useEffect(() => {
    let active = true;
    if (query.trim().length >= 2) {
      searchLocationsLive(query).then((res) => {
        if (active) setSuggestions(res.slice(0, 4));
      });
      searchMembersLive(query).then((res) => {
        if (active) setLiveMembers(res.slice(0, 5));
      });
    } else {
      setSuggestions([]);
      setLiveMembers([]);
    }
    return () => {
      active = false;
    };
  }, [query]);

  const filteredHosts = hosts.filter((h) => {
    if (filterAcc !== 'all' && h.accommodation !== filterAcc) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.country.toLowerCase().includes(q) ||
      h.aboutMe.toLowerCase().includes(q)
    );
  });

  const focusedHost = hosts.find((h) => h.id === focusedHostId) || filteredHosts[0] || hosts[0];

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      {/* Search + Filters */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or host (try Berlin, Munich, London)..."
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'All Hosts' },
              { key: 'yes', label: 'Accepting Guests' },
              { key: 'maybe', label: 'Maybe' },
            ] as const
          ).map((f) => {
            const active = filterAcc === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilterAcc(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Live Manticore Suggestions & Authenticated Server Members */}
      {(suggestions.length > 0 || liveMembers.length > 0) && (
        <View style={styles.suggestRow}>
          {suggestions.map((s) => (
            <Pressable
              key={`loc-${s.id}`}
              onPress={() => {
                setQuery(s.name.split(',')[0]);
                setSuggestions([]);
              }}
              style={styles.suggestChip}
            >
              <MapPin size={12} color={colors.brand} />
              <Text style={styles.suggestText}>{s.name}</Text>
            </Pressable>
          ))}
          {liveMembers.map((u) => (
            <Pressable
              key={`mem-${u}`}
              onPress={() => openHostProfileByUsername(u)}
              style={[styles.suggestChip, { backgroundColor: colors.greenSoft }]}
            >
              <Text style={[styles.suggestText, { color: colors.greenText }]}>@{u}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Split Layout on Desktop, Stacked on Mobile */}
      <View style={[styles.split, isDesktop && styles.splitDesktop]}>
        {/* Host Cards */}
        <View style={[styles.listCol, isDesktop && { flex: 1 }]}>
          <Text style={styles.countLabel}>
            {filteredHosts.length} welcoming host{filteredHosts.length === 1 ? '' : 's'} found
          </Text>

          {filteredHosts.length === 0 ? (
            <Card style={{ padding: 28, alignItems: 'center', gap: 10 }}>
              <Search size={24} color={colors.muted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>
                Find Members &amp; Hosts
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
                Search for any BeWelcome member by username or find hosts by typing a city name above.
              </Text>
            </Card>
          ) : (
            filteredHosts.map((h) => {
              const selected = h.id === focusedHost?.id;
              return (
                <Pressable key={h.id} onPress={() => setFocusedHostId(h.id)}>
                  <Card style={selected ? [styles.hostCard, styles.hostCardSelected] : styles.hostCard}>
                    <View style={styles.hostTop}>
                      <View style={styles.rowGap10}>
                        <Avatar initials={h.initials} color={h.avatarColor} size={42} uri={h.avatarUrl} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hostName}>
                            {h.name} <Text style={styles.hostArea}>· {h.city}</Text>
                          </Text>
                          <Text style={styles.hostMeta}>
                            {h.positiveComments} positive refs · {h.languages.slice(0, 2).join(', ')}
                          </Text>
                        </View>
                      </View>
                      <Badge
                        label={h.accommodation === 'yes' ? 'Yes' : 'Maybe'}
                        tone={h.accommodation === 'yes' ? 'green' : 'amber'}
                      />
                    </View>

                    <Text style={styles.hostBio} numberOfLines={2}>
                      {h.aboutMe}
                    </Text>

                    <View style={styles.hostActions}>
                      <Button
                        label="View Profile"
                        variant="outline"
                        size="sm"
                        onPress={() => openHostProfile(h)}
                      />
                      <Button
                        label="Request to Stay"
                        variant="brand"
                        size="sm"
                        onPress={() => openRequestForHost(h)}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Interactive Visual Map Panel */}
        <View style={[styles.mapWrap, isDesktop && { flex: 1 }]}>
          <Svg viewBox="0 0 420 340" width="100%" height={isDesktop ? 420 : 240}>
            <Rect width="420" height="340" fill="#ECEAE4" />
            <Path d="M-10 115 Q120 75 230 135 T430 105" stroke="#BFDBFE" strokeWidth="18" fill="none" />
            <Path
              d="M50 0 L95 340 M205 0 L185 340 M335 0 L355 340 M0 65 L420 85 M0 205 L420 225"
              stroke="#FFFFFF"
              strokeWidth="5"
            />
            <Rect x="245" y="150" width="84" height="48" rx="12" fill="#D1FAE5" />
            <Rect x="55" y="38" width="60" height="36" rx="10" fill="#D1FAE5" />
            <SvgText x="168" y="128" fill="#64748B" fontSize="11" fontWeight="700">
              EUROPE MAP
            </SvgText>

            {hosts.map((h, idx) => {
              const positions = [
                { x: 115, y: 92 },
                { x: 255, y: 112 },
                { x: 195, y: 215 },
                { x: 325, y: 185 },
              ];
              const pos = positions[idx % positions.length];
              const isSel = h.id === focusedHost?.id;
              return (
                <React.Fragment key={h.id}>
                  <Rect
                    x={pos.x - 32}
                    y={pos.y - 15}
                    width="64"
                    height="30"
                    rx="15"
                    fill={isSel ? colors.ink : h.accommodation === 'yes' ? colors.green : colors.amber}
                    stroke={isSel ? colors.brand : '#FFFFFF'}
                    strokeWidth="2.5"
                    onPress={() => setFocusedHostId(h.id)}
                  />
                  <SvgText
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10.5"
                    fontWeight="700"
                    onPress={() => setFocusedHostId(h.id)}
                  >
                    {h.name.split(' ')[0]}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {focusedHost && (
            <View style={styles.mapPreview}>
              <View style={styles.rowGap10}>
                <Avatar initials={focusedHost.initials} color={focusedHost.avatarColor} size={38} uri={focusedHost.avatarUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostName}>
                    {focusedHost.name} · {focusedHost.city}
                  </Text>
                  <Text style={styles.mapPreviewSub}>
                    {focusedHost.sleeping} · {focusedHost.positiveComments} positive refs
                  </Text>
                </View>
                <Button
                  label="Profile"
                  variant="ink"
                  size="sm"
                  onPress={() => openHostProfile(focusedHost)}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  scrollDesktop: {
    padding: 28,
    maxWidth: 1220,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  suggestText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandSoftText,
  },
  split: {
    gap: 16,
  },
  splitDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listCol: {
    gap: 12,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  hostCard: {
    gap: 10,
  },
  hostCardSelected: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  hostTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowGap10: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  hostArea: {
    fontWeight: '400',
    color: colors.muted,
  },
  hostMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  hostBio: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 19,
  },
  hostActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  mapWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ECEAE4',
  },
  mapPreview: {
    backgroundColor: colors.surface,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapPreviewSub: {
    fontSize: 11,
    color: colors.greenText,
    fontWeight: '600',
    marginTop: 2,
  },
});

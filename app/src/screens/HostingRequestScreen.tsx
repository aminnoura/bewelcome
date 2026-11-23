import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, BedDouble, Calendar, ShieldCheck } from 'lucide-react-native';
import { Avatar, Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function HostingRequestScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { selectedHost: host, navigate, createHostingRequest } = useApp();

  const [arrival, setArrival] = useState('May 14');
  const [departure, setDeparture] = useState('May 17');
  const [guests, setGuests] = useState(1);
  const [flexible, setFlexible] = useState(true);
  const [message, setMessage] = useState(
    `Hi ${host.name.split(' ')[0]}! I'm passing through ${host.city} on my spring trip and would love to stay a couple nights and cook dinner together if you're free.`
  );

  const handleSend = () => {
    if (!message.trim()) return;
    createHostingRequest({ host, arrival, departure, guests, flexible, message });
  };

  return (
    <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
      <Pressable onPress={() => navigate('profile')} style={styles.backRow}>
        <ArrowLeft size={16} color={colors.ink} />
        <Text style={styles.backText}>Back to {host.name}</Text>
      </Pressable>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {/* Request Form */}
        <Card style={[{ gap: 16 }, isDesktop && { flex: 7 }]}>
          <View>
            <Text style={styles.title}>Request to stay with {host.name.split(' ')[0]}</Text>
            <Text style={styles.sub}>
              Mention shared interests and your arrival plans for the best chance of acceptance.
            </Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>ARRIVAL</Text>
              <View style={styles.inputRow}>
                <Calendar size={14} color={colors.brand} />
                <TextInput value={arrival} onChangeText={setArrival} style={styles.inputBare} />
              </View>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.label}>DEPARTURE</Text>
              <View style={styles.inputRow}>
                <Calendar size={14} color={colors.brand} />
                <TextInput value={departure} onChangeText={setDeparture} style={styles.inputBare} />
              </View>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Flexible dates (±1–2 days)</Text>
              <Text style={styles.rowSub}>Lets your host suggest nearby dates if busy</Text>
            </View>
            <Switch
              value={flexible}
              onValueChange={setFlexible}
              trackColor={{ true: colors.brand, false: '#CBD5E1' }}
            />
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.rowTitle}>Number of travelers</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setGuests((g) => Math.max(1, g - 1))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepTxt}>−</Text>
              </Pressable>
              <Text style={styles.stepVal}>{guests}</Text>
              <Pressable
                onPress={() => setGuests((g) => Math.min(host.maxGuests || 4, g + 1))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepTxt}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>PERSONAL MESSAGE</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              style={styles.textarea}
            />
          </View>

          <Button label="Send Hosting Request" variant="brand" onPress={handleSend} />
        </Card>

        {/* Host Rules Reminder */}
        <Card style={[{ gap: 14 }, isDesktop && { flex: 5 }]}>
          <View style={styles.hostRow}>
            <Avatar initials={host.initials} color={host.avatarColor} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{host.name}</Text>
              <Text style={styles.rowSub}>
                {host.city}, {host.country} · Max {host.maxGuests} guests
              </Text>
            </View>
          </View>

          <View style={styles.ruleBox}>
            <View style={styles.ruleLine}>
              <BedDouble size={15} color={colors.brand} />
              <Text style={styles.ruleTxt}>{host.sleeping}</Text>
            </View>
            <View style={styles.ruleLine}>
              <ShieldCheck size={15} color={colors.green} />
              <Text style={styles.ruleTxt}>{host.houseRules}</Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14, paddingBottom: 28 },
  scrollDesktop: { padding: 28, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, gap: 6 },
  label: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputBare: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 13,
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 16, fontWeight: '700', color: colors.ink },
  stepVal: { fontSize: 14, fontWeight: '800', color: colors.ink },
  textarea: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleBox: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 14,
    gap: 10,
  },
  ruleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleTxt: { fontSize: 12, color: colors.inkSecondary, flex: 1, lineHeight: 18 },
});

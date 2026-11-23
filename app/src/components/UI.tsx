import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/tokens';

export function Avatar({
  initials,
  color = colors.brand,
  size = 40,
}: {
  initials: string;
  color?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: Math.round(size * 0.34) }}>
        {initials}
      </Text>
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'brand' | 'green' | 'amber' | 'blue' | 'neutral' | 'dark';
}) {
  const map = {
    brand: { bg: colors.brandSoft, fg: colors.brandSoftText },
    green: { bg: colors.greenSoft, fg: colors.greenText },
    amber: { bg: colors.amberSoft, fg: colors.amberText },
    blue: { bg: colors.blueSoft, fg: colors.blueText },
    neutral: { bg: colors.surfaceAlt, fg: colors.inkSecondary },
    dark: { bg: colors.ink, fg: colors.white },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'brand',
  size = 'md',
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'brand' | 'ink' | 'green' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}) {
  const palette = {
    brand: { bg: colors.brand, fg: colors.white, border: colors.brand },
    ink: { bg: colors.ink, fg: colors.white, border: colors.ink },
    green: { bg: colors.greenDark, fg: colors.white, border: colors.greenDark },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.borderStrong },
    ghost: { bg: colors.surfaceAlt, fg: colors.inkSecondary, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: size === 'sm' ? 8 : 11,
          paddingHorizontal: size === 'sm' ? 13 : 16,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: palette.fg, fontSize: size === 'sm' ? 12 : 13, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, active && styles.segItemActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  btn: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  segItemActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  segText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  segTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
});

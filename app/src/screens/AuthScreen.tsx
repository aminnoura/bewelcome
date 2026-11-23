import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight, Eye, EyeOff, Globe, ShieldCheck } from 'lucide-react-native';
import {
  getApiBaseUrl,
  LOCAL_API_URL,
  PROD_API_URL,
  setApiBaseUrl,
} from '../api/bewelcomeApi';
import { BeWelcomeLogo } from '../components/BeWelcomeLogo';
import { Avatar, SegmentedTabs } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const { login } = useApp();
  const [serverEnv, setServerEnv] = useState<'prod' | 'local'>(
    getApiBaseUrl() === LOCAL_API_URL ? 'local' : 'prod'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServerChange = (env: 'prod' | 'local') => {
    setServerEnv(env);
    setError(null);
    if (env === 'prod') {
      setApiBaseUrl(PROD_API_URL);
    } else {
      setApiBaseUrl(LOCAL_API_URL);
    }
    setUsername('');
    setPassword('');
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Login failed.');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, isDesktop && styles.rootDesktop]}>
      {/* Brand Hero Panel */}
      <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <View style={styles.heroTop}>
          <BeWelcomeLogo color={colors.white} height={isDesktop ? 30 : 24} />
          <View style={styles.langPill}>
            <Globe size={13} color={colors.white} />
            <Text style={styles.langText}>English (305+)</Text>
          </View>
        </View>

        <View style={styles.heroBody}>
          <View style={styles.nonProfitBadge}>
            <Text style={styles.nonProfitText}>100% Non-Profit · Open Source Hospitality</Text>
          </View>
          <Text style={[styles.heroTitle, isDesktop && { fontSize: 38, lineHeight: 44 }]}>
            Stay with locals.{'\n'}
            <Text style={{ color: '#FF8A2B' }}>Travel human.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Plan multi-city trips, exchange hosting requests, and join local meetups with 250,000+
            welcoming members worldwide.
          </Text>

          {isDesktop && (
            <View style={styles.statsRow}>
              {[
                { val: '200+', lbl: 'Countries' },
                { val: '305+', lbl: 'Languages' },
                { val: '$0', lbl: 'Forever Free' },
              ].map((s) => (
                <View key={s.lbl} style={styles.statBox}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.lbl}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isDesktop && (
          <View style={styles.quoteBox}>
            <Avatar initials="LW" color={colors.green} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteText}>
                “Hosted 14 travelers in Berlin this year — every stay turned into a friendship.”
              </Text>
              <Text style={styles.quoteAuthor}>Lukas · Kreuzberg, Berlin</Text>
            </View>
          </View>
        )}
      </View>

      {/* Sign In Card */}
      <View style={[styles.formWrap, isDesktop && styles.formWrapDesktop]}>
        <View style={styles.formInner}>
          <Text style={styles.formTitle}>Sign in</Text>
          <Text style={styles.formSubtitle}>
            Access your upcoming trips, host requests, and joined events.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Username or email</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username or email"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={10}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.muted} />
                ) : (
                  <Eye size={18} color={colors.muted} />
                )}
              </Pressable>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || loading) && { opacity: 0.85 },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Sign In to Server</Text>
                <ArrowRight size={16} color={colors.white} />
              </>
            )}
          </Pressable>

          <View style={styles.serverHint}>
            <SegmentedTabs
              options={[
                { key: 'prod', label: 'bewelcome.org (Live)' },
                { key: 'local', label: 'localhost (Dev)' },
              ]}
              value={serverEnv}
              onChange={handleServerChange}
            />
            <Text style={styles.serverHintSub}>
              {serverEnv === 'prod'
                ? 'Sign in with your real BeWelcome.org account'
                : 'Connect to your local BeWelcome development backend'}
            </Text>
          </View>

          <View style={styles.trustRow}>
            <ShieldCheck size={15} color={colors.green} />
            <Text style={styles.trustText}>Community-verified · Zero ads · Non-profit</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: colors.ink,
  },
  rootDesktop: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  hero: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: colors.ink,
    justifyContent: 'space-between',
    gap: 24,
  },
  heroDesktop: {
    flex: 1,
    padding: 48,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  langText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  heroBody: {
    gap: 14,
  },
  nonProfitBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(243,112,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(243,112,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  nonProfitText: {
    color: '#FF9B42',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 420,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statVal: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  statLbl: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quoteText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  quoteAuthor: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  formWrap: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    justifyContent: 'center',
  },
  formWrapDesktop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 48,
  },
  formInner: {
    maxWidth: 380,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSecondary,
  },
  input: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingLeft: 14,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  trustText: {
    fontSize: 12,
    color: colors.muted,
  },
  errorBox: {
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radii.md,
    padding: 11,
  },
  errorText: {
    color: colors.redText,
    fontSize: 12,
    fontWeight: '600',
  },
  serverHint: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 11,
    gap: 2,
  },
  serverHintTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSecondary,
  },
  serverHintSub: {
    fontSize: 11,
    color: colors.muted,
  },
});

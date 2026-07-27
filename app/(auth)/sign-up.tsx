import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextField } from '@/components/ui';
import { signUp } from '@/services/auth';
import { friendlyAuthError } from '@/services/errors';
import { Role } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function SignUp() {
  const [role, setRole] = useState<Role>('parent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim() || !email || !password) {
      setError('Please fill in every field.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name.trim(), role);
      // Guard redirects to family setup next.
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>First, who are you?</Text>

          <View style={styles.roleRow}>
            <RoleCard
              emoji="👨‍👩‍👧"
              label="Parent"
              hint="Assign chores & approve"
              selected={role === 'parent'}
              onPress={() => setRole('parent')}
            />
            <RoleCard
              emoji="🧒"
              label="Teen"
              hint="Do chores & earn points"
              selected={role === 'child'}
              onPress={() => setRole('child')}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder={role === 'parent' ? 'e.g. Alex (Mom)' : 'e.g. Jordan'}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />
          <Button title="Create account" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" style={styles.link}>
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleCard({
  emoji,
  label,
  hint,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleCard, selected && styles.roleCardSelected]}
    >
      <Text style={styles.roleEmoji}>{emoji}</Text>
      <Text style={[styles.roleLabel, selected && { color: colors.primaryDark }]}>
        {label}
      </Text>
      <Text style={styles.roleHint}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  roleCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleEmoji: { fontSize: 32 },
  roleLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  roleHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});

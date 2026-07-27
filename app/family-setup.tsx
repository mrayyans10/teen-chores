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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  createFamily,
  joinFamilyAsChild,
  joinFamilyAsParent,
} from '@/services/families';
import { signOutUser } from '@/services/auth';
import { colors, spacing } from '@/theme';

export default function FamilySetup() {
  const { profile } = useAuth();
  const isParent = profile?.role === 'parent';
  const [mode, setMode] = useState<'create' | 'join'>(
    isParent ? 'create' : 'join'
  );
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'create') {
        if (!familyName.trim()) throw new Error('Give your family a name.');
        await createFamily(profile.uid, familyName);
      } else {
        if (!code.trim()) throw new Error('Enter the invite code.');
        if (isParent) await joinFamilyAsParent(profile.uid, code);
        else await joinFamilyAsChild(profile.uid, code);
      }
      // Guard redirects to the role's home once familyId is set.
    } catch (e) {
      setError((e as Error).message);
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
          <Text style={styles.title}>
            {isParent ? 'Set up your family' : 'Join your family'}
          </Text>
          <Text style={styles.subtitle}>
            Hi {profile?.displayName}! {isParent
              ? 'Create a family group, then share the invite code with your kids.'
              : 'Ask a parent for the 6-character invite code.'}
          </Text>

          {isParent && (
            <View style={styles.tabs}>
              <Tab label="Create new" active={mode === 'create'} onPress={() => setMode('create')} />
              <Tab label="Join existing" active={mode === 'join'} onPress={() => setMode('join')} />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Card>
            {mode === 'create' ? (
              <TextField
                label="Family name"
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="e.g. The Smith Family"
              />
            ) : (
              <TextField
                label="Invite code"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                placeholder="ABC123"
              />
            )}
            <Button
              title={mode === 'create' ? 'Create family' : 'Join family'}
              onPress={onSubmit}
              loading={loading}
            />
          </Card>

          <Pressable onPress={() => signOutUser()} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  signOut: { alignItems: 'center', marginTop: spacing.xl },
  signOutText: { color: colors.textMuted, fontWeight: '600' },
});

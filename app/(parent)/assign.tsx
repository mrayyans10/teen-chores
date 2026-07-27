import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToChildren } from '@/services/families';
import { assignChore } from '@/services/chores';
import { UserProfile } from '@/types';
import { colors, radius, spacing } from '@/theme';

const DUE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'No deadline', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In a week', days: 7 },
];

export default function AssignChore() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<UserProfile[]>([]);
  const [childUid, setChildUid] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [dueIndex, setDueIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.familyId) return;
    return listenToChildren(profile.familyId, (kids) => {
      setChildren(kids);
      setChildUid((prev) => prev ?? kids[0]?.uid ?? null);
    });
  }, [profile?.familyId]);

  async function onSubmit() {
    setError(null);
    const child = children.find((c) => c.uid === childUid);
    const pts = parseInt(points, 10);
    if (!child) return setError('Pick which kid this is for.');
    if (!title.trim()) return setError('Give the chore a title.');
    if (!Number.isFinite(pts) || pts <= 0) return setError('Points must be a positive number.');

    let dueDate: Date | null = null;
    const opt = DUE_OPTIONS[dueIndex];
    if (opt.days !== null) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + opt.days);
    }

    setLoading(true);
    try {
      await assignChore(profile!.familyId!, profile!.uid, child, {
        title,
        description,
        points: pts,
        dueDate,
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (children.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          No kids have joined your family yet. Share your invite code first.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Assign to</Text>
        <View style={styles.chipRow}>
          {children.map((child) => (
            <Pressable
              key={child.uid}
              onPress={() => setChildUid(child.uid)}
              style={[styles.selChip, childUid === child.uid && styles.selChipActive]}
            >
              <Text style={[styles.selChipText, childUid === child.uid && styles.selChipTextActive]}>
                {child.displayName}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card>
          <TextField
            label="Chore title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Take out the trash"
          />
          <TextField
            label="Details (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Any specific instructions?"
            multiline
            style={styles.multiline}
          />
          <TextField
            label="Points reward"
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
            placeholder="10"
          />

          <Text style={styles.label}>Deadline</Text>
          <View style={styles.chipRow}>
            {DUE_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.label}
                onPress={() => setDueIndex(i)}
                style={[styles.selChip, dueIndex === i && styles.selChipActive]}
              >
                <Text style={[styles.selChipText, dueIndex === i && styles.selChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Button title="Assign chore" onPress={onSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  muted: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  selChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selChipText: { color: colors.text, fontWeight: '600' },
  selChipTextActive: { color: '#fff' },
});

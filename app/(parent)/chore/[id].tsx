import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, StatusChip, TextField } from '@/components/ui';
import { ImageViewer } from '@/components/ImageViewer';
import { approveChore, declineChore, listenToChore } from '@/services/chores';
import { Chore } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function ReviewChore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [chore, setChore] = useState<Chore | null>(null);
  const [note, setNote] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ uri: string; label: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    return listenToChore(id, setChore);
  }, [id]);

  if (!chore) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading chore…</Text>
      </View>
    );
  }

  async function onApprove() {
    setBusy(true);
    setError(null);
    try {
      await approveChore(chore!);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    if (!note.trim()) {
      setError('Add a quick note so they know what to fix.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await declineChore(chore!.id, note);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canReview = chore.status === 'submitted';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{chore.title}</Text>
        <StatusChip status={chore.status} />
      </View>
      <Text style={styles.meta}>
        {chore.assignedToName} · {chore.points} pts
        {chore.submissionCount > 1 ? ` · attempt #${chore.submissionCount}` : ''}
      </Text>
      {chore.description ? <Text style={styles.desc}>{chore.description}</Text> : null}

      {chore.declineNote && chore.status !== 'approved' ? (
        <Card style={{ backgroundColor: colors.dangerLight, borderColor: colors.danger }}>
          <Text style={styles.declineLabel}>Your last note</Text>
          <Text style={styles.declineNote}>{chore.declineNote}</Text>
        </Card>
      ) : null}

      {chore.beforePhotoUrl || chore.afterPhotoUrl ? (
        <>
          <View style={styles.photoRow}>
            <PhotoBox
              label="Before"
              uri={chore.beforePhotoUrl}
              onPress={(uri) => setViewer({ uri, label: 'Before' })}
            />
            <PhotoBox
              label="After"
              uri={chore.afterPhotoUrl}
              onPress={(uri) => setViewer({ uri, label: 'After' })}
            />
          </View>
          <Text style={styles.tapHint}>Tap a photo to zoom in</Text>
        </>
      ) : (
        <Card>
          <Text style={styles.muted}>
            No photos submitted yet. You'll be notified when {chore.assignedToName}{' '}
            sends them.
          </Text>
        </Card>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {canReview && !showDecline && (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Button title="✓ Approve & award points" variant="success" onPress={onApprove} loading={busy} />
          <Button title="✗ Decline" variant="danger" onPress={() => setShowDecline(true)} />
        </View>
      )}

      {canReview && showDecline && (
        <Card style={{ marginTop: spacing.md }}>
          <TextField
            label="What needs fixing?"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. The corners still look dusty"
            multiline
            style={styles.multiline}
          />
          <Button title="Send decline note" variant="danger" onPress={onDecline} loading={busy} />
        </Card>
      )}

      {chore.status === 'approved' && (
        <Card style={{ backgroundColor: colors.successLight, borderColor: colors.success }}>
          <Text style={styles.approvedText}>
            ✓ Approved — {chore.points} points awarded to {chore.assignedToName}.
          </Text>
        </Card>
      )}

      <ImageViewer
        visible={!!viewer}
        uri={viewer?.uri ?? null}
        label={viewer?.label}
        onClose={() => setViewer(null)}
      />
    </ScrollView>
  );
}

function PhotoBox({
  label,
  uri,
  onPress,
}: {
  label: string;
  uri: string | null;
  onPress: (uri: string) => void;
}) {
  return (
    <View style={styles.photoBox}>
      <Text style={styles.photoLabel}>{label}</Text>
      {uri ? (
        <Pressable onPress={() => onPress(uri)}>
          <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={150} />
        </Pressable>
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.muted}>—</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  desc: { fontSize: 15, color: colors.text, marginBottom: spacing.lg, lineHeight: 21 },
  muted: { color: colors.textMuted },
  photoRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md },
  photoBox: { flex: 1 },
  photoLabel: { fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  tapHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  declineLabel: { fontWeight: '700', color: colors.danger, marginBottom: spacing.xs },
  declineNote: { color: colors.text },
  approvedText: { color: colors.success, fontWeight: '700' },
  error: { color: colors.danger, marginTop: spacing.md, fontWeight: '600' },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
});

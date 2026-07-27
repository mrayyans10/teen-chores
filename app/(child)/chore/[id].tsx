import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, StatusChip } from '@/components/ui';
import { ImageViewer } from '@/components/ImageViewer';
import { listenToChore, submitChore } from '@/services/chores';
import { uploadPhoto } from '@/services/storage';
import { Chore } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function ChildChore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [chore, setChore] = useState<Chore | null>(null);
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
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
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const editable = chore.status === 'assigned' || chore.status === 'declined';

  async function pick(setter: (uri: string) => void, fromCamera: boolean) {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera permission is needed to take a photo.');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError('Photo library permission is needed.');
          return;
        }
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
      if (!result.canceled && result.assets[0]) {
        setError(null);
        setter(result.assets[0].uri);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function choosePhoto(setter: (uri: string) => void) {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => pick(setter, true) },
      { text: 'Choose from library', onPress: () => pick(setter, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function onSubmit() {
    if (!beforeUri || !afterUri) {
      setError('Add both a before and an after photo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prefix = `chores/${chore!.id}`;
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadPhoto(beforeUri, prefix),
        uploadPhoto(afterUri, prefix),
      ]);
      await submitChore(chore!.id, beforeUrl, afterUrl);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{chore.title}</Text>
        <StatusChip status={chore.status} />
      </View>
      <Text style={styles.points}>+{chore.points} points</Text>
      {chore.description ? <Text style={styles.desc}>{chore.description}</Text> : null}

      {chore.status === 'declined' && chore.declineNote ? (
        <Card style={{ backgroundColor: colors.dangerLight, borderColor: colors.danger }}>
          <Text style={styles.declineLabel}>Needs another look:</Text>
          <Text style={styles.declineNote}>{chore.declineNote}</Text>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {editable ? (
        <>
          <Text style={styles.instruction}>
            Snap a "before" and an "after" photo so your parent can see the work.
          </Text>
          <View style={styles.photoRow}>
            <PhotoSlot label="Before" uri={beforeUri} onPress={() => choosePhoto(setBeforeUri)} />
            <PhotoSlot label="After" uri={afterUri} onPress={() => choosePhoto(setAfterUri)} />
          </View>
          <Button
            title={chore.status === 'declined' ? 'Resubmit for review' : 'Submit for review'}
            onPress={onSubmit}
            loading={busy}
          />
        </>
      ) : (
        <>
          <View style={styles.photoRow}>
            <PhotoSlot
              label="Before"
              uri={chore.beforePhotoUrl}
              readOnly
              onPress={
                chore.beforePhotoUrl
                  ? () => setViewer({ uri: chore.beforePhotoUrl!, label: 'Before' })
                  : undefined
              }
            />
            <PhotoSlot
              label="After"
              uri={chore.afterPhotoUrl}
              readOnly
              onPress={
                chore.afterPhotoUrl
                  ? () => setViewer({ uri: chore.afterPhotoUrl!, label: 'After' })
                  : undefined
              }
            />
          </View>
          {(chore.beforePhotoUrl || chore.afterPhotoUrl) && (
            <Text style={styles.tapHint}>Tap a photo to zoom in</Text>
          )}
          {chore.status === 'submitted' && (
            <Card style={{ backgroundColor: colors.warningLight, borderColor: colors.warning }}>
              <Text style={styles.pendingText}>⏳ Waiting for a parent to review your photos.</Text>
            </Card>
          )}
          {chore.status === 'approved' && (
            <Card style={{ backgroundColor: colors.successLight, borderColor: colors.success }}>
              <Text style={styles.approvedText}>🎉 Approved! You earned {chore.points} points.</Text>
            </Card>
          )}
        </>
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

function PhotoSlot({
  label,
  uri,
  onPress,
  readOnly,
}: {
  label: string;
  uri: string | null;
  onPress?: () => void;
  readOnly?: boolean;
}) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Pressable onPress={onPress} disabled={!onPress} style={styles.slotPress}>
        {uri ? (
          <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={styles.plus}>{readOnly ? '—' : '＋'}</Text>
            {!readOnly && <Text style={styles.addText}>Add photo</Text>}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  points: { color: colors.points, fontWeight: '800', marginTop: spacing.xs, fontSize: 15 },
  desc: { color: colors.text, marginTop: spacing.md, lineHeight: 21 },
  declineLabel: { fontWeight: '700', color: colors.danger, marginBottom: spacing.xs },
  declineNote: { color: colors.text },
  instruction: { color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.md },
  tapHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  error: { color: colors.danger, marginTop: spacing.md, fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  slot: { flex: 1 },
  slotLabel: { fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  slotPress: { borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  plus: { fontSize: 32, color: colors.primary, fontWeight: '300' },
  addText: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  pendingText: { color: colors.warning, fontWeight: '700' },
  approvedText: { color: colors.success, fontWeight: '700' },
});

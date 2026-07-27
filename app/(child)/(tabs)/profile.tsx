import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, PointsBadge, StatusChip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToRedemptions } from '@/services/rewards';
import { signOutUser } from '@/services/auth';
import { Redemption } from '@/types';
import { colors, spacing } from '@/theme';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const redemptionStatusLabels: Record<string, string> = {
  requested: 'Waiting on parent',
  fulfilled: 'Received',
  denied: 'Denied (refunded)',
};

export default function Profile() {
  const { profile } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  useEffect(() => {
    if (!profile?.familyId) return;
    return listenToRedemptions(profile.familyId, (all) =>
      setRedemptions(all.filter((r) => r.childUid === profile.uid))
    );
  }, [profile?.familyId, profile?.uid]);

  // Rewards the parent has actually handed over.
  const received = useMemo(
    () => redemptions.filter((r) => r.status === 'fulfilled'),
    [redemptions]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.header}>
        <Text style={styles.avatar}>🙂</Text>
        <Text style={styles.name}>{profile?.displayName}</Text>
        <PointsBadge points={profile?.points ?? 0} />
      </Card>

      <Text style={styles.sectionTitle}>🎁 Rewards you've received</Text>
      {received.length === 0 ? (
        <EmptyState
          title="No rewards yet"
          subtitle="Once a parent gives you a reward you redeemed, it'll show up here."
        />
      ) : (
        received.map((r) => (
          <Card key={r.id} style={styles.receivedCard}>
            <View style={styles.rowTop}>
              <Text style={styles.rewardTitle}>{r.rewardTitle}</Text>
              <Text style={styles.receivedTag}>✓ Received</Text>
            </View>
            <Text style={styles.meta}>
              {r.cost} pts{formatDate(r.createdAt) ? ` · ${formatDate(r.createdAt)}` : ''}
            </Text>
          </Card>
        ))
      )}

      <Text style={styles.sectionTitle}>All requests</Text>
      {redemptions.length === 0 ? (
        <EmptyState title="Nothing yet" subtitle="Redeem rewards in the Shop to see them here." />
      ) : (
        redemptions.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowTop}>
              <Text style={styles.rewardTitle}>{r.rewardTitle}</Text>
              <StatusChip status={r.status} />
            </View>
            <Text style={styles.meta}>
              {r.cost} pts · {redemptionStatusLabels[r.status]}
            </Text>
          </Card>
        ))
      )}

      <View style={{ height: spacing.xl }} />
      <Button title="Sign out" variant="danger" onPress={() => signOutUser()} />
      <Text style={styles.signedInAs}>Signed in as {profile?.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', gap: spacing.sm },
  avatar: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  receivedCard: { backgroundColor: colors.successLight, borderColor: colors.success },
  receivedTag: { color: colors.success, fontWeight: '800', fontSize: 13 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  signedInAs: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.md, fontSize: 12 },
});

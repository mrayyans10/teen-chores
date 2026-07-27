import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, StatusChip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToRedemptions, setRedemptionStatus } from '@/services/rewards';
import { Redemption } from '@/types';
import { colors, spacing } from '@/theme';

const redemptionStatusLabels: Record<string, string> = {
  requested: 'Requested',
  fulfilled: 'Given',
  denied: 'Denied (refunded)',
};

export default function Redemptions() {
  const { profile } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.familyId) return;
    return listenToRedemptions(profile.familyId, setRedemptions);
  }, [profile?.familyId]);

  async function act(redemption: Redemption, status: 'fulfilled' | 'denied') {
    setBusyId(redemption.id);
    try {
      await setRedemptionStatus(redemption, status);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      {redemptions.length === 0 ? (
        <EmptyState
          title="No reward requests"
          subtitle="When a kid buys a reward from the shop, it shows up here for you to fulfill."
        />
      ) : (
        redemptions.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowTop}>
              <Text style={styles.title}>{r.rewardTitle}</Text>
              <StatusChip status={r.status} />
            </View>
            <Text style={styles.meta}>
              {r.childName} · {r.cost} pts · {redemptionStatusLabels[r.status]}
            </Text>
            {r.status === 'requested' && (
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Mark as given"
                    variant="success"
                    onPress={() => act(r, 'fulfilled')}
                    loading={busyId === r.id}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Deny & refund"
                    variant="secondary"
                    onPress={() => act(r, 'denied')}
                    loading={busyId === r.id}
                  />
                </View>
              </View>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

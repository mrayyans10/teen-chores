import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, PointsBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToRewards, redeemReward } from '@/services/rewards';
import { Reward } from '@/types';
import { colors, spacing } from '@/theme';

export default function Shop() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.familyId) return;
    return listenToRewards(profile.familyId, setRewards);
  }, [profile?.familyId]);

  const balance = profile?.points ?? 0;
  const available = useMemo(() => rewards.filter((r) => r.active), [rewards]);

  async function onRedeem(reward: Reward) {
    if (!profile) return;
    if (balance < reward.cost) return;
    Alert.alert(
      'Redeem reward?',
      `Spend ${reward.cost} points on "${reward.title}"? Your parent will be notified to fulfill it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setBusyId(reward.id);
            try {
              await redeemReward({ uid: profile.uid, displayName: profile.displayName }, reward);
            } catch (e) {
              Alert.alert('Could not redeem', (e as Error).message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>You have</Text>
        <PointsBadge points={balance} />
      </Card>

      {available.length === 0 ? (
        <EmptyState
          title="The shop is empty"
          subtitle="Ask your parent to add some rewards you can earn."
        />
      ) : (
        available.map((reward) => {
          const affordable = balance >= reward.cost;
          return (
            <Card key={reward.id}>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{reward.title}</Text>
                <Text style={[styles.cost, !affordable && { color: colors.textMuted }]}>
                  {reward.cost} pts
                </Text>
              </View>
              {reward.description ? <Text style={styles.desc}>{reward.description}</Text> : null}
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={affordable ? 'Redeem' : `Need ${reward.cost - balance} more`}
                  onPress={() => onRedeem(reward)}
                  disabled={!affordable}
                  loading={busyId === reward.id}
                />
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  cost: { fontSize: 15, fontWeight: '800', color: colors.points },
  desc: { color: colors.textMuted, marginTop: spacing.xs },
});

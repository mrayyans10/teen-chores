import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EmptyState, PointsBadge, StatusChip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToChildChores } from '@/services/chores';
import { Chore } from '@/types';
import { colors, spacing } from '@/theme';

export default function MyChores() {
  const { profile } = useAuth();
  const router = useRouter();
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;
    return listenToChildChores(profile.uid, setChores);
  }, [profile?.uid]);

  // Sort so actionable chores (declined, then to-do) float to the top.
  const ordered = useMemo(() => {
    const rank: Record<Chore['status'], number> = {
      declined: 0,
      assigned: 1,
      submitted: 2,
      approved: 3,
    };
    return [...chores].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [chores]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Your points</Text>
          <Text style={styles.balanceHint}>Spend them in the Shop tab</Text>
        </View>
        <PointsBadge points={profile?.points ?? 0} />
      </Card>

      {ordered.length === 0 ? (
        <EmptyState
          title="No chores yet"
          subtitle="When a parent assigns you a chore, it'll show up here."
        />
      ) : (
        ordered.map((chore) => (
          <Pressable key={chore.id} onPress={() => router.push(`/(child)/chore/${chore.id}`)}>
            <Card style={chore.status === 'declined' ? styles.declinedCard : undefined}>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{chore.title}</Text>
                <StatusChip status={chore.status} />
              </View>
              <Text style={styles.points}>+{chore.points} pts</Text>
              {chore.status === 'declined' && chore.declineNote ? (
                <Text style={styles.declineNote}>↩ {chore.declineNote}</Text>
              ) : null}
              {chore.status === 'assigned' || chore.status === 'declined' ? (
                <Text style={styles.cta}>
                  {chore.status === 'declined' ? 'Tap to redo & resubmit →' : 'Tap to submit photos →'}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  balanceHint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  declinedCard: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  points: { color: colors.points, fontWeight: '800', marginTop: spacing.xs },
  declineNote: { color: colors.danger, marginTop: spacing.sm, fontWeight: '600' },
  cta: { color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
});

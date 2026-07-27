import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EmptyState, PointsBadge, StatusChip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listenToChildren } from '@/services/families';
import { listenToFamilyChores } from '@/services/chores';
import { Chore, UserProfile } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function Dashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<UserProfile[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    if (!profile?.familyId) return;
    const u1 = listenToChildren(profile.familyId, setChildren);
    const u2 = listenToFamilyChores(profile.familyId, setChores);
    return () => {
      u1();
      u2();
    };
  }, [profile?.familyId]);

  const pending = useMemo(
    () => chores.filter((c) => c.status === 'submitted'),
    [chores]
  );

  const choreCountFor = (uid: string, status: Chore['status']) =>
    chores.filter((c) => c.assignedTo === uid && c.status === status).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
    >
      <Text style={styles.heading}>Your kids</Text>
      {children.length === 0 ? (
        <Card>
          <Text style={styles.muted}>
            No kids have joined yet. Share your invite code from the Family tab.
          </Text>
        </Card>
      ) : (
        <View style={styles.kidRow}>
          {children.map((child) => (
            <Card key={child.uid} style={styles.kidCard}>
              <Text style={styles.kidName}>{child.displayName}</Text>
              <PointsBadge points={child.points ?? 0} />
              <Text style={styles.kidMeta}>
                {choreCountFor(child.uid, 'assigned')} to do ·{' '}
                {choreCountFor(child.uid, 'submitted')} pending
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>Needs your review</Text>
        {pending.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{pending.length}</Text>
          </View>
        )}
      </View>
      {pending.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Nothing waiting for review. 🎉</Text>
        </Card>
      ) : (
        pending.map((chore) => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            onPress={() => router.push(`/(parent)/chore/${chore.id}`)}
          />
        ))
      )}

      <Text style={[styles.heading, { marginTop: spacing.lg }]}>All chores</Text>
      {chores.length === 0 ? (
        <EmptyState
          title="No chores yet"
          subtitle="Tap the + button to assign your first chore."
        />
      ) : (
        chores.map((chore) => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            onPress={() => router.push(`/(parent)/chore/${chore.id}`)}
          />
        ))
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/(parent)/assign')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </ScrollView>
  );
}

function ChoreRow({ chore, onPress }: { chore: Chore; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.rowTop}>
          <Text style={styles.choreTitle}>{chore.title}</Text>
          <StatusChip status={chore.status} />
        </View>
        <Text style={styles.choreMeta}>
          {chore.assignedToName} · {chore.points} pts
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  muted: { color: colors.textMuted },
  kidRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kidCard: { flexGrow: 1, minWidth: '45%', alignItems: 'flex-start', gap: spacing.xs },
  kidName: { fontSize: 16, fontWeight: '700', color: colors.text },
  kidMeta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  countPill: {
    backgroundColor: colors.danger,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginBottom: spacing.md,
  },
  countPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choreTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  choreMeta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' },
});

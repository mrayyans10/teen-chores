import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button, Card, EmptyState, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  createReward,
  deleteReward,
  listenToRewards,
  updateReward,
} from '@/services/rewards';
import { Reward } from '@/types';
import { colors, spacing } from '@/theme';

export default function ManageRewards() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile?.familyId) return;
    return listenToRewards(profile.familyId, setRewards);
  }, [profile?.familyId]);

  async function onAdd() {
    setError(null);
    const c = parseInt(cost, 10);
    if (!title.trim()) return setError('Give the reward a name.');
    if (!Number.isFinite(c) || c <= 0) return setError('Cost must be a positive number.');
    setBusy(true);
    try {
      await createReward(profile!.familyId!, profile!.uid, {
        title,
        description,
        cost: c,
      });
      setTitle('');
      setDescription('');
      setCost('50');
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={styles.intro}>
        Set up the prizes your kids can buy with the points they earn.
      </Text>

      {adding ? (
        <Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TextField label="Reward name" value={title} onChangeText={setTitle} placeholder="e.g. $10 allowance" />
          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Paid out on Sunday"
          />
          <TextField label="Cost (points)" value={cost} onChangeText={setCost} keyboardType="number-pad" />
          <View style={{ gap: spacing.sm }}>
            <Button title="Add reward" onPress={onAdd} loading={busy} />
            <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : (
        <Button title="＋ Add a reward" onPress={() => setAdding(true)} />
      )}

      <View style={{ height: spacing.lg }} />

      {rewards.length === 0 ? (
        <EmptyState title="No rewards yet" subtitle="Add prizes like allowance, screen time, or a treat." />
      ) : (
        rewards.map((reward) => (
          <Card key={reward.id} style={!reward.active ? styles.inactive : undefined}>
            <View style={styles.rowTop}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.cost}>{reward.cost} pts</Text>
            </View>
            {reward.description ? <Text style={styles.desc}>{reward.description}</Text> : null}
            <View style={styles.controls}>
              <View style={styles.activeToggle}>
                <Text style={styles.toggleLabel}>{reward.active ? 'In shop' : 'Hidden'}</Text>
                <Switch
                  value={reward.active}
                  onValueChange={(v) => updateReward(reward.id, { active: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              <Pressable onPress={() => deleteReward(reward.id)} hitSlop={8}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  intro: { color: colors.textMuted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  inactive: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  cost: { fontSize: 15, fontWeight: '800', color: colors.points },
  desc: { color: colors.textMuted, marginTop: spacing.xs },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  activeToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { color: colors.textMuted, fontWeight: '600' },
  delete: { color: colors.danger, fontWeight: '700' },
});

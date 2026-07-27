import { supabase } from '@/supabase/client';
import {
  REDEMPTION_COLS,
  REWARD_COLS,
  liveQuery,
  rowToRedemption,
  rowToReward,
} from '@/supabase/db';
import { Redemption, Reward, UserProfile } from '@/types';

interface NewRewardInput {
  title: string;
  description: string;
  cost: number;
}

export async function createReward(
  familyId: string,
  parentUid: string,
  input: NewRewardInput
): Promise<void> {
  const { error } = await supabase.from('rewards').insert({
    family_id: familyId,
    title: input.title.trim(),
    description: input.description.trim(),
    cost: input.cost,
    created_by: parentUid,
    active: true,
  });
  if (error) throw error;
}

export async function updateReward(
  rewardId: string,
  patch: Partial<Pick<Reward, 'title' | 'description' | 'cost' | 'active'>>
): Promise<void> {
  // These field names are identical in snake_case, so the patch passes through.
  const { error } = await supabase.from('rewards').update(patch).eq('id', rewardId);
  if (error) throw error;
}

export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
  if (error) throw error;
}

export function listenToRewards(
  familyId: string,
  cb: (rewards: Reward[]) => void
): () => void {
  return liveQuery({
    table: 'rewards',
    filter: `family_id=eq.${familyId}`,
    fetch: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select(REWARD_COLS)
        .eq('family_id', familyId)
        .order('cost', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToReward);
    },
    cb,
  });
}

/**
 * Teen redeems a reward. A SECURITY DEFINER function checks the balance,
 * deducts points, and records the request atomically.
 */
export async function redeemReward(
  _child: Pick<UserProfile, 'uid' | 'displayName'>,
  reward: Reward
): Promise<void> {
  const { error } = await supabase.rpc('redeem_reward', { p_reward_id: reward.id });
  if (error) {
    // Surface the friendly message raised by the SQL function when broke.
    throw new Error(error.message || 'Could not redeem this reward.');
  }
}

export function listenToRedemptions(
  familyId: string,
  cb: (redemptions: Redemption[]) => void
): () => void {
  return liveQuery({
    table: 'redemptions',
    filter: `family_id=eq.${familyId}`,
    fetch: async () => {
      const { data, error } = await supabase
        .from('redemptions')
        .select(REDEMPTION_COLS)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToRedemption);
    },
    cb,
  });
}

export async function setRedemptionStatus(
  redemption: Redemption,
  status: 'fulfilled' | 'denied'
): Promise<void> {
  if (status === 'denied') {
    // Refund the points atomically when the parent denies the request.
    const { error } = await supabase.rpc('deny_redemption', {
      p_redemption_id: redemption.id,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('redemptions')
    .update({ status: 'fulfilled' })
    .eq('id', redemption.id);
  if (error) throw error;
}

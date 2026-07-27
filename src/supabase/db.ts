import { supabase } from './client';
import { Chore, Family, Redemption, Reward, UserProfile } from '@/types';

/**
 * Subscribe to a table and keep `cb` fed with fresh query results.
 *
 * This mirrors the ergonomics of Firestore's onSnapshot: it runs `fetch` once
 * immediately, then re-runs it whenever a relevant row changes (via Supabase
 * Realtime). Returns an unsubscribe function.
 */
export function liveQuery<T>(opts: {
  table: string;
  /** Realtime filter, e.g. `family_id=eq.<id>`. */
  filter?: string;
  fetch: () => Promise<T>;
  cb: (data: T) => void;
}): () => void {
  let active = true;
  const run = () => {
    opts
      .fetch()
      .then((data) => {
        if (active) opts.cb(data);
      })
      .catch((err) => console.warn(`liveQuery(${opts.table}) failed`, err));
  };

  run();

  const channel = supabase
    .channel(`rt-${opts.table}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: opts.table, filter: opts.filter },
      run
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// ---- Column selections (snake_case in Postgres) ----

export const PROFILE_COLS =
  'id, email, display_name, role, family_id, points, expo_push_token, created_at';
export const FAMILY_COLS = 'id, name, created_by, invite_code, created_at';
export const CHORE_COLS =
  'id, family_id, title, description, points, assigned_to, assigned_to_name, assigned_by, status, before_photo_url, after_photo_url, decline_note, submission_count, due_date, created_at, submitted_at, reviewed_at';
export const REWARD_COLS =
  'id, family_id, title, description, cost, created_by, active, created_at';
export const REDEMPTION_COLS =
  'id, family_id, reward_id, reward_title, child_uid, child_name, cost, status, created_at';

// ---- Row -> domain mappers ----

export function rowToProfile(r: any): UserProfile {
  return {
    uid: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    familyId: r.family_id,
    points: r.points ?? 0,
    expoPushToken: r.expo_push_token,
    createdAt: r.created_at,
  };
}

export function rowToFamily(r: any): Family {
  return {
    id: r.id,
    name: r.name,
    createdBy: r.created_by,
    inviteCode: r.invite_code,
    createdAt: r.created_at,
  };
}

export function rowToChore(r: any): Chore {
  return {
    id: r.id,
    familyId: r.family_id,
    title: r.title,
    description: r.description ?? '',
    points: r.points,
    assignedTo: r.assigned_to,
    assignedToName: r.assigned_to_name,
    assignedBy: r.assigned_by,
    status: r.status,
    beforePhotoUrl: r.before_photo_url,
    afterPhotoUrl: r.after_photo_url,
    declineNote: r.decline_note,
    submissionCount: r.submission_count ?? 0,
    dueDate: r.due_date,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
  };
}

export function rowToReward(r: any): Reward {
  return {
    id: r.id,
    familyId: r.family_id,
    title: r.title,
    description: r.description ?? '',
    cost: r.cost,
    createdBy: r.created_by,
    active: r.active,
    createdAt: r.created_at,
  };
}

export function rowToRedemption(r: any): Redemption {
  return {
    id: r.id,
    familyId: r.family_id,
    rewardId: r.reward_id,
    rewardTitle: r.reward_title,
    childUid: r.child_uid,
    childName: r.child_name,
    cost: r.cost,
    status: r.status,
    createdAt: r.created_at,
  };
}

import { supabase } from '@/supabase/client';
import { CHORE_COLS, liveQuery, rowToChore } from '@/supabase/db';
import { Chore, UserProfile } from '@/types';

interface NewChoreInput {
  title: string;
  description: string;
  points: number;
  dueDate: Date | null;
}

export async function assignChore(
  familyId: string,
  parentUid: string,
  child: Pick<UserProfile, 'uid' | 'displayName'>,
  input: NewChoreInput
): Promise<void> {
  const { error } = await supabase.from('chores').insert({
    family_id: familyId,
    title: input.title.trim(),
    description: input.description.trim(),
    points: input.points,
    assigned_to: child.uid,
    assigned_to_name: child.displayName,
    assigned_by: parentUid,
    status: 'assigned',
    due_date: input.dueDate ? input.dueDate.toISOString() : null,
  });
  if (error) throw error;
}

/** Teen submits (or resubmits) before/after photos for review. */
export async function submitChore(
  choreId: string,
  beforePhotoUrl: string,
  afterPhotoUrl: string
): Promise<void> {
  // RPC so submission_count increments atomically.
  const { error } = await supabase.rpc('submit_chore', {
    p_chore_id: choreId,
    p_before_url: beforePhotoUrl,
    p_after_url: afterPhotoUrl,
  });
  if (error) throw error;
}

/**
 * Parent approves a submission. Awards points to the child atomically via a
 * SECURITY DEFINER function so the status flip and balance change stay in sync.
 */
export async function approveChore(chore: Chore): Promise<void> {
  const { error } = await supabase.rpc('approve_chore', { p_chore_id: chore.id });
  if (error) throw error;
}

/** Parent declines a submission with a note; teen will resubmit. */
export async function declineChore(choreId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .update({
      status: 'declined',
      decline_note: note.trim(),
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', choreId);
  if (error) throw error;
}

export async function getChore(choreId: string): Promise<Chore | null> {
  const { data, error } = await supabase
    .from('chores')
    .select(CHORE_COLS)
    .eq('id', choreId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToChore(data) : null;
}

export function listenToChore(
  choreId: string,
  cb: (chore: Chore | null) => void
): () => void {
  return liveQuery({
    table: 'chores',
    filter: `id=eq.${choreId}`,
    fetch: () => getChore(choreId),
    cb,
  });
}

/** All chores in a family (parent view), newest first. */
export function listenToFamilyChores(
  familyId: string,
  cb: (chores: Chore[]) => void
): () => void {
  return liveQuery({
    table: 'chores',
    filter: `family_id=eq.${familyId}`,
    fetch: async () => {
      const { data, error } = await supabase
        .from('chores')
        .select(CHORE_COLS)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToChore);
    },
    cb,
  });
}

/** Chores assigned to one teen (child view), newest first. */
export function listenToChildChores(
  childUid: string,
  cb: (chores: Chore[]) => void
): () => void {
  return liveQuery({
    table: 'chores',
    filter: `assigned_to=eq.${childUid}`,
    fetch: async () => {
      const { data, error } = await supabase
        .from('chores')
        .select(CHORE_COLS)
        .eq('assigned_to', childUid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToChore);
    },
    cb,
  });
}

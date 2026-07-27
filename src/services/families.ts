import { supabase } from '@/supabase/client';
import {
  FAMILY_COLS,
  PROFILE_COLS,
  liveQuery,
  rowToFamily,
  rowToProfile,
} from '@/supabase/db';
import { Family, UserProfile } from '@/types';

// Avoid ambiguous chars (0/O, 1/I) in invite codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function linkProfileToFamily(uid: string, familyId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ family_id: familyId })
    .eq('id', uid);
  if (error) throw error;
}

/** Create a family owned by a parent and link the parent's profile to it. */
export async function createFamily(
  parentUid: string,
  name: string
): Promise<Family> {
  // Retry once on the (rare) chance of an invite-code collision.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('families')
      .insert({
        name: name.trim(),
        created_by: parentUid,
        invite_code: generateInviteCode(),
      })
      .select(FAMILY_COLS)
      .single();
    if (!error && data) {
      await linkProfileToFamily(parentUid, data.id);
      return rowToFamily(data);
    }
    lastErr = error;
    if (error?.code !== '23505') break; // not a uniqueness conflict
  }
  throw lastErr ?? new Error('Could not create family.');
}

/** A parent joins an existing family by invite code (e.g. second parent). */
export async function joinFamilyAsParent(
  parentUid: string,
  inviteCode: string
): Promise<Family> {
  const family = await findFamilyByCode(inviteCode);
  await linkProfileToFamily(parentUid, family.id);
  return family;
}

/** A teen joins a family by invite code. */
export async function joinFamilyAsChild(
  childUid: string,
  inviteCode: string
): Promise<Family> {
  const family = await findFamilyByCode(inviteCode);
  await linkProfileToFamily(childUid, family.id);
  return family;
}

async function findFamilyByCode(inviteCode: string): Promise<Family> {
  const { data, error } = await supabase
    .from('families')
    .select(FAMILY_COLS)
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No family found with that invite code.');
  return rowToFamily(data);
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select(FAMILY_COLS)
    .eq('id', familyId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToFamily(data) : null;
}

export function listenToFamily(
  familyId: string,
  cb: (family: Family | null) => void
): () => void {
  return liveQuery({
    table: 'families',
    filter: `id=eq.${familyId}`,
    fetch: () => getFamily(familyId),
    cb,
  });
}

/** Live list of the children profiles in a family. */
export function listenToChildren(
  familyId: string,
  cb: (children: UserProfile[]) => void
): () => void {
  return liveQuery({
    table: 'profiles',
    filter: `family_id=eq.${familyId}`,
    fetch: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('family_id', familyId)
        .eq('role', 'child');
      if (error) throw error;
      return (data ?? []).map(rowToProfile);
    },
    cb,
  });
}

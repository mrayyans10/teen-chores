import { supabase } from '@/supabase/client';
import { PROFILE_COLS, rowToProfile } from '@/supabase/db';
import { Role, UserProfile } from '@/types';

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: Role
): Promise<void> {
  // display_name + role are passed as user metadata; a Postgres trigger
  // (see supabase/schema.sql) creates the matching row in public.profiles.
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName, role } },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

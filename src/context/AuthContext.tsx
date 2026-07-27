import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/supabase/client';
import { liveQuery } from '@/supabase/db';
import { getUserProfile } from '@/services/auth';
import { UserProfile } from '@/types';
import { registerForPushNotifications } from '@/services/notifications';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  /** True until the initial auth state + profile have resolved. */
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  initializing: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const profileUnsub = useRef<(() => void) | null>(null);
  const pushRegistered = useRef(false);

  // Track the signed-in user via Supabase auth state.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setInitializing(false);
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Keep a live profile for the current user (so points update in real time).
  useEffect(() => {
    profileUnsub.current?.();
    profileUnsub.current = null;
    pushRegistered.current = false;

    if (!user) {
      setProfile(null);
      return;
    }

    profileUnsub.current = liveQuery({
      table: 'profiles',
      filter: `id=eq.${user.id}`,
      fetch: () => getUserProfile(user.id),
      cb: (data) => {
        setProfile(data);
        setInitializing(false);
        if (data && !pushRegistered.current) {
          pushRegistered.current = true;
          registerForPushNotifications(user.id).catch(() => {});
        }
      },
    });

    return () => {
      profileUnsub.current?.();
      profileUnsub.current = null;
    };
  }, [user]);

  const value = useMemo(
    () => ({ user, profile, initializing }),
    [user, profile, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

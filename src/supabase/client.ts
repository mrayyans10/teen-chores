import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase configuration.
 *
 * These are PLACEHOLDER values. To connect a real Supabase project:
 *   1. Create a free project at https://supabase.com (no credit card required)
 *   2. Project Settings → API → copy the Project URL and the `anon` public key
 *   3. Put them in a `.env` file at the project root (see `.env.example`):
 *        EXPO_PUBLIC_SUPABASE_URL=...
 *        EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 *   4. Run the SQL in `supabase/schema.sql` (SQL Editor) to create the tables
 *   5. Restart the dev server with `npx expo start -c`
 *
 * Expo automatically inlines any env var prefixed with `EXPO_PUBLIC_`.
 */
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

/** True when real config has been supplied (used to show a friendly warning). */
export const isSupabaseConfigured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection in a native app.
    detectSessionInUrl: false,
  },
});

/** Bucket that stores chore before/after photos. */
export const PHOTO_BUCKET = 'chore-photos';

// Pause/resume token auto-refresh with app foreground state (Supabase
// recommends this for React Native so refresh doesn't run in the background).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

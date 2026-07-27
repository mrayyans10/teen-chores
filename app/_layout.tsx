import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/supabase/client';
import { colors, spacing } from '@/theme';

function RootNavigator() {
  const { user, profile, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const group = segments[0]; // '(auth)' | '(parent)' | '(child)' | 'family-setup' | undefined

    if (!user) {
      if (group !== '(auth)') router.replace('/(auth)/sign-in');
      return;
    }

    // Signed in but profile row not yet loaded — wait.
    if (!profile) return;

    if (!profile.familyId) {
      if (group !== 'family-setup') router.replace('/family-setup');
      return;
    }

    if (profile.role === 'parent' && group !== '(parent)') {
      router.replace('/(parent)/(tabs)/dashboard');
    } else if (profile.role === 'child' && group !== '(child)') {
      router.replace('/(child)/(tabs)/chores');
    }
  }, [user, profile, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>🧹 Teen Chore Monitor</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="family-setup" />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="(child)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!isSupabaseConfigured && <ConfigBanner />}
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function ConfigBanner() {
  return (
    <View style={styles.configBanner}>
      <Text style={styles.configText}>
        ⚠️ Using placeholder Supabase config. Add your project URL + anon key to
        .env to enable sign-in. See .env.example.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  logo: { fontSize: 22, fontWeight: '800', color: colors.text },
  configBanner: {
    backgroundColor: colors.warning,
    paddingTop: 48,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  configText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="assign" options={{ title: 'Assign a chore', presentation: 'modal' }} />
      <Stack.Screen name="chore/[id]" options={{ title: 'Review chore' }} />
    </Stack>
  );
}

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/supabase/client';

// Show banners/alerts while the app is foregrounded. (SDK 56 fields.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    (Constants as any).easConfig?.projectId
  );
}

/**
 * Ask for permission and obtain an Expo push token, then store it on the
 * user's profile so the push Edge Function can target this device. Returns the
 * token or null if unavailable (e.g. simulator, denied permission, no config).
 */
export async function registerForPushNotifications(
  uid: string
): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens are only issued on physical devices.
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = getProjectId();
  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') {
    // No EAS project id yet — skip rather than throw.
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', uid);
    return token;
  } catch {
    return null;
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

// Supabase Edge Function: send Expo push notifications on data changes.
//
// Wire it up with two Database Webhooks (Dashboard → Database → Webhooks),
// both pointing at this function's URL:
//   1. chores      — events: UPDATE
//   2. redemptions  — events: INSERT
//
// Deploy:  supabase functions deploy push
// (The function uses the SERVICE_ROLE key from the auto-injected env vars to
//  read push tokens, so set no extra secrets.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
}

async function parentTokens(familyId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('family_id', familyId)
    .eq('role', 'parent');
  return (data ?? []).map((r) => r.expo_push_token).filter(Boolean);
}

async function userToken(uid: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', uid)
    .maybeSingle();
  return data?.expo_push_token ? [data.expo_push_token] : [];
}

async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const messages = tokens
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, sound: 'default', title, body, data }));
  if (messages.length === 0) return;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  // Only required if you enabled "Enhanced Security for Push Notifications" in
  // your Expo account. Set it with: supabase secrets set EXPO_ACCESS_TOKEN=...
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('Expo push API error', res.status, await res.text());
  }
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const rec = payload.record;

    if (payload.table === 'chores' && payload.type === 'UPDATE' && rec) {
      const before = payload.old_record;
      if (before && before.status === rec.status) {
        return new Response('no status change', { status: 200 });
      }
      if (rec.status === 'submitted') {
        await sendPush(
          await parentTokens(rec.family_id),
          '📸 Chore submitted',
          `${rec.assigned_to_name} submitted "${rec.title}" for review.`,
          { type: 'chore', choreId: rec.id }
        );
      } else if (rec.status === 'approved') {
        await sendPush(
          await userToken(rec.assigned_to),
          '🎉 Chore approved!',
          `"${rec.title}" was approved. You earned ${rec.points} points!`,
          { type: 'chore', choreId: rec.id }
        );
      } else if (rec.status === 'declined') {
        await sendPush(
          await userToken(rec.assigned_to),
          '↩ Chore needs a redo',
          `"${rec.title}": ${rec.decline_note ?? 'Please take another look.'}`,
          { type: 'chore', choreId: rec.id }
        );
      }
    } else if (payload.table === 'redemptions' && payload.type === 'INSERT' && rec) {
      await sendPush(
        await parentTokens(rec.family_id),
        '🛍️ Reward redeemed',
        `${rec.child_name} redeemed "${rec.reward_title}" for ${rec.cost} points.`,
        { type: 'redemption', redemptionId: rec.id }
      );
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('push function error', err);
    return new Response('error', { status: 500 });
  }
});

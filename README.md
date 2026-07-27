# 🧹 Teen Chore Monitor

A two-sided mobile app (one Expo codebase, role-based UI) where **parents** assign
chores and approve them with before/after photos, and **teens** complete chores to
earn points they can spend in a parent-defined **rewards shop**.

Built with **Expo (React Native + TypeScript)**, **Expo Router**, and **Supabase**
(Auth, Postgres + Row Level Security, Storage, Realtime, and an Edge Function for
push notifications). Supabase's free tier includes file storage **with no credit
card required**.

---

## Features

| Parent | Teen |
| --- | --- |
| Create a family, share a 6-char invite code | Join a family with the invite code |
| Monitor multiple kids + their points | See assigned chores & point balance |
| Assign chores (title, details, points, deadline) | Submit before/after photos (camera or library) |
| Review submissions, **approve** or **decline with a note** | Resubmit when a chore is declined |
| Manage the rewards shop (CRUD, hide/show) | Browse the shop & redeem with points |
| Fulfill / deny reward requests (auto-refund on deny) | Track reward request status |

Points are awarded **atomically on approval** and deducted **atomically on
redemption** via Postgres `SECURITY DEFINER` functions, so balances can't desync.
Lists update live via Supabase Realtime.

---

## Project layout

```
app/                         Expo Router screens (file-based routes)
  _layout.tsx                Root: auth provider + role-based redirect guard
  (auth)/                    sign-in, sign-up (with role picker)
  family-setup.tsx           Create/join a family
  (parent)/ (child)/         Role-specific tab stacks + detail screens
src/
  supabase/
    client.ts                Supabase client (reads EXPO_PUBLIC_SUPABASE_* env vars)
    db.ts                    Realtime liveQuery helper + row→domain mappers
  context/AuthContext.tsx    Live auth session + profile + push registration
  services/                  auth, families, chores, rewards, storage, notifications
  components/ui.tsx          Shared UI kit
  types.ts, theme.ts
supabase/
  schema.sql                 Tables, RLS, atomic RPCs, new-user trigger, realtime, bucket
  functions/push/index.ts    Edge Function: Expo push on data changes (via DB webhooks)
```

---

## 1. Run with placeholder config (UI only)

The app ships with a **placeholder Supabase config**, so it boots and you can click
through the UI immediately. Sign-in/data won't work until you add real keys (a yellow
banner reminds you).

```bash
npm install
npx expo start
```

Open it in **Expo Go** on your phone (scan the QR code) or press `a` / `i`.

---

## 2. Connect a real Supabase project (free, no credit card)

1. Create a project at <https://supabase.com>.
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql). This
   creates the tables, RLS policies, the atomic point functions, the new-user trigger,
   enables Realtime, and creates the public `chore-photos` storage bucket.
3. **Authentication → Providers → Email**: for easy testing, turn **off**
   "Confirm email" so new accounts can sign in immediately. (Leave it on for production
   and the app will show a "confirm your email" message.)
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
5. Copy `.env.example` → `.env` and fill them in:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

6. Restart with a clean cache: `npx expo start -c`.

That's it — auth, the family/chore/reward data, photo upload, and live updates all work.

---

## 3. Push notifications (Edge Function + Database Webhooks)

Push uses **Expo Push Notifications**, sent from a **Supabase Edge Function** that fires
on data changes (chore submitted/approved/declined, reward redeemed). No credit card,
no separate billing plan.

1. **Get an EAS project id** (needed to issue Expo push tokens):
   ```bash
   npm install -g eas-cli
   eas login
   eas init          # prints the projectId
   ```
   Put that id in **both** `app.json` → `expo.extra.eas.projectId` and
   `.env` → `EXPO_PUBLIC_EAS_PROJECT_ID`.
2. **Deploy the Edge Function** with the Supabase CLI:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy push
   ```
3. **Create two Database Webhooks** (Dashboard → Database → Webhooks), both calling the
   deployed `push` function URL:
   - Table **chores**, events: **UPDATE**
   - Table **redemptions**, events: **INSERT**
4. **Test on a physical device.** Push tokens are not issued on simulators/emulators.
   The app registers the device token on the user's profile automatically after sign-in
   and asks for notification permission.

The function reads push tokens with the auto-injected service-role key and posts to
Expo's push API for both iOS and Android.

---

## How the data flows

1. Parent signs up → creates a family → gets an invite code.
2. Teen signs up (role: Teen) → enters the invite code → joins the family.
3. Parent assigns a chore → teen sees it under **My Chores**.
4. Teen adds **before** + **after** photos → `submit_chore` RPC → status `submitted`.
   → Webhook fires the Edge Function → parent notified.
5. Parent reviews:
   - **Approve** → `approve_chore` RPC awards points atomically → teen notified.
   - **Decline + note** → teen notified, chore returns to an editable state to resubmit.
6. Teen spends points in the **Shop** → `redeem_reward` RPC deducts points and records a
   request → parent notified → parent marks **given** or **denies** (`deny_redemption`
   refunds).

---

## Security note

`supabase/schema.sql` enables Row Level Security on every table and scopes data to a
family. It's a reasonable starting point, **not** a hardened production policy — notably,
`families` are selectable by any authenticated user (so teens can look up a family by
invite code before joining). Review and tighten before shipping.

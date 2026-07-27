-- ============================================================================
-- Teen Chore Monitor — Supabase schema
-- Run this in the Supabase SQL Editor (or `supabase db push`) on a fresh project.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users (id),
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  display_name    text not null,
  role            text not null check (role in ('parent', 'child')),
  family_id       uuid references public.families (id),
  points          integer not null default 0,
  expo_push_token text,
  created_at      timestamptz not null default now()
);

create table if not exists public.chores (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families (id) on delete cascade,
  title            text not null,
  description      text default '',
  points           integer not null default 0,
  assigned_to      uuid not null references public.profiles (id),
  assigned_to_name text not null,
  assigned_by      uuid not null references public.profiles (id),
  status           text not null default 'assigned'
                     check (status in ('assigned', 'submitted', 'approved', 'declined')),
  before_photo_url text,
  after_photo_url  text,
  decline_note     text,
  submission_count integer not null default 0,
  due_date         timestamptz,
  created_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  reviewed_at      timestamptz
);

create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  title       text not null,
  description text default '',
  cost        integer not null,
  created_by  uuid not null references public.profiles (id),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.redemptions (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  reward_id    uuid not null references public.rewards (id) on delete cascade,
  reward_title text not null,
  child_uid    uuid not null references public.profiles (id),
  child_name   text not null,
  cost         integer not null,
  status       text not null default 'requested'
                 check (status in ('requested', 'fulfilled', 'denied')),
  created_at   timestamptz not null default now()
);

create index if not exists chores_family_idx on public.chores (family_id, created_at desc);
create index if not exists chores_assigned_idx on public.chores (assigned_to, created_at desc);
create index if not exists rewards_family_idx on public.rewards (family_id, cost);
create index if not exists redemptions_family_idx on public.redemptions (family_id, created_at desc);
create index if not exists profiles_family_idx on public.profiles (family_id, role);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids RLS recursion when reading own row)
-- ---------------------------------------------------------------------------

create or replace function public.my_family_id()
returns uuid language sql security definer stable set search_path = public as $$
  select family_id from public.profiles where id = auth.uid();
$$;

create or replace function public.my_role()
returns text language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Create a profile automatically when a new auth user signs up. display_name
-- and role come from the sign-up metadata (options.data on the client).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New user'),
    coalesce(new.raw_user_meta_data ->> 'role', 'child')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic operations (replace the old Firestore transactions / Cloud Functions)
-- ---------------------------------------------------------------------------

-- Teen submits (or resubmits) photos; submission_count increments atomically.
create or replace function public.submit_chore(
  p_chore_id uuid, p_before_url text, p_after_url text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.chores
     set status = 'submitted',
         before_photo_url = p_before_url,
         after_photo_url = p_after_url,
         decline_note = null,
         submission_count = submission_count + 1,
         submitted_at = now()
   where id = p_chore_id
     and assigned_to = auth.uid();
  if not found then
    raise exception 'Chore not found or not assigned to you.';
  end if;
end;
$$;

-- Parent approves a submission; awards points to the child atomically.
create or replace function public.approve_chore(p_chore_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chores%rowtype;
begin
  select * into c from public.chores where id = p_chore_id;
  if not found then raise exception 'Chore no longer exists.'; end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'parent' and family_id = c.family_id
  ) then raise exception 'Not authorized.'; end if;
  if c.status = 'approved' then return; end if; -- idempotent, no double-award

  update public.chores set status = 'approved', reviewed_at = now() where id = p_chore_id;
  update public.profiles set points = points + c.points where id = c.assigned_to;
end;
$$;

-- Teen redeems a reward; checks balance, deducts points, records the request.
create or replace function public.redeem_reward(p_reward_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rewards%rowtype; me public.profiles%rowtype;
begin
  select * into r from public.rewards where id = p_reward_id;
  if not found then raise exception 'Reward not found.'; end if;
  select * into me from public.profiles where id = auth.uid();
  if not found then raise exception 'Your profile was not found.'; end if;
  if me.family_id is distinct from r.family_id then raise exception 'Not your family.'; end if;
  if me.points < r.cost then raise exception 'Not enough points for this reward yet.'; end if;

  insert into public.redemptions
    (family_id, reward_id, reward_title, child_uid, child_name, cost, status)
  values (r.family_id, r.id, r.title, me.id, me.display_name, r.cost, 'requested');
  update public.profiles set points = points - r.cost where id = me.id;
end;
$$;

-- Parent denies a redemption request; refunds the points atomically.
create or replace function public.deny_redemption(p_redemption_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare rd public.redemptions%rowtype;
begin
  select * into rd from public.redemptions where id = p_redemption_id;
  if not found then return; end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'parent' and family_id = rd.family_id
  ) then raise exception 'Not authorized.'; end if;
  if rd.status <> 'requested' then return; end if;

  update public.redemptions set status = 'denied' where id = p_redemption_id;
  update public.profiles set points = points + rd.cost where id = rd.child_uid;
end;
$$;

grant execute on function public.submit_chore(uuid, text, text) to authenticated;
grant execute on function public.approve_chore(uuid) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.deny_redemption(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.families    enable row level security;
alter table public.profiles    enable row level security;
alter table public.chores      enable row level security;
alter table public.rewards     enable row level security;
alter table public.redemptions enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or family_id = public.my_family_id()
);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (
  id = auth.uid()
  or (public.my_role() = 'parent' and family_id = public.my_family_id())
);

-- families (select open to authenticated so teens can look up by invite code)
drop policy if exists families_select on public.families;
create policy families_select on public.families for select using (auth.uid() is not null);
drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert with check (created_by = auth.uid());
drop policy if exists families_update on public.families;
create policy families_update on public.families for update using (id = public.my_family_id());

-- chores
drop policy if exists chores_select on public.chores;
create policy chores_select on public.chores for select using (family_id = public.my_family_id());
drop policy if exists chores_insert on public.chores;
create policy chores_insert on public.chores for insert with check (
  public.my_role() = 'parent' and family_id = public.my_family_id()
);
drop policy if exists chores_update on public.chores;
create policy chores_update on public.chores for update using (
  family_id = public.my_family_id()
  and (public.my_role() = 'parent' or assigned_to = auth.uid())
);
drop policy if exists chores_delete on public.chores;
create policy chores_delete on public.chores for delete using (
  public.my_role() = 'parent' and family_id = public.my_family_id()
);

-- rewards
drop policy if exists rewards_select on public.rewards;
create policy rewards_select on public.rewards for select using (family_id = public.my_family_id());
drop policy if exists rewards_write on public.rewards;
create policy rewards_write on public.rewards for all using (
  public.my_role() = 'parent' and family_id = public.my_family_id()
) with check (
  public.my_role() = 'parent' and family_id = public.my_family_id()
);

-- redemptions
drop policy if exists redemptions_select on public.redemptions;
create policy redemptions_select on public.redemptions for select using (
  family_id = public.my_family_id()
);
drop policy if exists redemptions_insert on public.redemptions;
create policy redemptions_insert on public.redemptions for insert with check (
  child_uid = auth.uid() and family_id = public.my_family_id()
);
drop policy if exists redemptions_update on public.redemptions;
create policy redemptions_update on public.redemptions for update using (
  public.my_role() = 'parent' and family_id = public.my_family_id()
);

-- ---------------------------------------------------------------------------
-- Realtime — let the app subscribe to row changes
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['profiles','families','chores','rewards','redemptions'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage — public bucket for chore before/after photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('chore-photos', 'chore-photos', true)
on conflict (id) do nothing;

drop policy if exists "chore photos read" on storage.objects;
create policy "chore photos read" on storage.objects for select
  using (bucket_id = 'chore-photos');

drop policy if exists "chore photos upload" on storage.objects;
create policy "chore photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chore-photos');

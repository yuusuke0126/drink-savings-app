-- Household-based sharing model for couple use.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_id_idx
on public.household_members(user_id);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_household_id uuid references public.households(id) on delete set null,
  display_name text check (display_name is null or char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
add column if not exists display_name text check (display_name is null or char_length(display_name) between 1 and 20);

create table if not exists public.drink_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  drink_type text not null check (drink_type in ('beer', 'whisky', 'wine', 'sake', 'shochu', 'other')),
  custom_drink_name text,
  drank_on date not null default (timezone('Asia/Tokyo', now()))::date,
  created_at timestamptz not null default now()
);

-- Migrate legacy tables that predate drank_on before creating indexes on that column.
alter table public.drink_logs add column if not exists drank_on date;
update public.drink_logs
set drank_on = (timezone('Asia/Tokyo', created_at))::date
where drank_on is null;
alter table public.drink_logs alter column drank_on set not null;
alter table public.drink_logs alter column drank_on set default (timezone('Asia/Tokyo', now()))::date;

create index if not exists drink_logs_user_id_idx on public.drink_logs(user_id);
create index if not exists drink_logs_household_id_idx on public.drink_logs(household_id);
create index if not exists drink_logs_created_at_idx on public.drink_logs(created_at desc);
create index if not exists drink_logs_household_drank_on_idx on public.drink_logs(household_id, drank_on);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.drink_logs enable row level security;
alter table public.user_profiles enable row level security;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member"
on public.households
for select
using (public.is_household_member(households.id));

drop policy if exists "households_insert_auth" on public.households;
create policy "households_insert_auth"
on public.households
for insert
with check (auth.uid() is not null);

drop policy if exists "household_members_select_self" on public.household_members;
create policy "household_members_select_self"
on public.household_members
for select
using (user_id = auth.uid());

drop policy if exists "household_members_select_same_household" on public.household_members;
create policy "household_members_select_same_household"
on public.household_members
for select
using (public.is_household_member(household_members.household_id));

drop policy if exists "household_members_insert_self" on public.household_members;
create policy "household_members_insert_self"
on public.household_members
for insert
with check (user_id = auth.uid());

drop policy if exists "user_profiles_select_self" on public.user_profiles;
create policy "user_profiles_select_self"
on public.user_profiles
for select
using (user_id = auth.uid());

drop policy if exists "user_profiles_select_same_household" on public.user_profiles;
create policy "user_profiles_select_same_household"
on public.user_profiles
for select
using (
  exists (
    select 1
    from public.drink_logs dl
    where public.is_household_member(dl.household_id)
      and dl.user_id = user_profiles.user_id
  )
);

drop policy if exists "user_profiles_insert_self" on public.user_profiles;
create policy "user_profiles_insert_self"
on public.user_profiles
for insert
with check (user_id = auth.uid());

drop policy if exists "user_profiles_update_self" on public.user_profiles;
create policy "user_profiles_update_self"
on public.user_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "drink_logs_select_household" on public.drink_logs;
create policy "drink_logs_select_household"
on public.drink_logs
for select
using (public.is_household_member(drink_logs.household_id));

drop policy if exists "drink_logs_insert_household" on public.drink_logs;
create policy "drink_logs_insert_household"
on public.drink_logs
for insert
with check (
  user_id = auth.uid()
  and public.is_household_member(drink_logs.household_id)
);

drop policy if exists "drink_logs_delete_own" on public.drink_logs;
create policy "drink_logs_delete_own"
on public.drink_logs
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.drink_logs to authenticated;

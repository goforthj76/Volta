-- Run in a new Supabase project's SQL editor or with supabase db push.
create table public.profiles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 24),
 avatar_color text not null default '#c9fa75',
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.profile_state (
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id text not null check(length(profile_id) between 1 and 100),
 data jsonb not null default '{"favorites":[],"history":[]}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,profile_id),
 check (jsonb_typeof(data) = 'object'),
 check (octet_length(data::text) < 1048576)
);
alter table public.profiles enable row level security;
alter table public.profile_state enable row level security;
create policy "own profiles" on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own library" on public.profile_state for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.profiles, public.profile_state from anon;
grant select,insert,update,delete on public.profiles, public.profile_state to authenticated;
create function public.update_modified_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger library_modified before update on public.profile_state for each row execute function public.update_modified_at();

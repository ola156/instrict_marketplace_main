-- ============================================
-- MIGRATION 0001: Initial Auth & Role Schema
-- ============================================

-- ============================================
-- 1. PROFILES — base info, 1:1 with auth.users
-- ============================================
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  email text,
  avatar_url text,
  campus text not null,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 2. ROLES — additive, one user can have many
-- ============================================
do $$ begin
  create type app_role as enum ('user', 'rider', 'vendor');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type role_status as enum ('pending', 'active', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists user_roles (
  user_id uuid references auth.users(id),
  role app_role not null,
  status role_status default 'active',
  created_at timestamptz default now(),
  primary key (user_id, role)
);

-- ============================================
-- 3. VENDOR PROFILES
-- ============================================
do $$ begin
  create type vendor_category as enum ('retail', 'canteen', 'service');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type fulfillment_method as enum ('pickup', 'delivery', 'both');
exception
  when duplicate_object then null;
end $$;

create table if not exists vendor_profiles (
  user_id uuid references auth.users(id) primary key,
  legal_name text not null,
  support_phone text not null,
  category vendor_category not null,
  sub_categories text[] not null default '{}',
  store_address text not null,
  landmark text not null,
  opening_time time not null default '08:00',
  closing_time time not null default '20:00',
  fulfillment_method fulfillment_method not null default 'both',
  description text,
  phone_verified boolean default false,
  approved boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 4. RIDER PROFILES (placeholder — extend later)
-- ============================================
create table if not exists rider_profiles (
  user_id uuid references auth.users(id) primary key,
  vehicle_type text,
  license_number text,
  phone_verified boolean default false,
  approved boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table vendor_profiles enable row level security;
alter table rider_profiles enable row level security;

drop policy if exists "own profile read" on profiles;
create policy "own profile read" on profiles for select using (auth.uid() = id);

drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (auth.uid() = id);

drop policy if exists "own roles read" on user_roles;
create policy "own roles read" on user_roles for select using (auth.uid() = user_id);

drop policy if exists "own roles insert" on user_roles;
create policy "own roles insert" on user_roles for insert with check (auth.uid() = user_id);

drop policy if exists "own vendor profile read" on vendor_profiles;
create policy "own vendor profile read" on vendor_profiles for select using (auth.uid() = user_id);

drop policy if exists "own vendor profile insert" on vendor_profiles;
create policy "own vendor profile insert" on vendor_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "own vendor profile update" on vendor_profiles;
create policy "own vendor profile update" on vendor_profiles for update using (auth.uid() = user_id);

drop policy if exists "own rider profile read" on rider_profiles;
create policy "own rider profile read" on rider_profiles for select using (auth.uid() = user_id);

drop policy if exists "own rider profile insert" on rider_profiles;
create policy "own rider profile insert" on rider_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "own rider profile update" on rider_profiles;
create policy "own rider profile update" on rider_profiles for update using (auth.uid() = user_id);

-- ============================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, campus)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'campus', 'unspecified')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

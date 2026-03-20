create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  school_name text,
  school_type text,
  education_level text,
  major text,
  sub_major text,
  graduation_status text,
  graduation_date date,
  gpa_score numeric(4, 2),
  gpa_scale numeric(4, 2),
  core_skills text,
  tech_stack text,
  role_certifications text,
  language_test_name text,
  language_test_score text,
  desired_companies text,
  other_certifications text,
  target_industry text,
  preferred_location text,
  portfolio_url text,
  github_url text,
  experience_summary text,
  gpa numeric(3, 2),
  skills text,
  certifications text,
  internship_count integer default 0,
  project_count integer default 0,
  target_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists school_name text;
alter table public.profiles add column if not exists school_type text;
alter table public.profiles add column if not exists sub_major text;
alter table public.profiles add column if not exists graduation_status text;
alter table public.profiles add column if not exists graduation_date date;
alter table public.profiles add column if not exists gpa_score numeric(4, 2);
alter table public.profiles add column if not exists gpa_scale numeric(4, 2);
alter table public.profiles add column if not exists core_skills text;
alter table public.profiles add column if not exists tech_stack text;
alter table public.profiles add column if not exists role_certifications text;
alter table public.profiles add column if not exists language_test_name text;
alter table public.profiles add column if not exists language_test_score text;
alter table public.profiles add column if not exists desired_companies text;
alter table public.profiles add column if not exists other_certifications text;
alter table public.profiles add column if not exists target_industry text;
alter table public.profiles add column if not exists preferred_location text;
alter table public.profiles add column if not exists portfolio_url text;
alter table public.profiles add column if not exists github_url text;
alter table public.profiles add column if not exists experience_summary text;
alter table public.profiles add column if not exists project_count integer default 0;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_text text not null,
  job_description text,
  tone text,
  generated_text text not null,
  model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cover_letters enable row level security;

drop policy if exists "cover_letters_select_own" on public.cover_letters;
create policy "cover_letters_select_own"
on public.cover_letters for select
using (auth.uid() = user_id);

drop policy if exists "cover_letters_insert_own" on public.cover_letters;
create policy "cover_letters_insert_own"
on public.cover_letters for insert
with check (auth.uid() = user_id);

create table if not exists public.real_job_search_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.real_job_search_cache enable row level security;

drop policy if exists "real_job_cache_select_own" on public.real_job_search_cache;
create policy "real_job_cache_select_own"
on public.real_job_search_cache for select
using (auth.uid() = user_id);

drop policy if exists "real_job_cache_insert_own" on public.real_job_search_cache;
create policy "real_job_cache_insert_own"
on public.real_job_search_cache for insert
with check (auth.uid() = user_id);

drop policy if exists "real_job_cache_update_own" on public.real_job_search_cache;
create policy "real_job_cache_update_own"
on public.real_job_search_cache for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

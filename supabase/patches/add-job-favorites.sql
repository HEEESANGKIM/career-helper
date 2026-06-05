-- Saved job postings from Job Matching favorites.
create table if not exists public.job_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_url text not null,
  job_title text not null,
  company text not null,
  location text,
  summary text,
  fit_score integer,
  saved_at timestamptz not null default now(),
  unique (user_id, job_url)
);

create index if not exists job_favorites_user_saved_idx
  on public.job_favorites (user_id, saved_at desc);

alter table public.job_favorites enable row level security;

drop policy if exists "job_favorites_select_own" on public.job_favorites;
create policy "job_favorites_select_own"
on public.job_favorites for select
using (auth.uid() = user_id);

drop policy if exists "job_favorites_insert_own" on public.job_favorites;
create policy "job_favorites_insert_own"
on public.job_favorites for insert
with check (auth.uid() = user_id);

drop policy if exists "job_favorites_update_own" on public.job_favorites;
create policy "job_favorites_update_own"
on public.job_favorites for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "job_favorites_delete_own" on public.job_favorites;
create policy "job_favorites_delete_own"
on public.job_favorites for delete
using (auth.uid() = user_id);

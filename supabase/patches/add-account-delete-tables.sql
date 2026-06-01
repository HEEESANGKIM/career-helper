-- Run in Supabase Dashboard → SQL Editor if account delete reported missing tables.
-- Safe to re-run (IF NOT EXISTS).

create table if not exists public.career_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  simulation_id uuid references public.career_simulations(id) on delete cascade,
  decision_key text not null,
  decision_json jsonb not null default '{}'::jsonb,
  language text not null default 'ko' check (language in ('ko', 'en')),
  created_at timestamptz not null default now()
);

alter table public.career_decisions enable row level security;

drop policy if exists "career_decisions_select_own" on public.career_decisions;
create policy "career_decisions_select_own"
on public.career_decisions for select
using (auth.uid() = user_id);

drop policy if exists "career_decisions_insert_own" on public.career_decisions;
create policy "career_decisions_insert_own"
on public.career_decisions for insert
with check (auth.uid() = user_id);

create table if not exists public.career_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text,
  overall_score integer,
  skill_match_score integer,
  resume_score integer,
  interview_score integer,
  portfolio_score integer,
  market_alignment_score integer,
  background_score integer,
  input_json jsonb not null default '{}'::jsonb,
  explanation_json jsonb not null default '{}'::jsonb,
  language text not null default 'ko' check (language in ('ko', 'en')),
  created_at timestamptz not null default now()
);

alter table public.career_readiness_snapshots enable row level security;

drop policy if exists "career_readiness_snapshots_select_own" on public.career_readiness_snapshots;
create policy "career_readiness_snapshots_select_own"
on public.career_readiness_snapshots for select
using (auth.uid() = user_id);

drop policy if exists "career_readiness_snapshots_insert_own" on public.career_readiness_snapshots;
create policy "career_readiness_snapshots_insert_own"
on public.career_readiness_snapshots for insert
with check (auth.uid() = user_id);

create table if not exists public.background_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_links jsonb not null default '[]'::jsonb,
  submitted_content text,
  evaluation_id uuid references public.user_evaluations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.background_reports enable row level security;

drop policy if exists "background_reports_select_own" on public.background_reports;
create policy "background_reports_select_own"
on public.background_reports for select
using (auth.uid() = user_id);

drop policy if exists "background_reports_insert_own" on public.background_reports;
create policy "background_reports_insert_own"
on public.background_reports for insert
with check (auth.uid() = user_id);

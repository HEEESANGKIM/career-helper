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

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferred_language text not null default 'ko' check (preferred_language in ('ko', 'en')),
  current_role text,
  target_role text,
  skills text,
  experience_level text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles for select
using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.evaluation_rubrics (
  id uuid primary key default gen_random_uuid(),
  feature_type text not null,
  company text,
  role text,
  persona_name text,
  rubric_json jsonb not null default '{}'::jsonb,
  language text not null default 'en' check (language in ('ko', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evaluation_rubrics enable row level security;

create unique index if not exists evaluation_rubrics_seed_key
on public.evaluation_rubrics (feature_type, company, role, persona_name, language);

drop policy if exists "evaluation_rubrics_select_all" on public.evaluation_rubrics;
create policy "evaluation_rubrics_select_all"
on public.evaluation_rubrics for select
using (true);

create table if not exists public.user_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_type text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  overall_score integer,
  language text not null default 'ko' check (language in ('ko', 'en')),
  created_at timestamptz not null default now()
);

alter table public.user_evaluations enable row level security;

drop policy if exists "user_evaluations_select_own" on public.user_evaluations;
create policy "user_evaluations_select_own"
on public.user_evaluations for select
using (auth.uid() = user_id);

drop policy if exists "user_evaluations_insert_own" on public.user_evaluations;
create policy "user_evaluations_insert_own"
on public.user_evaluations for insert
with check (auth.uid() = user_id);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id text,
  role text,
  company text,
  question text,
  answer text,
  evaluation_id uuid references public.user_evaluations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

drop policy if exists "interview_sessions_select_own" on public.interview_sessions;
create policy "interview_sessions_select_own"
on public.interview_sessions for select
using (auth.uid() = user_id);

drop policy if exists "interview_sessions_insert_own" on public.interview_sessions;
create policy "interview_sessions_insert_own"
on public.interview_sessions for insert
with check (auth.uid() = user_id);

create table if not exists public.career_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_role text,
  target_role text,
  timeline_years integer,
  risk_tolerance text,
  selected_path text,
  evaluation_id uuid references public.user_evaluations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.career_simulations add column if not exists input_json jsonb not null default '{}'::jsonb;
alter table public.career_simulations add column if not exists output_json jsonb not null default '{}'::jsonb;
alter table public.career_simulations add column if not exists language text not null default 'ko' check (language in ('ko', 'en'));
alter table public.career_simulations add column if not exists selected_decisions jsonb not null default '[]'::jsonb;

alter table public.career_simulations enable row level security;

drop policy if exists "career_simulations_select_own" on public.career_simulations;
create policy "career_simulations_select_own"
on public.career_simulations for select
using (auth.uid() = user_id);

drop policy if exists "career_simulations_insert_own" on public.career_simulations;
create policy "career_simulations_insert_own"
on public.career_simulations for insert
with check (auth.uid() = user_id);

create table if not exists public.career_templates (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  role_name text not null,
  template_json jsonb not null default '{}'::jsonb,
  language text not null default 'ko' check (language in ('ko', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_templates enable row level security;

drop policy if exists "career_templates_select_all" on public.career_templates;
create policy "career_templates_select_all"
on public.career_templates for select
using (true);

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

create table if not exists public.synthetic_career_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null unique,
  target_role text,
  profile_json jsonb not null default '{}'::jsonb,
  source text not null default 'synthetic_fictional',
  created_at timestamptz not null default now()
);

alter table public.synthetic_career_profiles enable row level security;

drop policy if exists "synthetic_career_profiles_select_all" on public.synthetic_career_profiles;
create policy "synthetic_career_profiles_select_all"
on public.synthetic_career_profiles for select
using (true);

create table if not exists public.public_role_stats (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  stats_json jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_role_stats enable row level security;

drop policy if exists "public_role_stats_select_all" on public.public_role_stats;
create policy "public_role_stats_select_all"
on public.public_role_stats for select
using (true);

create table if not exists public.salary_bands (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  salary_json jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.salary_bands enable row level security;

drop policy if exists "salary_bands_select_all" on public.salary_bands;
create policy "salary_bands_select_all"
on public.salary_bands for select
using (true);

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

insert into public.career_templates (role_key, role_name, language, template_json)
values
  ('software-engineer', 'Software Engineer', 'en', '{"entryPoints":["Junior Developer","Frontend Intern"],"skills":["Git","Web/API","Debugging"],"projects":["CRUD app","API dashboard"],"risks":["Weak technical depth"],"interviewFocus":["Problem solving","Debugging"]}'::jsonb),
  ('data-analyst', 'Data Analyst', 'en', '{"entryPoints":["Data Intern","Reporting Assistant"],"skills":["SQL","Visualization","Metrics"],"projects":["Dashboard","Insight report"],"risks":["Weak business interpretation"],"interviewFocus":["Metrics","Assumptions"]}'::jsonb),
  ('ui-ux-designer', 'UI/UX Designer', 'en', '{"entryPoints":["UX Intern","Junior Product Designer"],"skills":["Figma","Research","Prototyping"],"projects":["Case study","App redesign"],"risks":["Weak user evidence"],"interviewFocus":["Empathy","Process"]}'::jsonb),
  ('product-manager', 'Product Manager', 'en', '{"entryPoints":["PM Intern","Product Operations"],"skills":["Problem framing","Metrics","Prioritization"],"projects":["PRD","Experiment plan"],"risks":["Limited product experience"],"interviewFocus":["Product sense","Priority"]}'::jsonb),
  ('digital-marketer', 'Digital Marketer', 'en', '{"entryPoints":["Marketing Intern","Content Assistant"],"skills":["SEO","Campaigns","Metrics"],"projects":["Campaign plan","SEO posts"],"risks":["Few performance metrics"],"interviewFocus":["Audience","Channels"]}'::jsonb),
  ('software-engineer-ko', '소프트웨어 엔지니어', 'ko', '{"entryPoints":["주니어 개발자","프론트엔드 인턴"],"skills":["Git","웹/API","디버깅"],"projects":["CRUD 앱","API 대시보드"],"risks":["기술 깊이 부족"],"interviewFocus":["문제 해결","디버깅"]}'::jsonb),
  ('data-analyst-ko', '데이터 분석가', 'ko', '{"entryPoints":["데이터 인턴","리포팅 어시스턴트"],"skills":["SQL","시각화","지표"],"projects":["대시보드","인사이트 리포트"],"risks":["비즈니스 해석 약함"],"interviewFocus":["지표","가정"]}'::jsonb),
  ('ui-ux-designer-ko', 'UI/UX 디자이너', 'ko', '{"entryPoints":["UX 인턴","주니어 프로덕트 디자이너"],"skills":["Figma","리서치","프로토타입"],"projects":["케이스스터디","앱 리디자인"],"risks":["사용자 근거 부족"],"interviewFocus":["공감","프로세스"]}'::jsonb)
on conflict (role_key) do update
set role_name = excluded.role_name,
    language = excluded.language,
    template_json = excluded.template_json,
    updated_at = now();

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

insert into public.evaluation_rubrics (feature_type, company, role, persona_name, language, rubric_json)
values
  ('hiring-manager', 'Google', 'Software Engineer', 'Google SWE Interviewer', 'en', '{"communication":["clarity","structured reasoning"],"problemSolving":["decomposition","scalability"],"roleFit":["engineering depth","clean tradeoffs"],"companyFit":["collaboration","user impact"]}'::jsonb),
  ('hiring-manager', 'Amazon', 'SDE', 'Amazon SDE Bar Raiser', 'en', '{"communication":["STAR clarity","directness"],"problemSolving":["ownership","tradeoffs"],"roleFit":["delivery","technical judgment"],"companyFit":["customer obsession","bias for action"]}'::jsonb),
  ('hiring-manager', 'Meta', 'Product Manager', 'Meta Product Interviewer', 'en', '{"communication":["crisp framing","prioritization"],"problemSolving":["metrics","experimentation"],"roleFit":["product sense","execution"],"companyFit":["speed","impact"]}'::jsonb),
  ('hiring-manager', 'Startup', 'Engineering', 'Startup CTO', 'en', '{"communication":["practical clarity","business connection"],"problemSolving":["shipping judgment","constraints"],"roleFit":["autonomy","full-stack range"],"companyFit":["speed","customer focus"]}'::jsonb),
  ('hiring-manager', 'Google', 'Software Engineer', 'Google SWE Interviewer', 'ko', '{"communication":["명확성","구조화된 추론"],"problemSolving":["문제 분해","확장성"],"roleFit":["엔지니어링 깊이","트레이드오프"],"companyFit":["협업","사용자 임팩트"]}'::jsonb),
  ('hiring-manager', 'Amazon', 'SDE', 'Amazon SDE Bar Raiser', 'ko', '{"communication":["STAR 명확성","직설성"],"problemSolving":["오너십","트레이드오프"],"roleFit":["실행력","기술 판단"],"companyFit":["고객 집착","빠른 실행"]}'::jsonb),
  ('hiring-manager', 'Meta', 'Product Manager', 'Meta Product Interviewer', 'ko', '{"communication":["간결한 프레이밍","우선순위"],"problemSolving":["지표","실험"],"roleFit":["제품 감각","실행"],"companyFit":["속도","임팩트"]}'::jsonb),
  ('hiring-manager', 'Startup', 'Engineering', 'Startup CTO', 'ko', '{"communication":["실용적 명확성","비즈니스 연결"],"problemSolving":["출시 판단","제약 대응"],"roleFit":["자율성","풀스택 범위"],"companyFit":["속도","고객 중심"]}'::jsonb)
on conflict (feature_type, company, role, persona_name, language) do update
set rubric_json = excluded.rubric_json,
    updated_at = now();

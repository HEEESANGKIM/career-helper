# PathMate.ai

An AI-powered career cockpit for students and job seekers. PathMate helps users build a structured profile, practice the hiring loop, compare career paths, and discover realistic job matches.

**Live (beta):** https://career-helper-dun.vercel.app/

---

## 1. Problem Statement

**Target users:** College students, recent graduates, and early-career job seekers who need clearer direction in a competitive market.

**The problem:** Candidates often struggle to tell which roles realistically fit their background (GPA, projects, internships, skills) and how to improve applications for those roles.

**Our solution:** PathMate turns profile data into AI-ready context, then delivers dashboard insights, resume support, hiring simulations, career planning, and live job matching in one web app.

---

## 2. Key Features

| Module | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/dashboard` | Profile readiness scores, skill summary, penalty factors, and personalized insight |
| **Settings** | `/settings` | Single place to edit education, skills, goals, links, account, and saved job postings |
| **Resume Lab** | `/cover-letter` | AI-generated cover letter drafts from resume/context + job description |
| **Hiring Simulator** | `/hiring-simulator` | Application fit, interview question practice, and answer feedback |
| **Next Move** | `/next-move` | Career strategy board to compare paths, risk, and long-term outcomes |
| **Job Match** | `/matching` | Profile-based live job search with fit scores and favorites |
| **Background Check** | `/background-check` | AI review of public links and application content |

**Also included**
- Bilingual UI (Korean / English)
- Dark and light themes
- Google OAuth and email/password login via Supabase Auth
- Saved job favorites synced to Supabase
- Account deletion with related data cleanup

---

## 3. Team Members

- **Dohyeon Lee** — GitHub: [@DohyeonLee0](https://github.com/DohyeonLee0) / dohyeon.lee@stonybrook.edu
- **Heesang Kim** — GitHub: [@HEEESANGKIM](https://github.com/HEEESANGKIM) / heesang.kim@stonybrook.edu

---

## 4. Tech Stack

### Frontend
| Technology | Version / Notes |
|------------|-----------------|
| [Next.js](https://nextjs.org/) (App Router) | 16.x |
| [React](https://react.dev/) | 19.x |
| [TypeScript](https://www.typescriptlang.org/) | 5.x |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x |
| [Framer Motion](https://www.framer.com/motion/) | UI motion |
| [Lucide React](https://lucide.dev/) | Icons |

### Backend (how the app is built)

PathMate does **not** use a separate backend server (no Express, Django, etc.). The backend is:

1. **Next.js API Routes** (`app/api/**/route.ts`) — server-side endpoints deployed as **Vercel serverless functions**
2. **Supabase** — PostgreSQL database, authentication, and Row Level Security (RLS)
3. **OpenAI API** — LLM calls for cover letters, evaluations, job matching, and simulators

```
Browser (React)
    ↓
Next.js pages (client + server components)
    ↓
Next.js API Routes  ←→  OpenAI API
    ↓
Supabase (PostgreSQL + Auth)
```

| Layer | Service | Role |
|-------|---------|------|
| **Hosting** | [Vercel](https://vercel.com) | Frontend + API route deployment |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL) | Profiles, cover letters, job cache, favorites, evaluations, simulations |
| **Auth** | Supabase Auth | Email/password + Google OAuth |
| **AI** | [OpenAI API](https://platform.openai.com/) | `gpt-4o-mini`, `gpt-4.1-mini` (and optional `OPENAI_EVALUATION_MODEL`) |

### Main database tables (Supabase)

- `profiles` — user career profile (Settings)
- `cover_letters` — generated resume/cover letter drafts
- `real_job_search_cache` — cached Job Match results per user
- `job_favorites` — starred postings from Job Match (see patch below)
- `user_evaluations`, `interview_sessions`, `career_simulations` — evaluation and simulation history
- `career_decisions`, `career_readiness_snapshots`, `background_reports` — Next Move / readiness data

Schema: `supabase/schema.sql`  
Additional patches: `supabase/patches/`

### Project management
- [Jira Software](https://sbucse416.atlassian.net/jira/software/projects/CH/boards/1)

---

## 5. Deployment

| Item | Value |
|------|-------|
| **Platform** | Vercel (frontend + serverless API routes) |
| **Database** | Supabase Cloud (PostgreSQL) |
| **Beta URL** | https://career-helper-dun.vercel.app/ |

### Vercel environment variables

In Vercel → Project → **Settings** → **Environment Variables**, set these for Production, Preview, and Development as needed:

| Name | Required | Notes |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `anon` public key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `service_role` key — **server only**, never expose to the client |
| `OPENAI_API_KEY` | Yes | OpenAI secret key — **server only** |
| `OPENAI_EVALUATION_MODEL` | No | Override default evaluation model (e.g. `gpt-4.1-mini`) |

### Supabase setup after deploy

1. Run `supabase/schema.sql` in the Supabase SQL Editor (if not already applied).
2. Run `supabase/patches/add-job-favorites.sql` for Job Match favorites.
3. Enable **Google** provider under Authentication → Providers (optional).
4. Add your Vercel URL to Authentication → URL configuration (redirect URLs).

---

## 6. Local Development

> **Tested on:** Windows. macOS and Linux should work but are less frequently tested.

### Prerequisites
- **Node.js** 18+ (20+ recommended)
- **npm** (bundled with Node.js)
- Supabase project + OpenAI API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/HEEESANGKIM/career-helper.git
cd career-helper
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment variables**

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
```

> Do **not** commit `.env.local`. The service role key and OpenAI key must stay server-side only.

4. **Run the dev server**
```bash
npm run dev
```

Open http://localhost:3000

5. **Production build (optional)**
```bash
npm run build
npm start
```

### Useful scripts
```bash
npm run lint          # ESLint
npm run data:seed     # Seed career reference data (optional)
```

---

## 7. API Overview

Server routes live under `app/api/`:

| Endpoint | Purpose |
|----------|---------|
| `/api/dashboard-insight` | Dashboard readiness and insight |
| `/api/cover-letter` | Cover letter generation |
| `/api/matching-real-jobs` | Live job search + fit scoring |
| `/api/job-favorites` | Save / list / delete favorite postings |
| `/api/personalized-hiring-simulator` | Hiring Simulator session data |
| `/api/personalized-next-move` | Next Move recommendations |
| `/api/evaluate/*` | Career readiness, hiring manager, background check |
| `/api/account/delete` | Full account + data deletion |

---

## 8. Bug Tracking

We use **GitHub Issues**:

- **Issues:** https://github.com/HEEESANGKIM/career-helper/issues

**To report a bug**
1. Open the **Issues** tab.
2. Click **New Issue**.
3. Include steps to reproduce, expected vs actual behavior, and screenshots if UI-related.
4. Add a label when possible (`bug`, `ui`, `ai-api`, etc.).

---

## License

Private academic / project repository. All rights reserved by the team unless stated otherwise.

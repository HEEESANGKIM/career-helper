# [Path Mate.ai DEMO]

## 1. Problem Statement 
**Target Customers:** Graduating college students, job seekers facing difficulties in the employment market, and high school or early university students planning their future career paths.

**The Problem:** In an oversaturated job market, candidates often struggle to identify positions that realistically match their specific qualifications (e.g., GPA, certifications, or internships). 
Furthermore,optimizing portfolios for high-reaching goals remains a high-barrier task for many individuals.

**The Solution:** Our web application provides a comprehensive career management solution. By leveraging personal data as AI prompts, the system filters for "realistic" job openings and offers advanced AI analysis. 
And a **Portfolio Optimizer** that generates tailored cover letter drafts and suggests improvements for competitive applications.

---

## 2. Key Features (A-Project Requirements) (Temporary)
-**Advanced AI Analysis (OpenAI GPT-4o mini):** Utilizes GPT-4o mini for high-performance natural language processing to generate tailored cover letters and provide strategic portfolio feedback.
- **Media Interaction:** Users can upload and manage resume files, portfolios.
- **Personalized Recommendations:** Realistic job matching based on user-inputted data (Education, Experience, Certifications).
- **Secure Authentication:** Robust login system using **Google OAuth** for secure user data management.
- **Dual-User Roles:**
  - **Standard User:** Manage profiles, search for jobs, and receive AI feedback.
  - **Admin:** Manage site content, monitor AI performance, and update job databases.
- **Responsive Design:** Fully optimized for both desktop and mobile browsers.

---

## 3. Team Members

- **Dohyeon Lee** - GitHub: @[DohyeonLee0] / dohyeon.lee@stonybrook.edu
- **Heesang Kim** - GitHub: @[HEEESANGKIM] / heesang.kim@stonybrook.edu

---

## 4. Tech Stack & Tools (Temporary)
- **Frontend:** Next.js (React)
- **Backend/Database:** Supabase, Vercel
- **Authentication:** Google OAuth
- **AI Engine:** OpenAI API (**GPT-4o mini** for LLM)
- **Project Management:** [Jira Software](https://sbucse416.atlassian.net/jira/software/projects/CH/boards/1?visitedUserSeg=true)

---

## 5. Deployment (Beta)

- **Beta Site URL:** (https://career-helper-dun.vercel.app/)
- **Deployment Platform:** Vercel (Frontend & Serverless Functions)
- **Database Hosting:** Supabase Cloud

### Vercel environment variables

In [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**, set **exactly** these names (values from Supabase / OpenAI dashboards). Apply to **Production**, **Preview**, and **Development** as needed.

| Name | Required | Notes |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `service_role` key — **server only**, never expose to the browser |
| `OPENAI_API_KEY` | Yes | OpenAI secret key — **server only** |

---

## 6. How to Run and View the Project

> **Supported OS:** **Windows (Confirmed)**. Others (macOS, Linux) are currently under testing for compatibility.
This project is built with **Next.js 16**, **React 19**, and **Tailwind CSS 4**. To view the front-end web pages and the UI mockups implemented in code, follow the steps below.

### Prerequisites
- **Node.js**: v18.x or later.
- **npm**: Included with your Node.js installation.

### Installation & Setup

1. Clone the repository:
```bash
git clone [https://github.com/HEEESANGKIM/career-helper.git]
cd career-helper
```

2. Install dependencies:
```bash
npm install
```

3. Environment Variables:
Copy `.env.example` to `.env.local` and fill in values (no spaces around `=`):
```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
```

`SUPABASE_SERVICE_ROLE_KEY` is required for Live Job matching, cover letters, job alerts, and other server APIs. Use the same four variables on Vercel (see **§5 Deployment**).

4. Building and Running:

-To Run Development Server:
```bash
npm run dev
Access the app at http://localhost:3000.
```

-To Build for Production:
```bash
npm run build
```

## 7. Bug Tracking and Reporting
We use **GitHub Issues** to track all bugs and feature requests.

- **View Outstanding Bugs:** [https://github.com/HEEESANGKIM/career-helper/issues]

- **How to Report a Bug:**
  1. Go to the **Issues** tab in this repository.
  2. Click the **New Issue** button.
  3. Provide a clear title and describe:
     - Steps to reproduce the bug.
     - Expected behavior vs. Actual result.
     - (Optional) Screenshots for UI-related issues.
  4. Assign a label (e.g., `bug`, `ui`, `ai-api`) if applicable.




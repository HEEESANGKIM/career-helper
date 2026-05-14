# PathMate.ai Career Intelligence Data

This folder contains the safe demo data pipeline for Career Chess, Hiring Manager Simulator, and dashboard career readiness scoring.

## Safety and Legal Notes

- No unauthorized scraping is used.
- Do not scrape LinkedIn, Blind, Glassdoor, Reddit, or any site that requires login or blocks scraping.
- Synthetic profiles are fictional and use IDs like `Candidate_0001`.
- Synthetic profiles are not LinkedIn data and must never be described as real user data.
- Salary and career outcomes are estimates for an undergraduate project demo, not exact predictions.

## Data Sources Supported

- O*NET occupation files for skills, tasks, knowledge, and occupation frameworks.
- BLS OEWS wage/employment files for salary and labor-market estimates.
- DOL/OFLC H-1B LCA disclosure files for employer/job/geography examples.
- Optional manually downloaded Kaggle job posting CSV files.

## Folder Structure

- `data/raw/onet`: Place O*NET `.txt` or `.csv` files here.
- `data/raw/bls_oews`: Place BLS OEWS `.csv` exports here. XLSX can be manually exported to CSV first.
- `data/raw/h1b`: Place OFLC LCA disclosure `.csv` files here.
- `data/raw/job_postings`: Place optional Kaggle job posting `.csv` files here.
- `data/processed`: Normalized public-data-derived outputs.
- `data/seed`: App-ready career templates and fictional synthetic profiles.
- `scripts/data`: Processing, generation, and seed scripts.

## Where To Download

- O*NET: https://www.onetcenter.org/database.html
- BLS OEWS: https://www.bls.gov/oes/tables.htm
- DOL/OFLC LCA disclosure: https://www.dol.gov/agencies/eta/foreign-labor/performance
- Kaggle: manually download datasets you are allowed to use and place CSV files in `data/raw/job_postings`.

## Commands

```bash
npm run data:onet
npm run data:bls
npm run data:h1b
npm run data:templates
npm run data:synthetic
npm run data:seed
```

`data:synthetic` generates fictional profiles. If `OPENAI_API_KEY` is missing, it creates deterministic synthetic fallback profiles so the demo remains usable.

## Generated Outputs

- `data/processed/roles.json`
- `data/processed/role_skills.json`
- `data/processed/salary_bands.json`
- `data/processed/career_risks.json`
- `data/processed/company_examples.json`
- `data/processed/job_posting_patterns.json`
- `data/seed/career_templates.json`
- `data/seed/synthetic_career_profiles.json`

## App Usage

The shared career intelligence layer in `lib/career-data.ts` exposes:

- role templates
- role skill requirements
- salary bands
- beginner-friendly career paths
- promotion timelines
- common risks
- interview focus areas
- 90-day preparation plans
- synthetic early-career examples

This layer is used by Career Chess, Hiring Manager Simulator, and dashboard readiness scoring.

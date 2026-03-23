export type JobPosting = {
  id: string;
  title: string;
  company: string;
  minGpa: number;
  requiredSkills: string[];
  preferredCerts: string[];
  internshipPreferred: boolean;
};

export const demoJobs: JobPosting[] = [
  {
    id: "job-frontend-1",
    title: "Frontend Developer (Junior)",
    company: "Seoul Tech Labs",
    minGpa: 3.0,
    requiredSkills: ["react", "typescript", "javascript", "html", "css"],
    preferredCerts: ["sqld"],
    internshipPreferred: true,
  },
  {
    id: "job-data-1",
    title: "Data Analyst (Entry)",
    company: "Insight Factory",
    minGpa: 3.2,
    requiredSkills: ["sql", "python", "excel"],
    preferredCerts: ["adsp", "sqld"],
    internshipPreferred: false,
  },
  {
    id: "job-backend-1",
    title: "Backend Engineer (Junior)",
    company: "Cloud API Inc.",
    minGpa: 2.8,
    requiredSkills: ["node", "typescript", "sql", "api"],
    preferredCerts: ["정보처리기사"],
    internshipPreferred: true,
  },
];

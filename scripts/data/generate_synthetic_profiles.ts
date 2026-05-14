import OpenAI from "openai";
import templates from "../../data/seed/career_templates.json";
import { writeJson } from "./utils";

type SyntheticProfile = {
  profile_id: string;
  education_background: string;
  major: string;
  starting_status: string;
  skills: string[];
  internships: string[];
  projects: string[];
  target_role: string;
  target_industry: string;
  risk_tolerance: string;
  constraints: string[];
  year_0_state: string;
  year_1_state: string;
  year_2_state: string;
  year_3_state: string;
  year_5_state: string;
  key_decisions: string[];
  risk_events: string[];
  outcome_label: string;
  salary_range_estimate: string;
  skill_growth: string[];
  notes: string;
};

const count = Number(process.env.SYNTHETIC_PROFILE_COUNT || 500);
const batchSize = 25;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function validateProfile(value: unknown): value is SyntheticProfile {
  const item = value as SyntheticProfile;
  return Boolean(
    item?.profile_id &&
      item.profile_id.startsWith("Candidate_") &&
      item.target_role &&
      Array.isArray(item.skills) &&
      Array.isArray(item.projects) &&
      item.notes?.toLowerCase().includes("fictional"),
  );
}

function fallbackProfile(index: number): SyntheticProfile {
  const template = (templates as Array<{ role: string; required_skills?: string[]; recommended_projects?: string[]; salary_band?: { entry?: string } }>)[index % (templates as unknown[]).length];
  const id = `Candidate_${String(index + 1).padStart(4, "0")}`;
  return {
    profile_id: id,
    education_background: index % 3 === 0 ? "public university undergraduate" : index % 3 === 1 ? "community college transfer" : "bootcamp / certificate learner",
    major: index % 2 === 0 ? "Computer Science" : "Business or Design",
    starting_status: index % 4 === 0 ? "student" : index % 4 === 1 ? "new graduate" : index % 4 === 2 ? "intern" : "career switcher",
    skills: template.required_skills?.slice(0, 4) ?? ["communication", "analysis", "documentation"],
    internships: index % 2 === 0 ? ["small company internship"] : [],
    projects: template.recommended_projects?.slice(0, 2) ?? ["role-specific portfolio project"],
    target_role: template.role,
    target_industry: index % 2 === 0 ? "technology" : "business services",
    risk_tolerance: index % 3 === 0 ? "low" : index % 3 === 1 ? "medium" : "high",
    constraints: ["limited professional experience", "needs beginner-friendly roles"],
    year_0_state: "builds role-specific proof and applies to entry-level roles",
    year_1_state: "lands first role or internship and builds repeatable work habits",
    year_2_state: "owns small projects and closes top skill gaps",
    year_3_state: "moves toward stronger role scope",
    year_5_state: "targets mid-level or specialist path",
    key_decisions: ["portfolio focus", "mock interview practice", "broad applications"],
    risk_events: ["weak portfolio", "interview failure", "skill mismatch"],
    outcome_label: index % 3 === 0 ? "safe_route" : index % 3 === 1 ? "growth_route" : "credential_route",
    salary_range_estimate: template.salary_band?.entry ? `USD ${template.salary_band.entry} entry` : "estimate unavailable",
    skill_growth: template.required_skills?.slice(0, 3) ?? ["role skills", "communication"],
    notes: "Fictional synthetic demo profile. Not based on LinkedIn or scraped personal data.",
  };
}

async function generateBatch(start: number, size: number) {
  if (!openai) return Array.from({ length: size }, (_, offset) => fallbackProfile(start + offset));

  const prompt = [
    "Create realistic but clearly fictional early-career trajectories for PathMate.ai.",
    "Do not use real names. Use profile_id values like Candidate_0001. Do not claim LinkedIn data.",
    "Return JSON only: {\"profiles\":[...]}",
    "Each profile must include: profile_id, education_background, major, starting_status, skills, internships, projects, target_role, target_industry, risk_tolerance, constraints, year_0_state, year_1_state, year_2_state, year_3_state, year_5_state, key_decisions, risk_events, outcome_label, salary_range_estimate, skill_growth, notes.",
    `Generate ${size} profiles starting at Candidate_${String(start + 1).padStart(4, "0")}. Cover these roles: ${(templates as Array<{ role: string }>).map((template) => template.role).join(", ")}.`,
  ].join("\n");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await openai.responses.create({
      model: process.env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.7,
    });
    const text = response.output_text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) continue;
    const parsed = JSON.parse(match[0]) as { profiles?: unknown[] };
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles.filter(validateProfile) : [];
    if (profiles.length === size) return profiles;
  }

  return Array.from({ length: size }, (_, offset) => fallbackProfile(start + offset));
}

async function main() {
  const profiles: SyntheticProfile[] = [];
  for (let start = 0; start < count; start += batchSize) {
    const size = Math.min(batchSize, count - start);
    profiles.push(...(await generateBatch(start, size)));
    console.log(`Generated ${profiles.length}/${count} synthetic fictional profiles`);
  }

  writeJson("data/seed/synthetic_career_profiles.json", profiles);
  console.log("Wrote data/seed/synthetic_career_profiles.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

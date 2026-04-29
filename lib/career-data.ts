import careerTemplatesSeed from "@/data/seed/career_templates.json";
import syntheticProfilesSeed from "@/data/seed/synthetic_career_profiles.json";

export type LanguageMode = "ko" | "en";

export type CareerTemplate = {
  role: string;
  roleKo: string;
  category: string;
  categoryKo: string;
  beginner_entry_points: string[];
  beginner_entry_points_ko: string[];
  required_skills: string[];
  required_skills_ko: string[];
  recommended_projects: string[];
  recommended_projects_ko: string[];
  common_first_jobs: string[];
  common_first_jobs_ko: string[];
  promotion_timeline: string[];
  promotion_timeline_ko: string[];
  salary_band: {
    currency: string;
    entry: string;
    mid: string;
    source: string;
  };
  common_risks: string[];
  common_risks_ko: string[];
  interview_focus: string[];
  interview_focus_ko: string[];
  ninety_day_plan: string[];
  ninety_day_plan_ko: string[];
  path_templates: Record<string, string>;
};

export type SyntheticCareerProfile = {
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

const templates = careerTemplatesSeed as CareerTemplate[];
const syntheticProfiles = syntheticProfilesSeed as SyntheticCareerProfile[];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

export function getCareerTemplates() {
  return templates;
}

export function getSyntheticProfiles() {
  return syntheticProfiles;
}

export function getRoleNames(language: LanguageMode) {
  return templates.map((template) => (language === "en" ? template.role : template.roleKo));
}

export function findCareerTemplate(role: string | null | undefined) {
  const query = normalize(role || "");
  if (!query) return templates[0];

  return (
    templates.find((template) => {
      const names = [template.role, template.roleKo, ...template.common_first_jobs, ...template.common_first_jobs_ko];
      return names.some((name) => normalize(name).includes(query) || query.includes(normalize(name)));
    }) ?? templates[0]
  );
}

export function localizeTemplate(template: CareerTemplate, language: LanguageMode) {
  return {
    role: language === "en" ? template.role : template.roleKo,
    category: language === "en" ? template.category : template.categoryKo,
    beginnerEntryPoints: language === "en" ? template.beginner_entry_points : template.beginner_entry_points_ko,
    requiredSkills: language === "en" ? template.required_skills : template.required_skills_ko,
    recommendedProjects: language === "en" ? template.recommended_projects : template.recommended_projects_ko,
    commonFirstJobs: language === "en" ? template.common_first_jobs : template.common_first_jobs_ko,
    promotionTimeline: language === "en" ? template.promotion_timeline : template.promotion_timeline_ko,
    salaryBand: template.salary_band,
    commonRisks: language === "en" ? template.common_risks : template.common_risks_ko,
    interviewFocus: language === "en" ? template.interview_focus : template.interview_focus_ko,
    ninetyDayPlan: language === "en" ? template.ninety_day_plan : template.ninety_day_plan_ko,
    pathTemplates: template.path_templates,
  };
}

export function getRoleSkillRequirements(role: string, language: LanguageMode) {
  return localizeTemplate(findCareerTemplate(role), language).requiredSkills;
}

export function getRelatedSyntheticProfiles(role: string, limit = 8) {
  const template = findCareerTemplate(role);
  const target = normalize(template.role);
  return syntheticProfiles.filter((profile) => normalize(profile.target_role).includes(target) || target.includes(normalize(profile.target_role))).slice(0, limit);
}

export function calculateSkillMatch(userSkillText: string | null | undefined, template: CareerTemplate) {
  const userText = normalize(userSkillText || "");
  const required = template.required_skills;
  if (!required.length) return 0;
  const matched = required.filter((skill) => userText.includes(normalize(skill).split(" ")[0])).length;
  return Math.round((matched / required.length) * 100);
}

export const careerDataCopy = {
  en: "Powered by public labor-market data, role skill frameworks, and synthetic career simulations.",
  ko: "공개 노동시장 데이터, 직무 역량 프레임워크, 합성 커리어 시뮬레이션을 기반으로 합니다.",
};

import templates from "../../data/seed/career_templates.json";
import salaryBands from "../../data/processed/salary_bands.json";
import roleSkills from "../../data/processed/role_skills.json";
import risks from "../../data/processed/career_risks.json";
import { writeJson } from "./utils";

const built = (templates as Array<Record<string, unknown>>).map((template) => {
  const role = String(template.role);
  const salary = (salaryBands as Array<Record<string, unknown>>).find((item) => item.role === role);
  const skills = (roleSkills as Array<{ role: string; skills: string[] }>).find((item) => item.role === role);
  return {
    ...template,
    required_skills: skills?.skills ?? template.required_skills,
    salary_band: salary ?? template.salary_band,
    shared_risk_events: risks,
  };
});

writeJson("data/seed/career_templates.json", built);
console.log(`Built ${built.length} shared career templates.`);

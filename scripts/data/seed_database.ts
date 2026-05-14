import { createClient } from "@supabase/supabase-js";
import templates from "../../data/seed/career_templates.json";
import profiles from "../../data/seed/synthetic_career_profiles.json";
import salaryBands from "../../data/processed/salary_bands.json";
import risks from "../../data/processed/career_risks.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.log("Supabase env vars missing. Skipping database seed.");
  process.exit(0);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  const templateRows = (templates as Array<Record<string, unknown>>).map((template) => ({
    role_key: String(template.role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    role_name: template.role,
    template_json: template,
    language: "en",
  }));

  await supabase.from("career_templates").upsert(templateRows, { onConflict: "role_key" });
  await supabase.from("salary_bands").upsert(
    (salaryBands as Array<Record<string, unknown>>).map((band) => ({
      role: band.role,
      salary_json: band,
      source: band.source,
    })),
    { onConflict: "role" },
  );
  await supabase.from("public_role_stats").upsert(
    (templates as Array<Record<string, unknown>>).map((template) => ({
      role: template.role,
      stats_json: {
        category: template.category,
        skills: template.required_skills,
        risks,
        salary_band: template.salary_band,
      },
      source: "O*NET/BLS/curated seed blend",
    })),
    { onConflict: "role" },
  );
  await supabase.from("synthetic_career_profiles").upsert(
    (profiles as Array<Record<string, unknown>>).map((profile) => ({
      profile_id: profile.profile_id,
      target_role: profile.target_role,
      profile_json: profile,
      source: "gpt_or_deterministic_synthetic_fictional",
    })),
    { onConflict: "profile_id" },
  );

  console.log(`Seeded ${templateRows.length} templates and ${(profiles as unknown[]).length} synthetic profiles.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

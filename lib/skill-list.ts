const SKILL_SPLIT_PATTERN = /[,;\n]+/;

export function parseSkillList(...sources: Array<string | null | undefined>) {
  return sources
    .map((source) => String(source ?? "").trim())
    .filter(Boolean)
    .flatMap((source) => source.split(SKILL_SPLIT_PATTERN))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeSkillList(...sources: Array<string | null | undefined>) {
  return parseSkillList(...sources).join(", ");
}

type ProfileSkillSource = {
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
};

export function parseProfileSkills(profile: ProfileSkillSource | null | undefined) {
  if (!profile) return [];

  const fromPrimaryFields = parseSkillList(profile.core_skills, profile.tech_stack);
  if (fromPrimaryFields.length > 0) return fromPrimaryFields;

  const hasExplicitSkillFields =
    profile.core_skills !== null &&
    profile.core_skills !== undefined &&
    profile.tech_stack !== null &&
    profile.tech_stack !== undefined;

  if (hasExplicitSkillFields) return [];

  return parseSkillList(profile.skills);
}

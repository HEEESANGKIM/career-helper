import { parsePortfolioLinks } from "@/lib/portfolio-links";
import { parseSkillList } from "@/lib/skill-list";

export type ProfileFormInput = {
  full_name: string;
  school_name: string;
  school_type: string;
  education_level: string;
  major: string;
  sub_major: string;
  graduation_status: string;
  graduation_date: string;
  gpa_score: string;
  gpa_scale: string;
  core_skills: string;
  tech_stack: string;
  internship_count: string;
  project_count: string;
  role_certifications: string;
  language_test_name: string;
  language_test_score: string;
  other_certifications: string;
  target_role: string;
  target_industry: string;
  preferred_location: string;
  desired_companies: string;
  portfolio_url: string;
  experience_summary: string;
};

export type ProfileDbInput = {
  full_name?: string | null;
  school_name?: string | null;
  school_type?: string | null;
  education_level?: string | null;
  major?: string | null;
  sub_major?: string | null;
  graduation_status?: string | null;
  gpa_score?: number | null;
  gpa_scale?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
  target_industry?: string | null;
  preferred_location?: string | null;
  desired_companies?: string | null;
  role_certifications?: string | null;
  other_certifications?: string | null;
  language_test_name?: string | null;
  language_test_score?: string | null;
  portfolio_url?: string | null;
  experience_summary?: string | null;
  graduation_date?: string | null;
};

export type LanguageMode = "ko" | "en";

export type ProfileValidationField =
  | "full_name"
  | "school_name"
  | "school_type"
  | "education_level"
  | "major"
  | "sub_major"
  | "graduation_status"
  | "graduation_date"
  | "gpa_score"
  | "gpa_scale"
  | "internship_count"
  | "project_count"
  | "target_role"
  | "target_industry"
  | "preferred_location"
  | "desired_companies"
  | "portfolio_url"
  | "core_skills"
  | "tech_stack"
  | "role_certifications"
  | "other_certifications"
  | "language_test_name"
  | "language_test_score"
  | "experience_summary";

/** Name through Career Interests — required to save. */
export const REQUIRED_PROFILE_FIELDS: ProfileValidationField[] = [
  "full_name",
  "school_name",
  "school_type",
  "education_level",
  "major",
  "graduation_status",
  "graduation_date",
  "gpa_score",
  "internship_count",
  "project_count",
  "target_role",
  "target_industry",
  "core_skills",
  "tech_stack",
];

/** All profile areas on Settings — optional fields count only when filled and valid. */
export const COMPLETION_FIELDS: ProfileValidationField[] = [
  "full_name",
  "school_name",
  "school_type",
  "education_level",
  "major",
  "sub_major",
  "graduation_status",
  "graduation_date",
  "gpa_score",
  "gpa_scale",
  "internship_count",
  "project_count",
  "target_role",
  "target_industry",
  "preferred_location",
  "desired_companies",
  "portfolio_url",
  "core_skills",
  "tech_stack",
  "role_certifications",
  "other_certifications",
  "language_test_name",
  "language_test_score",
  "experience_summary",
];

export const isRequiredProfileField = (field: ProfileValidationField) => REQUIRED_PROFILE_FIELDS.includes(field);

/** Settings UI: GPA scale is required alongside GPA score. */
export const isRequiredFormFieldKey = (field: keyof ProfileFormInput) =>
  isRequiredProfileField(field as ProfileValidationField) || field === "gpa_scale";

export const AI_REVIEW_FIELDS: ProfileValidationField[] = [
  "full_name",
  "school_name",
  "school_type",
  "education_level",
  "major",
  "graduation_status",
  "target_role",
  "target_industry",
];

export const getAiReviewFields = (form: ProfileFormInput): ProfileValidationField[] => {
  const fields: ProfileValidationField[] = [...AI_REVIEW_FIELDS];
  if (cleanText(form.experience_summary).length >= 30) {
    fields.push("experience_summary");
  }
  return fields;
};

const GENERIC_ROLES = new Set([
  "developer",
  "engineer",
  "manager",
  "intern",
  "student",
  "job",
  "work",
  "개발자",
  "엔지니어",
  "인턴",
  "취업",
  "학생",
]);

const KEYBOARD_PATTERNS = [/^(asdf|qwer|zxcv|test|aaa+|bbb+|111+|abc|123)+$/i];

const ALLOWED_GPA_SCALES = new Set([4, 4.3, 4.5]);

export const GPA_SCALE_OPTIONS = [
  { value: "4", label: "4.0" },
  { value: "4.3", label: "4.3" },
  { value: "4.5", label: "4.5" },
] as const;

export const normalizeGpaScaleValue = (scale: number | null | undefined) => {
  const text = scale != null ? String(scale) : "4.5";
  return GPA_SCALE_OPTIONS.some((option) => option.value === text) ? text : "4.5";
};

type MessageKey =
  | "required"
  | "nameInvalid"
  | "textTooShort"
  | "gibberish"
  | "gpaScaleInvalid"
  | "gpaScoreInvalid"
  | "gpaScoreExceedsScale"
  | "countInvalid"
  | "skillsTooFew"
  | "skillTooShort"
  | "targetRoleGeneric"
  | "targetRoleTooShort"
  | "urlInvalid"
  | "summaryTooShort"
  | "dateInvalid";

const MESSAGES: Record<MessageKey, { ko: string; en: string }> = {
  required: { ko: "필수 입력 항목입니다.", en: "This field is required." },
  nameInvalid: { ko: "이름 형식이 올바르지 않습니다.", en: "Enter a valid name." },
  textTooShort: { ko: "내용이 너무 짧습니다.", en: "This entry is too short." },
  gibberish: { ko: "의미 있는 내용을 입력해 주세요.", en: "Enter meaningful text." },
  gpaScaleInvalid: { ko: "GPA 만점은 4.0, 4.3, 4.5 중 하나를 선택해 주세요.", en: "Select a GPA scale of 4.0, 4.3, or 4.5." },
  gpaScoreInvalid: { ko: "GPA 점수가 올바르지 않습니다.", en: "Enter a valid GPA score." },
  gpaScoreExceedsScale: { ko: "GPA 점수는 만점을 초과할 수 없습니다.", en: "GPA score cannot exceed the scale." },
  countInvalid: { ko: "0에서 99 사이의 숫자를 입력해 주세요.", en: "Enter a number between 0 and 99." },
  skillsTooFew: { ko: "스킬을 2개 이상 입력해 주세요.", en: "Add at least two skills." },
  skillTooShort: { ko: "각 스킬은 2자 이상이어야 합니다.", en: "Each skill must be at least 2 characters." },
  targetRoleGeneric: { ko: "목표 직무를 더 구체적으로 입력해 주세요.", en: "Make your target role more specific." },
  targetRoleTooShort: { ko: "목표 직무가 너무 짧습니다.", en: "Target role is too short." },
  urlInvalid: { ko: "http:// 또는 https:// 로 시작하는 URL을 입력해 주세요.", en: "Enter a valid URL starting with http:// or https://." },
  summaryTooShort: { ko: "경험 요약은 30자 이상 입력해 주세요.", en: "Experience summary must be at least 30 characters." },
  dateInvalid: { ko: "유효한 날짜를 입력해 주세요.", en: "Enter a valid date." },
};

export const validationMessage = (key: MessageKey, language: LanguageMode) => (language === "en" ? MESSAGES[key].en : MESSAGES[key].ko);

const cleanText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const isRequiredField = (field: ProfileValidationField) => REQUIRED_PROFILE_FIELDS.includes(field);

const isRepeatedChar = (value: string) => {
  if (value.length < 3) return false;
  const chars = value.replace(/\s/g, "");
  if (!chars.length) return false;
  const topCount = [...chars].reduce<Record<string, number>>((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(topCount));
  return max / chars.length > 0.7;
};

const isLatinHeavyText = (value: string) => {
  const letters = value.replace(/[^a-zA-Z]/g, "");
  const allChars = value.replace(/\s/g, "");
  return letters.length >= 12 && letters.length / allChars.length >= 0.7;
};

const countVowels = (letters: string) => (letters.match(/[aeiouAEIOUyY]/gi) ?? []).length;

const hasImprobableLetterRuns = (value: string) => {
  const lettersOnly = value.replace(/[^a-zA-Z\s]/g, " ");
  return /[^aeiouAEIOUyY\s]{5,}/i.test(lettersOnly);
};

const lacksNaturalWordStructure = (value: string) => {
  if (/[\u3131-\uD79D\uAC00-\uD7AF]/.test(value)) return false;
  if (/[.!?]/.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return false;
  const longestWord = words[0] ?? value;
  return longestWord.length >= 35;
};

export const isGibberishText = (value: string) => {
  const text = cleanText(value);
  if (text.length < 2) return true;
  if (/^\d+$/.test(text)) return true;
  if (KEYBOARD_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (isRepeatedChar(text)) return true;
  if (/(.)\1{4,}/i.test(text.replace(/\s/g, ""))) return true;
  if (text.length >= 12) {
    const chars = text.replace(/\s/g, "");
    if (new Set(chars.toLowerCase()).size <= 2) return true;
  }
  if (isLatinHeavyText(text)) {
    const letters = text.replace(/[^a-zA-Z]/g, "");
    const vowelCount = countVowels(letters);
    const vowelRatio = vowelCount / letters.length;
    if (vowelRatio < 0.18 || vowelRatio > 0.62) return true;
    if (hasImprobableLetterRuns(text)) return true;
  }
  if (text.length >= 30 && lacksNaturalWordStructure(text)) return true;
  return false;
};

const isValidName = (value: string) => {
  const text = cleanText(value);
  if (text.length < 2 || text.length > 80) return false;
  if (/^\d+$/.test(text)) return false;
  return /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(text);
};

const isValidHttpUrl = (value: string) => /^https?:\/\/.+/i.test(cleanText(value));

const parseCount = (value: string) => {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const validateGpa = (scoreRaw: string, scaleRaw: string, language: LanguageMode) => {
  const errors: Partial<Record<ProfileValidationField, string>> = {};
  const scoreText = cleanText(scoreRaw);
  const scaleText = cleanText(scaleRaw);

  if (!scoreText) {
    if (isRequiredField("gpa_score")) {
      errors.gpa_score = validationMessage("required", language);
    }
    return errors;
  }

  const score = Number(scoreText);
  const scale = Number(scaleText || "4.5");

  if (!Number.isFinite(score) || score < 0) {
    errors.gpa_score = validationMessage("gpaScoreInvalid", language);
  }

  if (!ALLOWED_GPA_SCALES.has(scale)) {
    errors.gpa_scale = validationMessage("gpaScaleInvalid", language);
  }

  if (!errors.gpa_score && !errors.gpa_scale && score > scale) {
    errors.gpa_score = validationMessage("gpaScoreExceedsScale", language);
  }

  return errors;
};

const validateSkillsField = (value: string, language: LanguageMode, required: boolean) => {
  const skills = parseSkillList(value);
  if (skills.length === 0) return required ? validationMessage("required", language) : undefined;
  if (skills.length < 2) {
    return validationMessage("skillsTooFew", language);
  }
  if (skills.some((skill) => skill.length < 2 || isGibberishText(skill))) {
    return validationMessage("skillTooShort", language);
  }
  if (skills.every((skill) => /^\d+$/.test(skill))) {
    return validationMessage("gibberish", language);
  }
  return undefined;
};

const validateTextField = (
  value: string,
  minLength: number,
  language: LanguageMode,
  required: boolean,
) => {
  const text = cleanText(value);
  if (!text) return required ? validationMessage("required", language) : undefined;
  if (text.length < minLength) return validationMessage("textTooShort", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

export const isGenericTargetRole = (value: string) => {
  const role = cleanText(value).toLowerCase();
  if (!role) return true;
  return GENERIC_ROLES.has(role);
};

const validateTargetRole = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return isRequiredField("target_role") ? validationMessage("required", language) : undefined;
  if (text.length < 3) return validationMessage("targetRoleTooShort", language);
  if (isGenericTargetRole(text)) return validationMessage("targetRoleGeneric", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

const validateOptionalUrl = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return undefined;
  if (!isValidHttpUrl(text)) return validationMessage("urlInvalid", language);
  return undefined;
};

const validatePortfolioLinksField = (value: string, language: LanguageMode) => {
  const links = parsePortfolioLinks(value);
  if (links.length === 0) return undefined;
  if (links.some((link) => !isValidHttpUrl(link))) return validationMessage("urlInvalid", language);
  return undefined;
};

const validateExperienceSummary = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return undefined;
  if (text.length < 30) return validationMessage("summaryTooShort", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

const validateLanguageScore = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return undefined;
  if (/^\d{1,4}([./]\d+)?$/.test(text)) return undefined;
  if (/^(level\s*)?[0-9]+(\.[0-9]+)?$/i.test(text)) return undefined;
  if (/^[A-Z]{1,3}[+-]?$/i.test(text)) return undefined;
  return validateTextField(value, 2, language, false);
};

const validateGraduationDate = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return isRequiredField("graduation_date") ? validationMessage("required", language) : undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return validationMessage("dateInvalid", language);
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 10 || year > currentYear + 10) return validationMessage("dateInvalid", language);
  return undefined;
};

const validateCountField = (value: string, field: ProfileValidationField, language: LanguageMode) => {
  const count = parseCount(value);
  if (count === null) {
    return isRequiredField(field) ? validationMessage("required", language) : validationMessage("countInvalid", language);
  }
  if (count < 0 || count > 99) return validationMessage("countInvalid", language);
  return undefined;
};

export const isCompletionFieldProvided = (field: ProfileValidationField, form: ProfileFormInput) => {
  switch (field) {
    case "gpa_score":
      return cleanText(form.gpa_score).length > 0;
    case "core_skills":
    case "tech_stack":
      return parseSkillList(form[field]).length > 0;
    case "portfolio_url":
      return parsePortfolioLinks(form.portfolio_url).length > 0;
    default:
      return cleanText(form[field as keyof ProfileFormInput]).length > 0;
  }
};

export const validateField = (
  field: ProfileValidationField,
  form: ProfileFormInput,
  language: LanguageMode,
): string | undefined => {
  const required = isRequiredField(field);

  switch (field) {
    case "full_name": {
      const text = cleanText(form.full_name);
      if (!text) return required ? validationMessage("required", language) : undefined;
      return isValidName(form.full_name) ? undefined : validationMessage("nameInvalid", language);
    }
    case "school_name":
      return validateTextField(form.school_name, 2, language, required);
    case "school_type":
      return validateTextField(form.school_type, 2, language, required);
    case "education_level":
      return validateTextField(form.education_level, 2, language, required);
    case "major":
      return validateTextField(form.major, 2, language, required);
    case "sub_major":
      return validateTextField(form.sub_major, 2, language, false);
    case "graduation_status":
      return validateTextField(form.graduation_status, 2, language, required);
    case "gpa_score":
    case "gpa_scale": {
      const gpaErrors = validateGpa(form.gpa_score, form.gpa_scale, language);
      return gpaErrors[field];
    }
    case "internship_count":
      return validateCountField(form.internship_count, field, language);
    case "project_count":
      return validateCountField(form.project_count, field, language);
    case "core_skills":
      return validateSkillsField(form.core_skills, language, isRequiredField("core_skills"));
    case "tech_stack":
      return validateSkillsField(form.tech_stack, language, isRequiredField("tech_stack"));
    case "target_role":
      return validateTargetRole(form.target_role, language);
    case "target_industry":
      return validateTextField(form.target_industry, 2, language, required);
    case "preferred_location":
      return validateTextField(form.preferred_location, 2, language, false);
    case "desired_companies":
      return validateTextField(form.desired_companies, 2, language, false);
    case "portfolio_url":
      return validatePortfolioLinksField(form.portfolio_url, language);
    case "role_certifications":
      return validateTextField(form.role_certifications, 2, language, false);
    case "other_certifications":
      return validateTextField(form.other_certifications, 2, language, false);
    case "language_test_name":
      return validateTextField(form.language_test_name, 2, language, false);
    case "language_test_score":
      return validateLanguageScore(form.language_test_score, language);
    case "experience_summary":
      return validateExperienceSummary(form.experience_summary, language);
    case "graduation_date":
      return validateGraduationDate(form.graduation_date, language);
    default:
      return undefined;
  }
};

export const isCompletionFieldValid = (field: ProfileValidationField, form: ProfileFormInput) => {
  if (REQUIRED_PROFILE_FIELDS.includes(field)) {
    return !validateField(field, form, "en");
  }
  return isCompletionFieldProvided(field, form) && !validateField(field, form, "en");
};

export const computeValidatedCompletion = (form: ProfileFormInput) => {
  const validated = COMPLETION_FIELDS.filter((field) => isCompletionFieldValid(field, form)).length;
  return Math.round((validated / COMPLETION_FIELDS.length) * 100);
};

const ALL_VALIDATED_FIELDS: ProfileValidationField[] = [...COMPLETION_FIELDS];

export const validateProfileForm = (form: ProfileFormInput, language: LanguageMode) => {
  const errors: Partial<Record<ProfileValidationField, string>> = {};
  for (const field of ALL_VALIDATED_FIELDS) {
    const message = validateField(field, form, language);
    if (message) errors[field] = message;
  }

  const validatedFields = COMPLETION_FIELDS.filter((field) => !errors[field] && isCompletionFieldValid(field, form));

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    validatedFields,
    completion: computeValidatedCompletion(form),
  };
};

export const profileRowToFormInput = (profile: ProfileDbInput | null | undefined): ProfileFormInput => ({
  full_name: cleanText(profile?.full_name),
  school_name: cleanText(profile?.school_name),
  school_type: cleanText(profile?.school_type),
  education_level: cleanText(profile?.education_level),
  major: cleanText(profile?.major),
  sub_major: cleanText(profile?.sub_major),
  graduation_status: cleanText(profile?.graduation_status),
  graduation_date: cleanText(profile?.graduation_date),
  gpa_score: profile?.gpa_score != null ? String(profile.gpa_score) : "",
  gpa_scale: normalizeGpaScaleValue(profile?.gpa_scale),
  core_skills: cleanText(profile?.core_skills),
  tech_stack: cleanText(profile?.tech_stack),
  internship_count: profile?.internship_count != null ? String(profile.internship_count) : "0",
  project_count: profile?.project_count != null ? String(profile.project_count) : "0",
  role_certifications: cleanText(profile?.role_certifications),
  language_test_name: cleanText(profile?.language_test_name),
  language_test_score: cleanText(profile?.language_test_score),
  other_certifications: cleanText(profile?.other_certifications),
  target_role: cleanText(profile?.target_role),
  target_industry: cleanText(profile?.target_industry),
  preferred_location: cleanText(profile?.preferred_location),
  desired_companies: cleanText(profile?.desired_companies),
  portfolio_url: cleanText(profile?.portfolio_url),
  experience_summary: cleanText(profile?.experience_summary),
});

export const countValidatedProfileFields = (profile: ProfileDbInput | null | undefined) => {
  const form = profileRowToFormInput(profile);
  return COMPLETION_FIELDS.filter((field) => isCompletionFieldValid(field, form)).length;
};

export const isRequiredProfileComplete = (profile: ProfileDbInput | ProfileFormInput | null | undefined) => {
  if (!profile) return false;
  const form = "school_type" in profile ? (profile as ProfileFormInput) : profileRowToFormInput(profile);
  return REQUIRED_PROFILE_FIELDS.every((field) => isCompletionFieldValid(field, form));
};

export const hasMinimumProfileForMatching = (profile: ProfileDbInput | null | undefined) =>
  isRequiredProfileComplete(profile);

export const minimumProfileMatchingMessage = (language: LanguageMode) =>
  language === "en"
    ? "Fill in all required profile fields in Settings (name through core skills and tech stack) before using Job Match."
    : "Job Match를 사용하려면 Settings에서 필수 프로필(이름~핵심 스킬·기술 스택)을 모두 입력해 주세요.";

import {
  isGenericTargetRole,
  isGibberishText,
  validationMessage,
  type LanguageMode,
} from "@/lib/profile-validation";

export type HiringSimulatorField = "targetRole" | "targetCompany" | "jobDescription";

export const MIN_HIRING_JOB_DESCRIPTION_LENGTH = 15;

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

const MESSAGES = {
  jobDescriptionTooShort: {
    ko: `공고 내용은 ${MIN_HIRING_JOB_DESCRIPTION_LENGTH}자 이상 구체적으로 입력해 주세요.`,
    en: `Enter at least ${MIN_HIRING_JOB_DESCRIPTION_LENGTH} specific characters for the job description.`,
  },
} as const;

const localMessage = (key: keyof typeof MESSAGES, language: LanguageMode) => MESSAGES[key][language];

export const validateHiringTargetRole = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return validationMessage("required", language);
  if (text.length < 3) return validationMessage("targetRoleTooShort", language);
  if (isGenericTargetRole(text)) return validationMessage("targetRoleGeneric", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

export const validateHiringTargetCompany = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return validationMessage("required", language);
  if (text.length < 2) return validationMessage("textTooShort", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

export const validateHiringJobDescription = (value: string, language: LanguageMode) => {
  const text = cleanText(value);
  if (!text) return validationMessage("required", language);
  if (text.length < MIN_HIRING_JOB_DESCRIPTION_LENGTH) return localMessage("jobDescriptionTooShort", language);
  if (isGibberishText(text)) return validationMessage("gibberish", language);
  return undefined;
};

export const validateHiringSimulatorSetup = (
  targetRole: string,
  targetCompany: string,
  jobDescription: string,
  language: LanguageMode,
) => {
  const errors: Partial<Record<HiringSimulatorField, string>> = {};
  const roleError = validateHiringTargetRole(targetRole, language);
  const companyError = validateHiringTargetCompany(targetCompany, language);
  const jobDescriptionError = validateHiringJobDescription(jobDescription, language);
  if (roleError) errors.targetRole = roleError;
  if (companyError) errors.targetCompany = companyError;
  if (jobDescriptionError) errors.jobDescription = jobDescriptionError;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const hiringSimulatorFieldLabel = (field: HiringSimulatorField, language: LanguageMode) => {
  if (field === "targetRole") return language === "en" ? "Target Role" : "목표 직무";
  if (field === "targetCompany") return language === "en" ? "Target Company" : "목표 회사";
  return language === "en" ? "Job Description Input" : "공고 내용 입력";
};

import { isGibberishText, type LanguageMode } from "@/lib/profile-validation";

export type CoverLetterField = "resumeText" | "jobDescription";

export const MIN_RESUME_TEXT_LENGTH = 40;
export const MIN_JOB_DESCRIPTION_LENGTH = 15;

const MESSAGES = {
  resumeRequired: {
    ko: "이력서 텍스트를 입력해 주세요.",
    en: "Enter resume text.",
  },
  resumeTooShort: {
    ko: `학력, 인턴, 프로젝트, 성과를 ${MIN_RESUME_TEXT_LENGTH}자 이상 구체적으로 적어 주세요.`,
    en: `Add at least ${MIN_RESUME_TEXT_LENGTH} characters of education, internships, projects, and outcomes.`,
  },
  jobDescriptionTooShort: {
    ko: `공고 설명을 넣을 때는 ${MIN_JOB_DESCRIPTION_LENGTH}자 이상 구체적으로 적어 주세요.`,
    en: `If you add a job description, use at least ${MIN_JOB_DESCRIPTION_LENGTH} specific characters.`,
  },
  gibberish: {
    ko: "의미 있는 내용을 입력해 주세요.",
    en: "Enter meaningful text.",
  },
} as const;

const message = (key: keyof typeof MESSAGES, language: LanguageMode) => MESSAGES[key][language];

export const validateCoverLetterResumeText = (value: string, language: LanguageMode) => {
  const text = value.trim();
  if (!text) return message("resumeRequired", language);
  if (text.length < MIN_RESUME_TEXT_LENGTH) return message("resumeTooShort", language);
  if (isGibberishText(text)) return message("gibberish", language);
  return undefined;
};

export const validateCoverLetterJobDescription = (value: string, language: LanguageMode) => {
  const text = value.trim();
  if (!text) return undefined;
  if (text.length < MIN_JOB_DESCRIPTION_LENGTH) return message("jobDescriptionTooShort", language);
  if (isGibberishText(text)) return message("gibberish", language);
  return undefined;
};

export const validateCoverLetterInput = (resumeText: string, jobDescription: string, language: LanguageMode) => {
  const errors: Partial<Record<CoverLetterField, string>> = {};
  const resumeError = validateCoverLetterResumeText(resumeText, language);
  const jobDescriptionError = validateCoverLetterJobDescription(jobDescription, language);
  if (resumeError) errors.resumeText = resumeError;
  if (jobDescriptionError) errors.jobDescription = jobDescriptionError;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const coverLetterFieldLabel = (field: CoverLetterField, language: LanguageMode) =>
  field === "resumeText"
    ? language === "en"
      ? "Resume Text"
      : "이력서 텍스트"
    : language === "en"
      ? "Target Role / Job Description"
      : "지원 직무/공고 설명";

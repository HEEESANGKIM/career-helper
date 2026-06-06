import { isGibberishText, type LanguageMode } from "@/lib/profile-validation";

export const MIN_INTERVIEW_ANSWER_LENGTH = 40;

const MESSAGES = {
  required: {
    ko: "답변을 입력해 주세요.",
    en: "Enter an answer.",
  },
  tooShort: {
    ko: `답변은 ${MIN_INTERVIEW_ANSWER_LENGTH}자 이상 작성해 주세요.`,
    en: `Write at least ${MIN_INTERVIEW_ANSWER_LENGTH} characters.`,
  },
  gibberish: {
    ko: "의미 있는 답변을 작성해 주세요. 상황, 행동, 결과를 구체적으로 적어야 분석할 수 있습니다.",
    en: "Write a meaningful answer with situation, action, and result so it can be analyzed.",
  },
} as const;

const message = (key: keyof typeof MESSAGES, language: LanguageMode) => MESSAGES[key][language];

export const validateInterviewAnswer = (value: string, language: LanguageMode) => {
  const text = value.trim();
  if (!text) return message("required", language);
  if (text.length < MIN_INTERVIEW_ANSWER_LENGTH) return message("tooShort", language);
  if (isGibberishText(text)) return message("gibberish", language);
  return undefined;
};

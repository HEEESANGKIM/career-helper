import { NextRequest, NextResponse } from "next/server";
import {
  getAiReviewFields,
  type LanguageMode,
  type ProfileFormInput,
  type ProfileValidationField,
  validationMessage,
} from "@/lib/profile-validation";
import { getUserIdFromRequest, parseLanguage, requestEvaluationJson } from "@/lib/evaluation-server";

export const runtime = "nodejs";

const FIELD_LABELS = {
  full_name: { en: "Full name", ko: "이름" },
  school_name: { en: "School name", ko: "학교명" },
  school_type: { en: "School type", ko: "학교 유형" },
  education_level: { en: "Year / education level", ko: "학년/학력" },
  major: { en: "Major", ko: "전공" },
  graduation_status: { en: "Graduation status / degree", ko: "졸업 상태/학위" },
  target_role: { en: "Target role", ko: "목표 직무" },
  target_industry: { en: "Career interests / industry", ko: "커리어 관심 분야" },
  experience_summary: { en: "Experience summary", ko: "경험 요약" },
};

const buildPrompt = (form: ProfileFormInput, language: LanguageMode) => {
  const reviewFields = getAiReviewFields(form);
  const lines = reviewFields.map((field) => {
    const label = FIELD_LABELS[field as keyof typeof FIELD_LABELS][language];
    return `- ${field} (${label}): ${form[field]}`;
  }).join("\n");

  return `You validate student profile fields. For each field, decide whether the value is a plausible, good-faith entry for that specific field.

Reject values that are:
- gibberish, keyboard mash, or repeated characters (e.g. "aaaaaaaaaa")
- placeholders, jokes, or clearly unrelated to the field label
- too generic for target_role (e.g. only "developer" or "student")

Accept real names, schools, majors, degrees, roles, and industries even if short, as long as they fit the field.

Fields:
${lines}

Return JSON only:
{
  "fields": {
    "field_key": { "ok": true },
    "field_key": { "ok": false, "reason": "short reason in ${language === "en" ? "English" : "Korean"}" }
  }
}`;
};

type AiFieldResult = { ok?: boolean; reason?: string };

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { form?: ProfileFormInput; language?: LanguageMode };
  try {
    body = (await request.json()) as { form?: ProfileFormInput; language?: LanguageMode };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const form = body.form;
  if (!form) {
    return NextResponse.json({ error: "Missing profile form." }, { status: 400 });
  }

  const language = parseLanguage(body.language);
  const parsed = await requestEvaluationJson(buildPrompt(form, language));

  if (!parsed) {
    return NextResponse.json({ valid: true, errors: {}, skipped: true });
  }

  const fields = (parsed as { fields?: Record<string, AiFieldResult> }).fields ?? {};
  const errors: Partial<Record<ProfileValidationField, string>> = {};

  for (const field of getAiReviewFields(form)) {
    const result = fields[field];
    if (result?.ok === false) {
      errors[field] = result.reason?.trim() || validationMessage("gibberish", language);
    }
  }

  return NextResponse.json({
    valid: Object.keys(errors).length === 0,
    errors,
    skipped: false,
  });
}

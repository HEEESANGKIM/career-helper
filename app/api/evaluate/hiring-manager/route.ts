import { NextRequest, NextResponse } from "next/server";
import {
  clampScore,
  cleanText,
  normalizeProbabilityPercent,
  getUserIdFromRequest,
  languageName,
  parseLanguage,
  requestEvaluationJson,
  saveEvaluation,
  saveFeatureRecord,
  validationError,
} from "@/lib/evaluation-server";
import { careerDataCopy, findCareerTemplate, localizeTemplate } from "@/lib/career-data";
import { validateInterviewAnswer } from "@/lib/interview-answer-validation";

export const runtime = "nodejs";

export type HiringManagerAnalysisSource = "openai" | "analysis_unavailable" | "answer_rejected";

const listOrEmpty = (value: unknown, max = 5) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, max);
};

const scoreOrNull = (value: unknown) => {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return clampScore(numeric);
};

const emptyAnalysisPayload = (source: HiringManagerAnalysisSource, error?: string) => ({
  source,
  error: error ?? null,
  overallScore: null,
  passProbability: null,
  categoryScores: null,
  strengths: [] as string[],
  weaknesses: [] as string[],
  recommendations: [] as string[],
  nextPracticeQuestion: null as string | null,
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const language = parseLanguage(body?.language);
  const selectedPersona = cleanText(body?.selectedPersona, 120);
  const companyStyle = cleanText(body?.companyStyle, 240);
  const evaluationFocus = cleanText(body?.evaluationFocus, 1600);
  const role = cleanText(body?.role, 120);
  const question = cleanText(body?.question, 700);
  const userAnswer = cleanText(body?.userAnswer, 7000);

  if (!selectedPersona || !role || !question || !userAnswer) {
    return validationError("selectedPersona, role, question, and userAnswer are required.");
  }

  const answerError = validateInterviewAnswer(userAnswer, language);
  if (answerError) {
    return NextResponse.json(
      {
        ...emptyAnalysisPayload("answer_rejected", answerError),
        weaknesses: [answerError],
      },
      { status: 400 },
    );
  }

  const roleTemplate = localizeTemplate(findCareerTemplate(role), language);
  const prompt = [
    "You are PathMate.ai, a career interview evaluator for students, new graduates, and early-career job seekers.",
    "Evaluate a candidate answer against a simulated role/company-style hiring persona.",
    "Do not claim the persona is a real hiring manager or represents the real company.",
    `Return JSON only in ${languageName(language)}.`,
    "Use conservative, evidence-based scoring.",
    "passProbability is an estimated practice signal (0-100 integer percent), NOT a real hiring probability.",
    "Return passProbability as an integer from 0 to 100 (example: 72 means 72%). Do NOT use 0-1 decimals.",
    "Adapt the evaluation criteria to the selected role and seniority.",
    "Evaluation rules:",
    "- Base every strength, weakness, recommendation, and score ONLY on evidence explicitly present in userAnswer.",
    "- Do NOT invent projects, metrics, companies, tools, or outcomes that are not in userAnswer.",
    "- Do NOT give generic praise (e.g. clear structure, role intent) unless the answer actually demonstrates it.",
    "- If the answer is vague, off-topic, repetitive, or too thin to evaluate, set strengths to [] and explain why in weaknesses.",
    "- If no genuine strength exists in the answer, strengths MUST be [].",
    "- Weaknesses and recommendations must reference the specific question and what is missing from userAnswer.",
    "- Score low (0-35) when the answer lacks substance, evidence, or relevance.",
    "Examples: HR roles emphasize communication, organization, and professionalism; sales roles emphasize persuasion, confidence, and objection handling; designer roles emphasize portfolio thinking, user empathy, and process explanation; developer roles emphasize technical reasoning, debugging, and architecture; analyst roles emphasize metrics, assumptions, and clear business reasoning.",
    "Schema:",
    `{
  "overallScore": number,
  "passProbability": number,
  "categoryScores": {
    "communication": number,
    "problemSolving": number,
    "roleFit": number,
    "companyFit": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[],
  "nextPracticeQuestion": string
}`,
    "",
    `selectedPersona: ${selectedPersona}`,
    `companyStyle: ${companyStyle}`,
    `role: ${role}`,
    `roleSpecificEvaluationFocus: ${evaluationFocus || "Infer appropriate entry-level criteria from the role, question, and answer."}`,
    `sharedCareerIntelligenceData: ${JSON.stringify({
      sourceNote: careerDataCopy[language],
      requiredSkills: roleTemplate.requiredSkills,
      interviewFocus: roleTemplate.interviewFocus,
      commonRisks: roleTemplate.commonRisks,
      recommendedProjects: roleTemplate.recommendedProjects,
      beginnerEntryPoints: roleTemplate.beginnerEntryPoints,
    })}`,
    `question: ${question}`,
    `userAnswer: ${userAnswer}`,
  ].join("\n");

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await requestEvaluationJson(prompt);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const unavailableMessage =
      language === "en"
        ? "AI analysis is unavailable right now. Check your connection or try again shortly."
        : "AI 분석을 사용할 수 없습니다. 연결을 확인하거나 잠시 후 다시 시도해 주세요.";
    return NextResponse.json(
      {
        ...emptyAnalysisPayload("analysis_unavailable", unavailableMessage),
      },
      { status: 503 },
    );
  }

  const category = (parsed.categoryScores ?? {}) as Record<string, unknown>;
  const overallScore = scoreOrNull(parsed.overallScore);
  const passProbability = normalizeProbabilityPercent(parsed.passProbability);

  if (overallScore == null || passProbability == null) {
    const unavailableMessage =
      language === "en"
        ? "AI returned an incomplete analysis. Please try again."
        : "AI 분석 결과가 불완전합니다. 다시 시도해 주세요.";
    return NextResponse.json(
      {
        ...emptyAnalysisPayload("analysis_unavailable", unavailableMessage),
      },
      { status: 503 },
    );
  }

  const categoryScores = {
    communication: scoreOrNull(category.communication) ?? 0,
    problemSolving: scoreOrNull(category.problemSolving) ?? 0,
    roleFit: scoreOrNull(category.roleFit) ?? 0,
    companyFit: scoreOrNull(category.companyFit) ?? 0,
  };

  const result = {
    overallScore,
    passProbability,
    categoryScores,
    strengths: listOrEmpty(parsed.strengths, 5),
    weaknesses: listOrEmpty(parsed.weaknesses, 5),
    recommendations: listOrEmpty(parsed.recommendations, 5),
    nextPracticeQuestion: cleanText(parsed.nextPracticeQuestion, 700) || null,
    roleData: {
      sourceNote: careerDataCopy[language],
      requiredSkills: roleTemplate.requiredSkills,
      interviewFocus: roleTemplate.interviewFocus,
      commonRisks: roleTemplate.commonRisks,
      recommendedProjects: roleTemplate.recommendedProjects,
      beginnerEntryPoints: roleTemplate.beginnerEntryPoints,
    },
  };

  const userId = await getUserIdFromRequest(request);
  const saved = await saveEvaluation({
    userId,
    featureType: "hiring-manager",
    input: { selectedPersona, companyStyle, role, evaluationFocus, roleTemplate, question, userAnswer },
    output: result,
    overallScore: result.overallScore,
    language,
  });

  await saveFeatureRecord({
    table: "interview_sessions",
    payload: {
      user_id: userId,
      persona_id: selectedPersona,
      role,
      company: companyStyle,
      question,
      answer: userAnswer,
      evaluation_id: saved?.id ?? null,
    },
  });

  return NextResponse.json({
    ...result,
    source: "openai" as const,
    evaluationId: saved?.id ?? null,
    savedAt: saved?.created_at ?? null,
  });
}

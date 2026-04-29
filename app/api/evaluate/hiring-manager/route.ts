import { NextRequest, NextResponse } from "next/server";
import {
  clampScore,
  cleanText,
  getUserIdFromRequest,
  languageName,
  parseLanguage,
  requestEvaluationJson,
  safeList,
  saveEvaluation,
  saveFeatureRecord,
  validationError,
} from "@/lib/evaluation-server";
import { careerDataCopy, findCareerTemplate, localizeTemplate } from "@/lib/career-data";

export const runtime = "nodejs";

const fallbackResult = (language: "ko" | "en", answer: string) => {
  const score = clampScore(42 + Math.min(35, answer.length / 18), 62);
  if (language === "en") {
    return {
      overallScore: score,
      passProbability: clampScore(score - 18, 45),
      categoryScores: {
        communication: clampScore(score + 3),
        problemSolving: clampScore(score - 2),
        roleFit: clampScore(score),
        companyFit: clampScore(score - 5),
      },
      strengths: ["Clear baseline structure", "Role intent is visible"],
      weaknesses: ["Needs sharper evidence and numbers", "Role-specific fit could be more explicit"],
      recommendations: ["Use STAR order", "Add one measurable outcome", "Name the tradeoff or judgment you considered"],
      nextPracticeQuestion: "Tell me about a time you adjusted your approach after receiving new constraints.",
    };
  }

  return {
    overallScore: score,
    passProbability: clampScore(score - 18, 45),
    categoryScores: {
      communication: clampScore(score + 3),
      problemSolving: clampScore(score - 2),
      roleFit: clampScore(score),
      companyFit: clampScore(score - 5),
    },
    strengths: ["기본 답변 구조가 명확합니다", "직무 의도가 드러납니다"],
    weaknesses: ["근거와 수치가 더 필요합니다", "직무별 평가 기준에 맞춘 설명을 더 구체화할 수 있습니다"],
    recommendations: ["STAR 순서로 정리하세요", "정량 성과를 하나 추가하세요", "고려한 판단 기준이나 선택지를 명시하세요"],
    nextPracticeQuestion: "새로운 제약 조건을 받고 접근 방식을 조정했던 경험을 말해 주세요.",
  };
};

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

  const fallback = fallbackResult(language, userAnswer);
  const roleTemplate = localizeTemplate(findCareerTemplate(role), language);
  const prompt = [
    "You are PathMate.ai, a career interview evaluator for students, new graduates, and early-career job seekers.",
    "Evaluate a candidate answer against a simulated role/company-style hiring persona.",
    "Do not claim the persona is a real hiring manager or represents the real company.",
    `Return JSON only in ${languageName(language)}.`,
    "Use conservative, evidence-based scoring. passProbability is an estimated practice signal, not a real hiring probability.",
    "Adapt the evaluation criteria to the selected role and seniority.",
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

  let source: "openai" | "demo_fallback" = "demo_fallback";
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await requestEvaluationJson(prompt);
    source = parsed ? "openai" : "demo_fallback";
  } catch {
    parsed = null;
  }

  const category = (parsed?.categoryScores ?? {}) as Record<string, unknown>;
  const result = {
    overallScore: clampScore(parsed?.overallScore, fallback.overallScore),
    passProbability: clampScore(parsed?.passProbability, fallback.passProbability),
    categoryScores: {
      communication: clampScore(category.communication, fallback.categoryScores.communication),
      problemSolving: clampScore(category.problemSolving, fallback.categoryScores.problemSolving),
      roleFit: clampScore(category.roleFit, fallback.categoryScores.roleFit),
      companyFit: clampScore(category.companyFit, fallback.categoryScores.companyFit),
    },
    strengths: safeList(parsed?.strengths, fallback.strengths, 5),
    weaknesses: safeList(parsed?.weaknesses, fallback.weaknesses, 5),
    recommendations: safeList(parsed?.recommendations, fallback.recommendations, 5),
    nextPracticeQuestion: cleanText(parsed?.nextPracticeQuestion, 700) || fallback.nextPracticeQuestion,
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

  return NextResponse.json({ ...result, source, evaluationId: saved?.id ?? null, savedAt: saved?.created_at ?? null });
}

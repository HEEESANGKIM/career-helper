import { NextRequest, NextResponse } from "next/server";
import {
  cleanText,
  getUserIdFromRequest,
  getUserProfile,
  languageName,
  parseLanguage,
  requestEvaluationJson,
  safeList,
  saveEvaluation,
  saveFeatureRecord,
  validationError,
} from "@/lib/evaluation-server";

export const runtime = "nodejs";

const fallbackResult = (language: "ko" | "en", selectedPath: string) =>
  language === "en"
    ? {
        recommendedPath: selectedPath || "Big Tech direct path with portfolio reinforcement",
        riskLevel: "medium" as const,
        reasoning: "This is a directional estimate based on the supplied profile and chosen path, not a precise probability.",
        milestones: ["Clarify target role requirements", "Close two skill gaps", "Run interview practice monthly"],
        skillGaps: ["Role-specific system design", "Evidence-backed impact storytelling"],
        actions: ["Build one portfolio proof point", "Map applications to target role keywords", "Schedule mock interviews"],
        alternativePath: "Startup ownership path followed by a later move to a scaled engineering organization",
      }
    : {
        recommendedPath: selectedPath || "포트폴리오 보강 후 빅테크 직접 지원 경로",
        riskLevel: "medium" as const,
        reasoning: "제공된 프로필과 선택 경로를 바탕으로 한 방향성 평가이며 정밀 확률 예측이 아닙니다.",
        milestones: ["목표 직무 요구사항 정리", "핵심 스킬 갭 2개 보완", "월 1회 면접 연습"],
        skillGaps: ["직무별 시스템 설계", "성과 근거 기반 스토리텔링"],
        actions: ["포트폴리오 증거 1개 구축", "지원서 키워드 매핑", "모의 면접 일정화"],
        alternativePath: "스타트업에서 오너십을 만든 뒤 규모 있는 조직으로 이동하는 경로",
      };

const normalizeRisk = (value: unknown): "low" | "medium" | "high" => {
  const risk = String(value ?? "").toLowerCase();
  return risk === "low" || risk === "medium" || risk === "high" ? risk : "medium";
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const language = parseLanguage(body?.language);
  const currentRole = cleanText(body?.currentRole, 120);
  const targetRole = cleanText(body?.targetRole, 120);
  const timeline = cleanText(body?.timeline, 80);
  const riskTolerance = cleanText(body?.riskTolerance, 80);
  const selectedPath = cleanText(body?.selectedPath, 500);

  if (!currentRole || !targetRole || !timeline || !riskTolerance || !selectedPath) {
    return validationError("currentRole, targetRole, timeline, riskTolerance, and selectedPath are required.");
  }

  const userId = await getUserIdFromRequest(request);
  const profile = await getUserProfile(userId);
  const fallback = fallbackResult(language, selectedPath);
  const prompt = [
    "You are PathMate.ai, a career strategy evaluator.",
    "Evaluate the selected career path using low/medium/high risk language. Avoid fake precise probabilities.",
    `Return JSON only in ${languageName(language)}.`,
    "Schema:",
    `{
  "recommendedPath": string,
  "riskLevel": "low" | "medium" | "high",
  "reasoning": string,
  "milestones": string[],
  "skillGaps": string[],
  "actions": string[],
  "alternativePath": string
}`,
    "",
    `currentRole: ${currentRole}`,
    `targetRole: ${targetRole}`,
    `timeline: ${timeline}`,
    `riskTolerance: ${riskTolerance}`,
    `selectedPath: ${selectedPath}`,
    `userProfileData: ${JSON.stringify(profile ?? {})}`,
  ].join("\n");

  let source: "openai" | "demo_fallback" = "demo_fallback";
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await requestEvaluationJson(prompt);
    source = parsed ? "openai" : "demo_fallback";
  } catch {
    parsed = null;
  }

  const result = {
    recommendedPath: cleanText(parsed?.recommendedPath, 700) || fallback.recommendedPath,
    riskLevel: normalizeRisk(parsed?.riskLevel ?? fallback.riskLevel),
    reasoning: cleanText(parsed?.reasoning, 1200) || fallback.reasoning,
    milestones: safeList(parsed?.milestones, fallback.milestones, 6),
    skillGaps: safeList(parsed?.skillGaps, fallback.skillGaps, 6),
    actions: safeList(parsed?.actions, fallback.actions, 6),
    alternativePath: cleanText(parsed?.alternativePath, 700) || fallback.alternativePath,
  };

  const saved = await saveEvaluation({
    userId,
    featureType: "career-chess",
    input: { currentRole, targetRole, timeline, riskTolerance, selectedPath, userProfileData: profile ?? null },
    output: result,
    overallScore: null,
    language,
  });

  await saveFeatureRecord({
    table: "career_simulations",
    payload: {
      user_id: userId,
      current_role: currentRole,
      target_role: targetRole,
      timeline_years: Number.parseInt(timeline, 10) || null,
      risk_tolerance: riskTolerance,
      selected_path: selectedPath,
      evaluation_id: saved?.id ?? null,
    },
  });

  return NextResponse.json({ ...result, source, evaluationId: saved?.id ?? null, savedAt: saved?.created_at ?? null });
}

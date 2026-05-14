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

export const runtime = "nodejs";

type Issue = { title: string; risk: string; suggestedFix: string };

const fallbackResult = (language: "ko" | "en") =>
  language === "en"
    ? {
        overallScore: 72,
        status: "Review recommended",
        criticalIssues: [] as Issue[],
        warnings: [
          {
            title: "Profile evidence is thin",
            risk: "Recruiters may not see enough proof of impact.",
            suggestedFix: "Add project outcomes, metrics, and role-specific summaries.",
          },
        ],
        strengths: ["No high-risk issue detected in the submitted content", "Professional material can be improved with clearer evidence"],
        recruiterViewSimulation: {
          summary: "A recruiter would see a generally safe profile with room for stronger proof.",
          estimatedImpression: "Moderate positive",
          afterCleanup: "Stronger and easier to screen",
        },
        cleanupChecklist: ["Add measurable project outcomes", "Align titles and dates", "Remove any sensitive private details"],
      }
    : {
        overallScore: 72,
        status: "검토 권장",
        criticalIssues: [] as Issue[],
        warnings: [
          {
            title: "프로필 근거가 부족합니다",
            risk: "채용 담당자가 성과 증거를 충분히 보기 어렵습니다.",
            suggestedFix: "프로젝트 성과, 수치, 직무별 요약을 추가하세요.",
          },
        ],
        strengths: ["제출된 콘텐츠에서 고위험 이슈는 보이지 않습니다", "근거를 보강하면 전문성이 더 잘 드러납니다"],
        recruiterViewSimulation: {
          summary: "채용 담당자는 전반적으로 안전하지만 증거가 더 필요한 프로필로 볼 가능성이 큽니다.",
          estimatedImpression: "보통 이상",
          afterCleanup: "더 명확하고 검토하기 쉬운 프로필",
        },
        cleanupChecklist: ["정량 프로젝트 성과 추가", "직함과 날짜 정렬", "민감한 개인 정보 제거"],
      };

const normalizeIssueList = (value: unknown, fallback: Issue[]) => {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => ({
      title: cleanText(item?.title, 300),
      risk: cleanText(item?.risk, 500),
      suggestedFix: cleanText(item?.suggestedFix, 500),
    }))
    .filter((item) => item.title && item.risk && item.suggestedFix)
    .slice(0, 6);
  return items.length ? items : fallback;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const language = parseLanguage(body?.language);
  const submittedLinks = Array.isArray(body?.submittedLinks)
    ? body.submittedLinks.map((item: unknown) => cleanText(item, 400)).filter(Boolean).slice(0, 12)
    : [];
  const submittedContent = cleanText(body?.submittedContent, 10000);

  if (submittedLinks.length === 0 && !submittedContent) {
    return validationError("submittedLinks or submittedContent is required.");
  }

  const fallback = fallbackResult(language);
  const prompt = [
    "You are PathMate.ai, a recruiter-facing public profile evaluator.",
    "Evaluate only the user-provided links/text summaries and pasted content. Do not claim to scrape Google, LinkedIn, Reddit, Twitter/X, Blind, GitHub, or any web source.",
    "If a link is provided without content, treat it only as a user-submitted label and ask for more detail through checklist items.",
    `Return JSON only in ${languageName(language)}.`,
    "Schema:",
    `{
  "overallScore": number,
  "status": string,
  "criticalIssues": [{ "title": string, "risk": string, "suggestedFix": string }],
  "warnings": [{ "title": string, "risk": string, "suggestedFix": string }],
  "strengths": string[],
  "recruiterViewSimulation": {
    "summary": string,
    "estimatedImpression": string,
    "afterCleanup": string
  },
  "cleanupChecklist": string[]
}`,
    "",
    `submittedLinks: ${JSON.stringify(submittedLinks)}`,
    `submittedContent: ${submittedContent}`,
  ].join("\n");

  let source: "openai" | "demo_fallback" = "demo_fallback";
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await requestEvaluationJson(prompt);
    source = parsed ? "openai" : "demo_fallback";
  } catch {
    parsed = null;
  }

  const simulation = (parsed?.recruiterViewSimulation ?? {}) as Record<string, unknown>;
  const result = {
    overallScore: clampScore(parsed?.overallScore, fallback.overallScore),
    status: cleanText(parsed?.status, 200) || fallback.status,
    criticalIssues: normalizeIssueList(parsed?.criticalIssues, fallback.criticalIssues),
    warnings: normalizeIssueList(parsed?.warnings, fallback.warnings),
    strengths: safeList(parsed?.strengths, fallback.strengths, 6),
    recruiterViewSimulation: {
      summary: cleanText(simulation.summary, 900) || fallback.recruiterViewSimulation.summary,
      estimatedImpression: cleanText(simulation.estimatedImpression, 300) || fallback.recruiterViewSimulation.estimatedImpression,
      afterCleanup: cleanText(simulation.afterCleanup, 500) || fallback.recruiterViewSimulation.afterCleanup,
    },
    cleanupChecklist: safeList(parsed?.cleanupChecklist, fallback.cleanupChecklist, 8),
  };

  const userId = await getUserIdFromRequest(request);
  const saved = await saveEvaluation({
    userId,
    featureType: "background-check",
    input: { submittedLinks, submittedContent },
    output: result,
    overallScore: result.overallScore,
    language,
  });

  await saveFeatureRecord({
    table: "background_reports",
    payload: {
      user_id: userId,
      submitted_links: submittedLinks,
      submitted_content: submittedContent,
      evaluation_id: saved?.id ?? null,
    },
  });

  return NextResponse.json({ ...result, source, evaluationId: saved?.id ?? null, savedAt: saved?.created_at ?? null });
}

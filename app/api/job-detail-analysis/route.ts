import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const parseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const jobTitle = String(body?.jobTitle ?? "");
  const company = String(body?.company ?? "");
  const summary = String(body?.summary ?? "");
  const profileSummary = String(body?.profileSummary ?? "");

  const fallback = {
    fitSummary: "프로필과 공고를 비교한 기본 갭 분석 결과입니다.",
    strengths: ["핵심 스킬 키워드가 일부 일치합니다.", "직무 관심도와 목표가 명확합니다."],
    gaps: ["정량 성과 기반 경험 표현이 부족합니다.", "해당 직무 관련 도메인 사례 보강이 필요합니다."],
    actionItems: ["프로젝트 성과를 숫자로 재작성", "공고 키워드 기반 커버레터 재생성", "예상 면접 질문 3개 사전 답변 준비"],
  };

  if (!openai) return NextResponse.json(fallback);

  try {
    const prompt = [
      "너는 취업 컨설턴트다.",
      "지원자 프로필과 채용 공고를 비교해 강점/갭/실행 과제를 JSON으로 출력한다.",
      "반드시 JSON만 출력한다.",
      "스키마:",
      `{
  "fitSummary": string,
  "strengths": [string, string],
  "gaps": [string, string],
  "actionItems": [string, string, string]
}`,
      "",
      `공고명: ${jobTitle}`,
      `기업: ${company}`,
      `공고 요약: ${summary}`,
      `지원자 프로필 요약: ${profileSummary}`,
    ].join("\n");

    const response = await openai.responses.create({ model: "gpt-4o-mini", input: prompt });
    const parsed = parseJson(response.output_text?.trim() ?? "");
    if (!parsed) return NextResponse.json(fallback);

    return NextResponse.json({
      fitSummary: String(parsed.fitSummary ?? fallback.fitSummary),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : fallback.strengths,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String).slice(0, 3) : fallback.gaps,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String).slice(0, 4) : fallback.actionItems,
    });
  } catch {
    return NextResponse.json(fallback);
  }
}

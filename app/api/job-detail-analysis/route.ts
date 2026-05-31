import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { languageName, parseLanguage } from "@/lib/evaluation-server";

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
  const language = parseLanguage(body?.language);
  const isEn = language === "en";
  const jobTitle = String(body?.jobTitle ?? "");
  const company = String(body?.company ?? "");
  const summary = String(body?.summary ?? "");
  const profileSummary = String(body?.profileSummary ?? "");

  if (!jobTitle || !company || !summary || !profileSummary) {
<<<<<<< HEAD
    return NextResponse.json(
      {
        error: isEn
          ? "Not enough job posting and profile information for a fact-based analysis."
          : "공고와 프로필 정보가 부족해 사실 기반 분석을 만들 수 없습니다.",
      },
      { status: 400 },
    );
  }

  if (!openai) {
    return NextResponse.json(
      {
        error: isEn
          ? "OpenAI API key is missing; detailed analysis cannot run."
          : "OpenAI API 키가 없어 상세 분석을 실행할 수 없습니다.",
      },
      { status: 503 },
    );
  }

  try {
    const prompt = isEn
      ? [
          "You are a career coach.",
          "Compare the applicant profile with the job posting and output strengths, gaps, and action items as JSON only.",
          "Do not invent experience, awards, skills, or company facts that are not implied by the inputs.",
          "Only reflect applicant counts or competition metrics when present in the input; do not estimate missing numbers.",
          "Be realistic; avoid inflated optimism.",
          `All human-readable strings in the JSON must be in ${languageName(language)}.`,
          "Schema:",
          `{
=======
    return NextResponse.json({ error: "공고와 프로필 정보가 부족해 사실 기반 분석을 만들 수 없습니다." }, { status: 400 });
  }

  if (!openai) {
    return NextResponse.json({ error: "OpenAI API 키가 없어 상세 분석을 실행할 수 없습니다." }, { status: 503 });
  }

  try {
    const prompt = [
      "너는 취업 컨설턴트다.",
      "지원자 프로필과 채용 공고를 비교해 강점/갭/실행 과제를 JSON으로 출력한다.",
      "입력된 공고/프로필에 없는 경력, 수상, 스킬, 기업 정보는 만들지 않는다.",
      "지원자수/경쟁 지표가 입력에 있을 때만 반영하고, 없는 숫자는 추정하지 않는다.",
      "현실적으로 평가하고 과장된 낙관 표현은 금지한다.",
      "반드시 JSON만 출력한다.",
      "스키마:",
      `{
>>>>>>> origin/dohyeon
  "fitSummary": string,
  "strengths": [string, string],
  "gaps": [string, string],
  "actionItems": [string, string, string]
}`,
          "",
          `Job title: ${jobTitle}`,
          `Company: ${company}`,
          `Posting summary: ${summary}`,
          `Applicant profile summary: ${profileSummary}`,
        ].join("\n")
      : [
          "너는 취업 컨설턴트다.",
          "지원자 프로필과 채용 공고를 비교해 강점/갭/실행 과제를 JSON으로 출력한다.",
          "입력된 공고/프로필에 없는 경력, 수상, 스킬, 기업 정보는 만들지 않는다.",
          "지원자수/경쟁 지표가 입력에 있을 때만 반영하고, 없는 숫자는 추정하지 않는다.",
          "현실적으로 평가하고 과장된 낙관 표현은 금지한다.",
          `모든 설명 문자열은 반드시 ${languageName(language)}로 작성한다.`,
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
    if (!parsed || typeof parsed !== "object") {
<<<<<<< HEAD
      return NextResponse.json(
        {
          error: isEn
            ? "Could not obtain verifiable JSON for the detailed analysis."
            : "상세 분석 결과를 검증 가능한 JSON으로 받지 못했습니다.",
        },
        { status: 502 },
      );
    }

    const typed = parsed as { fitSummary?: unknown; strengths?: unknown; gaps?: unknown; actionItems?: unknown };

    const defaultFit = isEn
      ? "Analysis is based only on the provided posting and profile."
      : "입력된 공고와 프로필 기준으로만 분석했습니다.";

    return NextResponse.json({
      fitSummary: String(typed.fitSummary ?? defaultFit),
=======
      return NextResponse.json({ error: "상세 분석 결과를 검증 가능한 JSON으로 받지 못했습니다." }, { status: 502 });
    }

    const typed = parsed as { fitSummary?: unknown; strengths?: unknown; gaps?: unknown; actionItems?: unknown };

    return NextResponse.json({
      fitSummary: String(typed.fitSummary ?? "입력된 공고와 프로필 기준으로만 분석했습니다."),
>>>>>>> origin/dohyeon
      strengths: Array.isArray(typed.strengths) ? typed.strengths.map(String).slice(0, 3) : [],
      gaps: Array.isArray(typed.gaps) ? typed.gaps.map(String).slice(0, 3) : [],
      actionItems: Array.isArray(typed.actionItems) ? typed.actionItems.map(String).slice(0, 4) : [],
    });
  } catch (error) {
<<<<<<< HEAD
    const message =
      error instanceof Error
        ? error.message
        : isEn
          ? "An unknown error occurred during detailed analysis."
          : "상세 분석 중 알 수 없는 오류가 발생했습니다.";
=======
    const message = error instanceof Error ? error.message : "상세 분석 중 알 수 없는 오류가 발생했습니다.";
>>>>>>> origin/dohyeon
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

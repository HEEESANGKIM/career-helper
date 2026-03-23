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
  const mode = String(body?.mode ?? "");

  if (mode === "question") {
    const role = String(body?.targetRole ?? "신입 개발자");
    const level = String(body?.level ?? "주니어");
    const fallback = {
      question: `${role} 포지션(${level}) 기준으로, 최근 프로젝트에서 문제를 정의하고 해결한 사례를 STAR 구조로 설명해 주세요.`,
      timeLimitSec: 90,
      rubric: ["문제 정의", "기술 선택 근거", "정량 성과", "협업 커뮤니케이션"],
    };

    if (!openai) return NextResponse.json(fallback);

    try {
      const prompt = [
        "한국 채용 면접관 관점으로 면접 질문 1개를 만든다.",
        "반드시 JSON만 출력한다.",
        `role: ${role}`,
        `level: ${level}`,
        "스키마:",
        `{
  "question": string,
  "timeLimitSec": number,
  "rubric": [string, string, string, string]
}`,
      ].join("\n");

      const response = await openai.responses.create({ model: "gpt-4o-mini", input: prompt });
      const parsed = parseJson(response.output_text?.trim() ?? "");
      if (!parsed) return NextResponse.json(fallback);

      return NextResponse.json({
        question: String(parsed.question ?? fallback.question),
        timeLimitSec:
          typeof parsed.timeLimitSec === "number"
            ? Math.max(45, Math.min(180, Math.round(parsed.timeLimitSec)))
            : fallback.timeLimitSec,
        rubric: Array.isArray(parsed.rubric) ? parsed.rubric.map(String).slice(0, 4) : fallback.rubric,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (mode === "evaluate") {
    const question = String(body?.question ?? "");
    const answer = String(body?.answer ?? "");
    const targetRole = String(body?.targetRole ?? "");
    const fallbackScore = Math.max(20, Math.min(95, Math.round(Math.min(1, answer.length / 600) * 100)));
    const fallback = {
      score: fallbackScore,
      summary: "답변 길이와 구조를 기준으로 기본 점수를 부여했습니다.",
      strengths: ["핵심 경험 언급", "직무 관심도 표현"],
      improvements: ["성과 수치(%)를 명시", "기술 선택 근거를 더 구체화"],
    };

    if (!openai) return NextResponse.json(fallback);

    try {
      const prompt = [
        "너는 한국 채용 면접관이다.",
        "질문/답변을 평가해서 점수와 피드백을 준다.",
        "반드시 JSON만 출력한다.",
        "스키마:",
        `{
  "score": number,
  "summary": string,
  "strengths": [string, string],
  "improvements": [string, string]
}`,
        "",
        `지원직무: ${targetRole}`,
        `질문: ${question}`,
        `답변: ${answer}`,
      ].join("\n");

      const response = await openai.responses.create({ model: "gpt-4o-mini", input: prompt });
      const parsed = parseJson(response.output_text?.trim() ?? "");
      if (!parsed) return NextResponse.json(fallback);

      return NextResponse.json({
        score: typeof parsed.score === "number" ? Math.max(1, Math.min(99, Math.round(parsed.score))) : fallback.score,
        summary: String(parsed.summary ?? fallback.summary),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : fallback.strengths,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 3) : fallback.improvements,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type RealJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
  publishedAt: string;
  deadline: string;
  hiringStatus: "open" | "unknown";
  fitScore: number;
  hireProbability: number;
  fitReasons: string[];
};

type RealJobResponse = {
  recommendedRoles: string[];
  items: RealJob[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

const missingConfig = !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !openaiApiKey;

const createAuthedUserClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const serviceClient = missingConfig ? null : createClient(supabaseUrl!, supabaseServiceRoleKey!);
const openai = missingConfig ? null : new OpenAI({ apiKey: openaiApiKey });

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const getUserFromToken = async (token: string) => {
  if (!token || missingConfig) return null;
  const authedClient = createAuthedUserClient(token);
  const { data, error } = await authedClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

const safeNumber = (value: unknown, fallback = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
};

const isLikelyClosed = (job: Partial<RealJob>) => {
  const text = `${job.title ?? ""} ${job.summary ?? ""}`.toLowerCase();
  return ["마감", "closed", "expired", "종료", "모집완료"].some((keyword) => text.includes(keyword));
};

const normalizeResponse = (raw: unknown): RealJobResponse => {
  const fallback: RealJobResponse = { recommendedRoles: [], items: [] };

  if (Array.isArray(raw)) {
    const items: RealJob[] = raw
      .map((job) => job as Partial<RealJob>)
      .filter((job) => job.url && !isLikelyClosed(job))
      .slice(0, 5)
      .map((job) => ({
        title: String(job.title ?? ""),
        company: String(job.company ?? ""),
        location: String(job.location ?? ""),
        url: String(job.url ?? ""),
        summary: String(job.summary ?? ""),
        publishedAt: String(job.publishedAt ?? "unknown"),
        deadline: String(job.deadline ?? "unknown"),
        hiringStatus: "open" as const,
        fitScore: safeNumber(job.fitScore, 65),
        hireProbability: safeNumber(job.hireProbability, 40),
        fitReasons: Array.isArray(job.fitReasons) ? job.fitReasons.map(String).slice(0, 3) : [],
      }));
    return { recommendedRoles: [], items };
  }

  if (!raw || typeof raw !== "object") return fallback;
  const typed = raw as { recommendedRoles?: unknown; items?: unknown };
  const recommendedRoles = Array.isArray(typed.recommendedRoles)
    ? typed.recommendedRoles.map(String).slice(0, 5)
    : [];
  const items: RealJob[] = Array.isArray(typed.items)
    ? typed.items
        .map((job) => job as Partial<RealJob>)
        .filter((job) => job.url && !isLikelyClosed(job))
        .slice(0, 6)
        .map((job) => ({
          title: String(job.title ?? ""),
          company: String(job.company ?? ""),
          location: String(job.location ?? ""),
          url: String(job.url ?? ""),
          summary: String(job.summary ?? ""),
          publishedAt: String(job.publishedAt ?? "unknown"),
          deadline: String(job.deadline ?? "unknown"),
          hiringStatus: job.hiringStatus === "open" ? "open" : "unknown",
          fitScore: Math.min(100, Math.max(0, safeNumber(job.fitScore, 65))),
          hireProbability: Math.min(100, Math.max(0, safeNumber(job.hireProbability, 40))),
          fitReasons: Array.isArray(job.fitReasons) ? job.fitReasons.map(String).slice(0, 4) : [],
        }))
    : [];
  return { recommendedRoles, items };
};

const parseAiJson = (text: string): unknown => {
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

export async function GET(request: NextRequest) {
  if (missingConfig || !serviceClient || !openai) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cached, error: cacheError } = await serviceClient
    .from("real_job_search_cache")
    .select("results, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cacheError) {
    return NextResponse.json({ error: cacheError.message }, { status: 500 });
  }

  if (cached?.results) {
    const normalized = normalizeResponse(cached.results);
    return NextResponse.json({
      source: "cache",
      searchedAt: cached.created_at,
      recommendedRoles: normalized.recommendedRoles,
      items: normalized.items,
    });
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "target_role, preferred_location, core_skills, tech_stack, major, education_level, role_certifications, language_test_name, language_test_score",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const prompt = [
    "오늘 날짜는 2026-03-17이다.",
    "한국 취업시장 기준으로 현재 모집중(open)인 실제 채용공고만 웹 검색해라.",
    "마감/종료/closed/expired 공고는 절대 포함하지 마라.",
    "희망직무에 국한하지 말고, 사용자 역량 기반 AI 추천 직종도 포함해라.",
    "반드시 JSON 객체만 출력하고 다른 설명은 금지한다.",
    "JSON 스키마:",
    `{
  "recommendedRoles": ["...", "..."],
  "items": [
    {
      "title": "...",
      "company": "...",
      "location": "...",
      "url": "...",
      "summary": "...",
      "publishedAt": "YYYY-MM-DD 또는 unknown",
      "deadline": "YYYY-MM-DD 또는 상시채용 또는 unknown",
      "hiringStatus": "open",
      "fitScore": 0-100,
      "hireProbability": 0-100,
      "fitReasons": ["...", "...", "..."]
    }
  ]
}`,
    "",
    "[사용자 컨텍스트]",
    `희망직무: ${profile?.target_role ?? ""}`,
    `희망지역: ${profile?.preferred_location ?? "대한민국 전체"}`,
    `전공: ${profile?.major ?? ""}`,
    `학력: ${profile?.education_level ?? ""}`,
    `핵심스킬: ${profile?.core_skills ?? ""}`,
    `기술스택: ${profile?.tech_stack ?? ""}`,
    `직무자격증: ${profile?.role_certifications ?? ""}`,
    `어학: ${profile?.language_test_name ?? ""} ${profile?.language_test_score ?? ""}`,
    "",
    "반드시 실제 채용공고 URL만 사용하고, 링크가 유효해 보이는 경우만 포함해라.",
    "공고는 최대 6개.",
  ].join("\n");

  const aiResponse = await openai.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: prompt,
  });

  const outputText = aiResponse.output_text?.trim() ?? "";
  const parsed = parseAiJson(outputText);
  const normalized = normalizeResponse(parsed);

  if (normalized.items.length === 0) {
    return NextResponse.json({ error: "실공고 검색 결과를 파싱하지 못했습니다." }, { status: 500 });
  }

  const { error: saveError } = await serviceClient.from("real_job_search_cache").upsert(
    {
      user_id: user.id,
      results: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "ai_search",
    searchedAt: new Date().toISOString(),
    recommendedRoles: normalized.recommendedRoles,
    items: normalized.items,
  });
}

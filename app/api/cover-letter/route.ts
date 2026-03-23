import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

const serviceClient = missingConfig
  ? null
  : createClient(supabaseUrl!, supabaseServiceRoleKey!);

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

export async function GET(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await serviceClient
    .from("cover_letters")
    .select("id, resume_text, job_description, tone, generated_text, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (missingConfig || !serviceClient || !openai) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
  const jobDescription = typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";
  const tone = typeof body?.tone === "string" ? body.tone.trim() : "professional";

  if (!resumeText) {
    return NextResponse.json({ error: "resumeText is required." }, { status: 400 });
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "full_name, school_name, education_level, major, gpa_score, gpa_scale, core_skills, tech_stack, role_certifications, language_test_name, language_test_score, target_role, experience_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profileContext = [
    `이름: ${profile?.full_name ?? ""}`,
    `학교: ${profile?.school_name ?? ""}`,
    `학력: ${profile?.education_level ?? ""}`,
    `전공: ${profile?.major ?? ""}`,
    `학점: ${profile?.gpa_score ?? ""} / ${profile?.gpa_scale ?? ""}`,
    `핵심스킬: ${profile?.core_skills ?? ""}`,
    `기술스택: ${profile?.tech_stack ?? ""}`,
    `직무자격증: ${profile?.role_certifications ?? ""}`,
    `어학: ${profile?.language_test_name ?? ""} ${profile?.language_test_score ?? ""}`,
    `희망직무: ${profile?.target_role ?? ""}`,
    `경험요약: ${profile?.experience_summary ?? ""}`,
  ].join("\n");

  const prompt = [
    "너는 취업 코치다. 한국어로 커버레터 초안을 작성해라.",
    `톤: ${tone}`,
    "",
    "[지원자 프로필]",
    profileContext,
    "",
    "[이력서 텍스트]",
    resumeText,
    "",
    "[지원 직무/공고 설명]",
    jobDescription || "미입력",
    "",
    "요구사항:",
    "1) 1문단 도입 + 2문단 본문 + 1문단 마무리",
    "2) 지원자 강점 3가지를 근거와 함께 포함",
    "3) 과장 없이 구체적으로 작성",
    "4) 마지막에 3줄 요약 bullet 포함",
  ].join("\n");

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const generatedText = response.output_text?.trim();
  if (!generatedText) {
    return NextResponse.json({ error: "Failed to generate cover letter." }, { status: 500 });
  }

  const { data: saved, error: saveError } = await serviceClient
    .from("cover_letters")
    .insert({
      user_id: user.id,
      resume_text: resumeText,
      job_description: jobDescription,
      tone,
      generated_text: generatedText,
      model: "gpt-4o-mini",
    })
    .select("id, created_at")
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: saved.id,
    createdAt: saved.created_at,
    generatedText,
  });
}

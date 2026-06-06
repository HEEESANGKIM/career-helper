import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { languageName, parseLanguage } from "@/lib/evaluation-server";
import { validateCoverLetterInput } from "@/lib/cover-letter-validation";

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
  const language = parseLanguage(body?.language);
  const isEn = language === "en";
  const resumeText = typeof body?.resumeText === "string" ? body.resumeText.trim() : "";
  const jobDescription = typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";
  const requestedTone = typeof body?.tone === "string" ? body.tone.trim() : "professional";
  const tone = ["professional", "confident", "concise", "realistic"].includes(requestedTone) ? requestedTone : "professional";

  if (!resumeText) {
    return NextResponse.json({ error: "resumeText is required." }, { status: 400 });
  }

  const validation = validateCoverLetterInput(resumeText, jobDescription, language);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: isEn ? "Fix the highlighted fields before generating." : "생성하기 전에 입력 내용을 수정해 주세요.",
        fieldErrors: validation.errors,
      },
      { status: 400 },
    );
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "full_name, school_name, education_level, major, gpa_score, gpa_scale, core_skills, tech_stack, role_certifications, language_test_name, language_test_score, target_role, experience_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profileContext = isEn
    ? [
        `Name: ${profile?.full_name ?? ""}`,
        `School: ${profile?.school_name ?? ""}`,
        `Education level: ${profile?.education_level ?? ""}`,
        `Major: ${profile?.major ?? ""}`,
        `GPA: ${profile?.gpa_score ?? ""} / ${profile?.gpa_scale ?? ""}`,
        `Core skills: ${profile?.core_skills ?? ""}`,
        `Tech stack: ${profile?.tech_stack ?? ""}`,
        `Role certifications: ${profile?.role_certifications ?? ""}`,
        `Language tests: ${profile?.language_test_name ?? ""} ${profile?.language_test_score ?? ""}`,
        `Target role: ${profile?.target_role ?? ""}`,
        `Experience summary: ${profile?.experience_summary ?? ""}`,
      ].join("\n")
    : [
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

  const toneInstruction = isEn
    ? tone === "realistic"
      ? "Write realistically: no exaggeration or guessing; center on verifiable facts/experience; state honest improvement plans where evidence is thin."
      : "Be concrete without exaggeration."
    : tone === "realistic"
      ? "현실적으로 작성: 과장·추정 표현 금지, 검증 가능한 사실/경험 중심, 부족한 부분은 솔직히 보완 계획으로 표현."
      : "과장 없이 구체적으로 작성.";

  const prompt = isEn
    ? [
        `You are a career coach. Write a complete cover letter draft in ${languageName(language)}.`,
        `Tone: ${tone}`,
        toneInstruction,
        "",
        "[Candidate profile]",
        profileContext,
        "",
        "[Resume text]",
        resumeText,
        "",
        "[Target role / job description]",
        jobDescription || "Not provided",
        "",
        "Requirements:",
        "1) One intro paragraph, two body paragraphs, one closing paragraph",
        "2) Include three strengths with evidence",
        "3) Attach evidence to each claim; where evidence is weak, frame an improvement plan",
        "4) End with a three-line bullet summary",
      ].join("\n")
    : [
        `너는 취업 코치다. ${languageName(language)}로 커버레터 초안을 작성해라.`,
        `톤: ${tone}`,
        toneInstruction,
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
        "3) 주장마다 근거를 붙이고, 근거가 약한 부분은 보완 계획으로 정리",
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

export async function DELETE(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await serviceClient
    .from("cover_letters")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Cover letter not found." }, { status: 404 });
  }

  const { error: deleteError } = await serviceClient.from("cover_letters").delete().eq("id", id).eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type LanguageMode = "ko" | "en";

type ProfileRow = {
  full_name?: string | null;
  school_name?: string | null;
  major?: string | null;
  gpa_score?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  role_certifications?: string | null;
  language_test_score?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
  experience_summary?: string | null;
};

type CoverLetterRow = {
  resume_text?: string | null;
  job_description?: string | null;
  generated_text?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const createAuthedClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const serviceClient = isConfigured ? createClient(supabaseUrl!, supabaseServiceRoleKey!) : null;

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const parseLanguage = (request: NextRequest): LanguageMode => {
  const value = request.nextUrl.searchParams.get("language");
  return value === "en" ? "en" : "ko";
};

const cleanText = (value: unknown, max = 500) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const parseAiJson = (text: string) => {
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

const splitTerms = (...values: Array<string | null | undefined>) =>
  values
    .join(",")
    .split(/[,/|·\n]/)
    .map((item) => cleanText(item, 80))
    .filter(Boolean);

const scoreFromProfile = (profile: ProfileRow | null) => {
  if (!profile) return 35;
  let score = 10;
  const boost = (key: keyof ProfileRow, points: number) => {
    if (profile[key]) score += points;
  };
  boost("school_name", 8);
  boost("major", 7);
  boost("gpa_score", 8);
  boost("core_skills", 12);
  boost("tech_stack", 10);
  boost("role_certifications", 9);
  boost("language_test_score", 8);
  boost("target_role", 8);
  boost("experience_summary", 10);
  score += Math.min(10, Number(profile.internship_count ?? 0) * 2);
  score += Math.min(10, Number(profile.project_count ?? 0) * 2);
  return Math.max(10, Math.min(95, score));
};

const fallbackRoles = (profile: ProfileRow | null, language: LanguageMode) => {
  const explicitRole = cleanText(profile?.target_role, 80);
  const terms = splitTerms(profile?.target_role, profile?.tech_stack, profile?.core_skills, profile?.major);
  const joined = terms.join(" ").toLowerCase();
  const roles: string[] = [];

  if (explicitRole) roles.push(explicitRole);
  if (/react|frontend|front-end|javascript|typescript|html|css|프론트/.test(joined)) {
    roles.push(language === "en" ? "Frontend Engineer" : "프론트엔드 개발자");
  }
  if (/backend|back-end|spring|java|node|api|server|서버|백엔드/.test(joined)) {
    roles.push(language === "en" ? "Backend Engineer" : "백엔드 개발자");
  }
  if (/python|sql|data|analytics|machine|ai|ml|데이터|분석|머신러닝/.test(joined)) {
    roles.push(language === "en" ? "Data Analyst / ML Engineer" : "데이터 분석가 / ML 엔지니어");
  }
  if (/product|pm|ux|기획|프로덕트/.test(joined)) {
    roles.push(language === "en" ? "Product Manager" : "프로덕트 매니저");
  }
  if (/cloud|aws|docker|kubernetes|devops|infra|인프라/.test(joined)) {
    roles.push(language === "en" ? "Cloud / DevOps Engineer" : "클라우드 / DevOps 엔지니어");
  }

  roles.push(language === "en" ? "Software Engineer" : "소프트웨어 엔지니어");
  return [...new Set(roles)].slice(0, 5);
};

const buildRecommendedRoles = async (profile: ProfileRow | null, coverLetters: CoverLetterRow[], language: LanguageMode) => {
  const fallback = fallbackRoles(profile, language);
  if (!openai || !profile) return { roles: fallback, source: "profile_fallback" as const };

  const profileContext = [
    `target_role: ${profile.target_role ?? ""}`,
    `major: ${profile.major ?? ""}`,
    `core_skills: ${profile.core_skills ?? ""}`,
    `tech_stack: ${profile.tech_stack ?? ""}`,
    `certifications: ${profile.role_certifications ?? ""}`,
    `experience_summary: ${profile.experience_summary ?? ""}`,
    `projects: ${profile.project_count ?? 0}`,
    `internships: ${profile.internship_count ?? 0}`,
  ].join("\n");

  const documentContext = coverLetters
    .map((item, index) =>
      [
        `document ${index + 1}`,
        `resume: ${cleanText(item.resume_text, 900)}`,
        `job_description: ${cleanText(item.job_description, 700)}`,
        `cover_letter: ${cleanText(item.generated_text, 700)}`,
      ].join("\n"),
    )
    .join("\n\n");

  try {
    const prompt = [
      language === "en"
        ? "Recommend 3 to 5 realistic job-role keywords for a career cockpit."
        : "커리어 콕핏에 표시할 현실적인 추천 직종 키워드 3~5개를 추천한다.",
      language === "en"
        ? "Use the user's profile, skills, target role, resume, and cover-letter context. Prefer searchable, practical role names. Do not invent companies."
        : "사용자의 프로필, 기술스택, 희망직무, 이력/자소서 맥락을 사용한다. 검색 가능한 실무 직무명 위주로 추천하고 회사명은 만들지 않는다.",
      language === "en" ? "Return JSON only in English." : "반드시 한국어 JSON만 반환한다.",
      'schema: {"roles":["..."],"reason":"short reason"}',
      "",
      "[profile]",
      profileContext,
      "",
      "[documents]",
      documentContext || "not provided",
    ].join("\n");

    const response = await openai.responses.create({
      model: process.env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    });

    const parsed = parseAiJson(response.output_text?.trim() ?? "") as { roles?: unknown } | null;
    const roles = Array.isArray(parsed?.roles)
      ? parsed.roles.map((role) => cleanText(role, 80)).filter(Boolean).slice(0, 5)
      : [];

    return roles.length > 0 ? { roles, source: "openai" as const } : { roles: fallback, source: "profile_fallback" as const };
  } catch {
    return { roles: fallback, source: "profile_fallback" as const };
  }
};

export async function GET(request: NextRequest) {
  if (!isConfigured || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const language = parseLanguage(request);
  const token = extractBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authed = createAuthedClient(token);
  const {
    data: { user },
    error: userError,
  } = await authed.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "full_name, school_name, major, gpa_score, core_skills, tech_stack, role_certifications, language_test_score, internship_count, project_count, target_role, experience_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const { data: coverLetters } = await serviceClient
    .from("cover_letters")
    .select("resume_text, job_description, generated_text")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const baseScore = scoreFromProfile(profile ?? null);
  const topPercent = Math.max(1, Math.min(99, Math.round(100 - baseScore)));
  const completeness = Math.min(100, Math.max(20, Math.round((baseScore / 95) * 100)));
  const displayName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    (language === "en" ? "User" : "사용자");

  const trend = [
    Math.max(20, baseScore - 12),
    Math.max(25, baseScore - 8),
    Math.max(30, baseScore - 5),
    Math.max(35, baseScore - 2),
    baseScore,
  ];

  const recommended = await buildRecommendedRoles(profile ?? null, (coverLetters ?? []) as CoverLetterRow[], language);
  const passRate = Math.max(20, Math.min(90, baseScore - 5));
  const interviewRate = Math.max(15, Math.min(85, baseScore - 10));

  return NextResponse.json({
    name: displayName,
    topPercent,
    completeness,
    trend,
    recommendedRoles: recommended.roles,
    recommendedRoleSource: recommended.source,
    signals:
      language === "en"
        ? [
            `Estimated role-fit signal: ${baseScore}%`,
            `Estimated document-screening readiness: ${passRate}%`,
            `Estimated interview-entry readiness: ${interviewRate}%`,
          ]
        : [
            `직무 적합도 예상 신호 ${baseScore}%`,
            `서류 통과 준비도 예상 ${passRate}%`,
            `면접 진입 준비도 예상 ${interviewRate}%`,
          ],
    weeklyReport:
      language === "en"
        ? [
            "Add at least two quantified achievement sentences to your profile.",
            "Update role-related certifications, language scores, or project evidence.",
            "Open Matching, save three recommended postings, and review the gap analysis.",
          ]
        : [
            "프로필에 정량 성과 문장을 2개 이상 추가하세요.",
            "희망 직무 관련 자격증, 어학 점수, 프로젝트 증거를 최신화하세요.",
            "매칭 페이지에서 추천 공고 3개를 저장하고 갭 분석을 확인하세요.",
          ],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);

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

const scoreFromProfile = (profile: Record<string, unknown> | null) => {
  if (!profile) return 35;
  let score = 10;
  const boost = (key: string, points: number) => {
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

export async function GET(request: NextRequest) {
  if (!isConfigured || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

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
    .maybeSingle();

  const baseScore = scoreFromProfile(profile as Record<string, unknown> | null);
  const topPercent = Math.max(1, Math.min(99, Math.round(100 - baseScore)));
  const completeness = Math.min(100, Math.max(20, Math.round((baseScore / 95) * 100)));
  const displayName =
    (profile?.full_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "사용자";

  const trend = [
    Math.max(20, baseScore - 12),
    Math.max(25, baseScore - 8),
    Math.max(30, baseScore - 5),
    Math.max(35, baseScore - 2),
    baseScore,
  ];

  return NextResponse.json({
    name: displayName,
    topPercent,
    completeness,
    trend,
    signals: [
      `직무 적합도 예상 ${baseScore}%`,
      `서류 통과 예상 확률 ${Math.max(20, Math.min(90, baseScore - 5))}%`,
      `면접 진입 예상 확률 ${Math.max(15, Math.min(85, baseScore - 10))}%`,
    ],
    weeklyReport: [
      "프로필의 정량 성과 문장을 2개 이상 추가하세요.",
      "희망 직무 관련 자격증/어학 점수 최신화가 필요합니다.",
      "매칭 페이지에서 추천 공고 3개를 저장하고 갭 분석을 확인하세요.",
    ],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateSkillMatch, careerDataCopy, findCareerTemplate, localizeTemplate, type LanguageMode } from "@/lib/career-data";
import { clampScore, cleanText, openai, parseJsonObject } from "@/lib/evaluation-server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const serviceClient = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

type ProfileRow = {
  target_role?: string | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  project_count?: number | null;
  internship_count?: number | null;
  experience_summary?: string | null;
  portfolio_url?: string | null;
};

function extractBearer(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [, token] = header.split("Bearer ");
  return token?.trim() ?? "";
}

async function getUserId(request: NextRequest) {
  const token = extractBearer(request);
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;
  const authed = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await authed.auth.getUser();
  return data.user?.id ?? null;
}

function average(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return null;
  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const language: LanguageMode = body?.language === "en" ? "en" : "ko";
  const userId = await getUserId(request);

  if (!serviceClient || !userId) {
    const template = findCareerTemplate(cleanText(body?.targetRole, 120) || "Software Engineer");
    const localized = localizeTemplate(template, language);
    return NextResponse.json({
      sourceNote: careerDataCopy[language],
      targetRole: localized.role,
      overallScore: 58,
      components: {
        skillMatch: 45,
        resumeScore: 55,
        interviewScore: 50,
        portfolioScore: 50,
        marketAlignment: 70,
        backgroundScore: 80,
      },
      strengths: language === "en" ? ["Role template is loaded", "Career plan can run without database"] : ["직무 템플릿을 불러왔습니다", "DB 없이도 커리어 플랜을 실행할 수 있습니다"],
      gaps: language === "en" ? ["Connect Supabase to personalize from profile and evaluations"] : ["프로필과 평가 기반 개인화를 위해 Supabase 연결이 필요합니다"],
      recommendedNextAction: localized.ninetyDayPlan[0],
      missingDataHints: language === "en" ? ["Complete your resume analysis/interview simulation to improve score accuracy."] : ["점수 정확도를 높이려면 이력서 분석/면접 시뮬레이션을 완료하세요."],
    });
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("target_role, core_skills, tech_stack, skills, project_count, internship_count, experience_summary, portfolio_url")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  const targetRole = cleanText(body?.targetRole, 120) || profile?.target_role || "Software Engineer";
  const template = findCareerTemplate(targetRole);
  const localized = localizeTemplate(template, language);

  const { data: evaluations } = await serviceClient
    .from("user_evaluations")
    .select("feature_type, overall_score, output_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const skillText = [profile?.core_skills, profile?.tech_stack, profile?.skills, profile?.experience_summary].filter(Boolean).join(", ");
  const skillMatch = calculateSkillMatch(skillText, template);
  const resumeScore = clampScore(profile?.experience_summary ? 65 + Math.min(20, String(profile.experience_summary).length / 80) : 45);
  const interviewScores = (evaluations ?? [])
    .filter((item) => ["interview", "hiring-manager"].includes(String(item.feature_type)))
    .map((item) => clampScore(item.overall_score, Number((item.output_json as { overallScore?: number })?.overallScore ?? 50)));
  const interviewScore = average(interviewScores) ?? 45;
  const portfolioScore = clampScore((profile?.project_count ?? 0) * 18 + (profile?.portfolio_url ? 35 : 20), 45);
  const marketAlignment = clampScore(60 + (localized.salaryBand.entry ? 10 : 0) + Math.min(10, (profile?.internship_count ?? 0) * 4), 65);
  const backgroundEvaluation = (evaluations ?? []).find((item) => item.feature_type === "background-check");
  const backgroundScore = clampScore(backgroundEvaluation?.overall_score, 75);

  const components = { skillMatch, resumeScore, interviewScore, portfolioScore, marketAlignment, backgroundScore };
  const weights = { skillMatch: 0.25, resumeScore: 0.2, interviewScore: 0.2, portfolioScore: 0.15, marketAlignment: 0.1, backgroundScore: 0.1 };
  const overallScore = Math.round(
    components.skillMatch * weights.skillMatch +
      components.resumeScore * weights.resumeScore +
      components.interviewScore * weights.interviewScore +
      components.portfolioScore * weights.portfolioScore +
      components.marketAlignment * weights.marketAlignment +
      components.backgroundScore * weights.backgroundScore,
  );

  const fallbackExplanation = {
    strengths:
      language === "en"
        ? [`Target role template loaded for ${localized.role}`, `Portfolio score reflects ${profile?.project_count ?? 0} project(s)`]
        : [`${localized.role} 직무 템플릿을 반영했습니다`, `포트폴리오 점수는 프로젝트 ${profile?.project_count ?? 0}개를 반영합니다`],
    gaps:
      language === "en"
        ? localized.requiredSkills.filter((skill) => !skillText.toLowerCase().includes(skill.toLowerCase().split(" ")[0])).slice(0, 3).map((skill) => `${skill} evidence is weak`)
        : localized.requiredSkills.filter((skill) => !skillText.includes(skill.split(" ")[0])).slice(0, 3).map((skill) => `${skill} 증거가 약합니다`),
    recommendedNextAction: localized.ninetyDayPlan[0],
  };

  let explanation = fallbackExplanation;
  if (openai) {
    try {
      const response = await openai.responses.create({
        model: process.env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-4.1-mini",
        input: [
          "Generate a concise career readiness explanation for PathMate.ai.",
          `Return JSON only in ${language === "en" ? "English" : "Korean"}: {"strengths":[],"gaps":[],"recommendedNextAction":""}`,
          `targetRole: ${localized.role}`,
          `components: ${JSON.stringify(components)}`,
          `requiredSkills: ${localized.requiredSkills.join(", ")}`,
          `recommendedProjects: ${localized.recommendedProjects.join(", ")}`,
        ].join("\n"),
        temperature: 0.2,
      });
      const parsed = parseJsonObject(response.output_text ?? "") as typeof fallbackExplanation | null;
      if (parsed?.recommendedNextAction) explanation = parsed;
    } catch {
      explanation = fallbackExplanation;
    }
  }

  const missingDataHints = [
    ...(interviewScores.length ? [] : [language === "en" ? "Complete an interview simulation to improve score accuracy." : "점수 정확도를 높이려면 면접 시뮬레이션을 완료하세요."]),
    ...(profile?.project_count ? [] : [language === "en" ? "Add portfolio projects in your profile." : "프로필에 포트폴리오 프로젝트를 추가하세요."]),
  ];

  await serviceClient.from("career_readiness_snapshots").insert({
    user_id: userId,
    target_role: localized.role,
    overall_score: overallScore,
    skill_match_score: skillMatch,
    resume_score: resumeScore,
    interview_score: interviewScore,
    portfolio_score: portfolioScore,
    market_alignment_score: marketAlignment,
    background_score: backgroundScore,
    input_json: { profile, evaluations: (evaluations ?? []).slice(0, 5), template: localized },
    explanation_json: explanation,
    language,
  });

  return NextResponse.json({
    sourceNote: careerDataCopy[language],
    targetRole: localized.role,
    overallScore,
    components,
    strengths: explanation.strengths,
    gaps: explanation.gaps,
    recommendedNextAction: explanation.recommendedNextAction,
    missingDataHints,
  });
}

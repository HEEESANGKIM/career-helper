import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clampScore, cleanText, getUserIdFromRequest, openai, parseJsonObject, saveEvaluation, saveFeatureRecord } from "@/lib/evaluation-server";
import { hasPortfolioLinks } from "@/lib/portfolio-links";
import { parseProfileSkills, parseSkillList } from "@/lib/skill-list";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const serviceClient = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

type LanguageMode = "ko" | "en";

type ProfileRow = {
  school_name?: string | null;
  major?: string | null;
  gpa_score?: number | null;
  gpa?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  desired_companies?: string | null;
  portfolio_url?: string | null;
  experience_summary?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
};

function parseLanguage(value: unknown): LanguageMode {
  return String(value ?? "").toLowerCase() === "en" ? "en" : "ko";
}

function fallback(profile: ProfileRow | null, language: LanguageMode) {
  const skills = parseProfileSkills(profile);
  const projects = Number(profile?.project_count ?? 0);
  const internships = Number(profile?.internship_count ?? 0);
  const targetRole = cleanText(profile?.target_role, 80) || (language === "en" ? "Software Engineering Intern" : "소프트웨어 엔지니어링 인턴");
  const targetCompany = parseSkillList(profile?.desired_companies)[0] || "Nvidia";
  const resumeScore = clampScore(52 + skills.length * 3 + projects * 5 + internships * 4, 76);
  const interviewScore = clampScore(48 + (profile?.experience_summary ? 12 : 0) + internships * 5, 70);
  const portfolioMove = projects < 2 || !hasPortfolioLinks(profile?.portfolio_url);
  const recommendedId = portfolioMove ? "portfolio" : interviewScore < 75 ? "interview" : "apply";

  const moveCandidates = [
    { id: "apply", title: language === "en" ? "Apply for internships" : "인턴십 지원하기", category: language === "en" ? "Market" : "시장", riskLevel: "Medium", rewardLevel: "High", effort: "Medium", timeCost: language === "en" ? "1 week" : "1주", confidence: 72, expectedHiringImpact: 76 },
    { id: "resume", title: language === "en" ? "Improve resume" : "이력서 개선하기", category: language === "en" ? "Signal" : "신호", riskLevel: "Low", rewardLevel: "High", effort: "Low", timeCost: language === "en" ? "2 hours" : "2시간", confidence: 88, expectedHiringImpact: 82 },
    { id: "portfolio", title: language === "en" ? "Build portfolio project" : "포트폴리오 프로젝트 만들기", category: language === "en" ? "Proof" : "증거", riskLevel: "Medium", rewardLevel: "Very High", effort: "High", timeCost: language === "en" ? "3 weeks" : "3주", confidence: 84, expectedHiringImpact: 91 },
    { id: "interview", title: language === "en" ? "Practice interview" : "면접 연습하기", category: language === "en" ? "Conversion" : "전환", riskLevel: "Low", rewardLevel: "High", effort: "Medium", timeCost: language === "en" ? "4 sessions" : "4회", confidence: 80, expectedHiringImpact: 79 },
    { id: "sql", title: language === "en" ? "Learn SQL" : "SQL 배우기", category: language === "en" ? "Skill" : "스킬", riskLevel: "Low", rewardLevel: "Medium", effort: "Medium", timeCost: language === "en" ? "10 days" : "10일", confidence: 75, expectedHiringImpact: 63 },
    { id: "react", title: language === "en" ? "Learn React" : "React 강화하기", category: language === "en" ? "Skill" : "스킬", riskLevel: "Low", rewardLevel: "High", effort: "Medium", timeCost: language === "en" ? "2 weeks" : "2주", confidence: 82, expectedHiringImpact: 74 },
    { id: "alumni", title: language === "en" ? "Network with alumni" : "동문과 네트워킹하기", category: language === "en" ? "Access" : "접근", riskLevel: "Medium", rewardLevel: "High", effort: "Low", timeCost: language === "en" ? "3 messages" : "메시지 3개", confidence: 68, expectedHiringImpact: 71 },
    { id: "grad", title: language === "en" ? "Prepare for graduate school" : "대학원 준비하기", category: language === "en" ? "Option" : "옵션", riskLevel: "High", rewardLevel: "High", effort: "High", timeCost: language === "en" ? "2 months" : "2개월", confidence: 58, expectedHiringImpact: 55 },
    { id: "oss", title: language === "en" ? "Contribute to open source" : "오픈소스 기여하기", category: language === "en" ? "Proof" : "증거", riskLevel: "Medium", rewardLevel: "High", effort: "High", timeCost: language === "en" ? "4 weeks" : "4주", confidence: 70, expectedHiringImpact: 77 },
  ];
  const recommended = moveCandidates.find((item) => item.id === recommendedId) ?? moveCandidates[2];

  return {
    currentPosition: {
      gpa: String(profile?.gpa_score ?? profile?.gpa ?? "N/A"),
      skills: skills.slice(0, 8),
      projects: projects ? [language === "en" ? `${projects} profile project(s)` : `프로필 프로젝트 ${projects}개`] : [],
      internshipExperience: internships ? (language === "en" ? `${internships} internship(s)` : `인턴십 ${internships}회`) : language === "en" ? "No formal internship yet" : "정식 인턴십 경험 없음",
      resumeScore,
      interviewScore,
      careerGoal: `${targetCompany} ${targetRole}`,
    },
    moveCandidates,
    recommendedMove: {
      id: recommended.id,
      title: recommended.title,
      reason: portfolioMove
        ? language === "en" ? "Your profile needs stronger practical implementation proof before broad applications." : "본격 지원 전에 실제 구현 증거를 더 강화하는 것이 좋습니다."
        : language === "en" ? "Your proof is usable; conversion now depends on interview clarity." : "증거는 어느 정도 갖춰졌고, 이제 면접 전달력이 전환율을 좌우합니다.",
    },
    threeMovesAhead: language === "en" ? [recommended.title, "Stronger profile signal", "More qualified applications", "Higher interview conversion"] : [recommended.title, "프로필 신호 강화", "더 적합한 지원 증가", "면접 전환 가능성 상승"],
    endgameGoal: `${targetCompany} ${targetRole}`,
    endgamePlan: language === "en"
      ? ["Strengthen the most relevant project", "Rewrite resume bullets for the target role", "Prepare two technical stories", "Run Hiring Simulator", "Apply during the next recruiting window"]
      : ["가장 관련 있는 프로젝트 강화", "목표 직무 기준으로 이력서 bullet 수정", "기술 스토리 2개 준비", "Hiring Simulator 실행", "다음 채용 시즌에 지원"],
    dailyMove: language === "en" ? "Rewrite one resume bullet using action verb + measurable impact." : "이력서 문장 하나를 동작 동사 + 정량 성과 구조로 다시 쓰세요.",
    xp: 900 + resumeScore * 4 + interviewScore * 3,
    level: resumeScore >= 80 ? "Strategist" : "Candidate",
    streak: 3 + Math.min(10, projects + internships),
    completedMoves: Math.max(3, projects + internships + skills.length),
    source: "profile_fallback" as const,
  };
}

type NextMoveResult = Omit<ReturnType<typeof fallback>, "source"> & {
  source: "profile_fallback" | "openai";
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const language = parseLanguage(body?.language);
  const userId = await getUserIdFromRequest(request);
  if (!serviceClient || !userId) return NextResponse.json(fallback(null, language));

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("school_name, major, gpa_score, gpa, core_skills, tech_stack, skills, desired_companies, portfolio_url, experience_summary, internship_count, project_count, target_role")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();
  const base = fallback(profile ?? null, language) as NextMoveResult;

  let result: NextMoveResult = base;
  if (openai && profile) {
    try {
      const response = await openai.responses.create({
        model: process.env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-4.1-mini",
        input: [
          "Personalize PathMate.ai Next Move career strategy board from the authenticated user's profile.",
          `Return JSON only in ${language === "en" ? "English" : "Korean"}.`,
          "Schema: {currentPosition:{gpa,skills:string[],projects:string[],internshipExperience,resumeScore,interviewScore,careerGoal},moveCandidates:[{id,title,category,riskLevel,rewardLevel,effort,timeCost,confidence,expectedHiringImpact}],recommendedMove:{id,title,reason},threeMovesAhead:string[],endgameGoal,endgamePlan:string[],dailyMove,xp,level,streak,completedMoves}",
          "Use only evidence from profile and reasonable inferences. Do not make it look like chess gameplay.",
          `fallback: ${JSON.stringify(base)}`,
          `profile: ${JSON.stringify(profile)}`,
        ].join("\n"),
        temperature: 0.2,
      });
      const parsed = parseJsonObject(response.output_text ?? "") as Partial<typeof base> | null;
      if (parsed) {
        result = {
          ...base,
          ...parsed,
          currentPosition: { ...base.currentPosition, ...parsed.currentPosition },
          moveCandidates: Array.isArray(parsed.moveCandidates) && parsed.moveCandidates.length ? parsed.moveCandidates : base.moveCandidates,
          recommendedMove: { ...base.recommendedMove, ...parsed.recommendedMove },
          source: "openai",
        } as NextMoveResult;
      }
    } catch {
      result = base;
    }
  }

  const score = clampScore(result.currentPosition.resumeScore * 0.45 + result.currentPosition.interviewScore * 0.35 + (result.recommendedMove ? 15 : 0), 70);
  const saved = await saveEvaluation({ userId, featureType: "career-chess", input: { profile }, output: result, overallScore: score, language });
  await saveFeatureRecord({
    table: "career_simulations",
    payload: {
      user_id: userId,
      current_role: profile?.major ?? null,
      target_role: result.currentPosition.careerGoal,
      timeline_years: 1,
      risk_tolerance: "balanced",
      selected_path: result.recommendedMove.title,
      evaluation_id: saved?.id ?? null,
      input_json: { profile },
      output_json: result,
      language,
      selected_decisions: result.moveCandidates,
    },
  });

  return NextResponse.json({ ...result, evaluationId: saved?.id ?? null });
}

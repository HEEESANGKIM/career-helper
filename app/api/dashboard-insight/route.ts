import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSyntheticProfiles, type SyntheticCareerProfile } from "@/lib/career-data";
import { parseProfileSkills } from "@/lib/skill-list";

export const runtime = "nodejs";

type LanguageMode = "ko" | "en";

type ProfileRow = {
  full_name?: string | null;
  school_name?: string | null;
  major?: string | null;
  gpa_score?: number | null;
  gpa_scale?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  role_certifications?: string | null;
  language_test_score?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
  target_industry?: string | null;
  preferred_location?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  experience_summary?: string | null;
};

type EvaluationScores = {
  profileCompleteness: number;
  marketReadiness: number;
  interviewReadiness: number;
  portfolioStrength: number;
};

type Penalty = {
  id: string;
  label: string;
  labelKo: string;
  points: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
const serviceClient = isConfigured ? createClient(supabaseUrl!, supabaseServiceRoleKey!) : null;

const createAuthedClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const parseLanguage = (request: NextRequest): LanguageMode => (request.nextUrl.searchParams.get("language") === "en" ? "en" : "ko");

const cleanText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const clamp = (value: number) => Math.max(5, Math.min(92, Math.round(value)));

const hasMeasurableAchievement = (profile: ProfileRow | null) => /\d|%|\$|won|달러|명|개|배|시간|users|revenue|reduced|increased/i.test(cleanText(profile?.experience_summary));

const isGenericGoal = (profile: ProfileRow | null) => {
  const role = cleanText(profile?.target_role).toLowerCase();
  if (!role) return true;
  return ["developer", "engineer", "manager", "intern", "개발자", "엔지니어", "인턴", "취업"].includes(role);
};

const getSkillDepth = (profile: ProfileRow | null) => parseProfileSkills(profile).length;

const getGpaRatio = (score?: number | null, scale?: number | null) => {
  const usableScore = Number(score);
  const usableScale = Number(scale);
  if (!Number.isFinite(usableScore) || !Number.isFinite(usableScale) || usableScore <= 0 || usableScale <= 0) return null;
  return Math.max(0, Math.min(1, usableScore / usableScale));
};

const gpaSignal = (ratio: number | null) => {
  if (ratio === null) return -4;
  return Math.max(-10, Math.min(10, (ratio - 0.78) * 55));
};

const candidateNumber = (profileId: string) => {
  const match = profileId.match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
};

const syntheticGpaRatio = (profile: SyntheticCareerProfile) => {
  const explicit = getGpaRatio(profile.gpa_score, profile.gpa_scale);
  if (explicit !== null) return explicit;
  const samples = [2.55, 2.75, 2.9, 3.0, 3.1, 3.25, 3.4, 3.55, 3.7, 3.9];
  const score = samples[(candidateNumber(profile.profile_id) - 1) % samples.length] ?? 3.1;
  return score / 4.0;
};

const collectPenalties = (profile: ProfileRow | null): Penalty[] => {
  const penalties: Penalty[] = [];
  const projectCount = Number(profile?.project_count ?? 0);
  const skillDepth = getSkillDepth(profile);
  const gpaRatio = getGpaRatio(profile?.gpa_score, profile?.gpa_scale);

  if (projectCount <= 0) {
    penalties.push({ id: "missing-projects", label: "Missing projects", labelKo: "프로젝트 없음", points: 12 });
  } else if (projectCount === 1) {
    penalties.push({ id: "thin-projects", label: "Limited project depth", labelKo: "프로젝트 깊이 부족", points: 6 });
  }

  if (!hasMeasurableAchievement(profile)) {
    penalties.push({ id: "no-metrics", label: "No measurable achievements", labelKo: "정량 성과 부족", points: 9 });
  }

  if (isGenericGoal(profile)) {
    penalties.push({ id: "generic-goal", label: "Generic career goal", labelKo: "목표 직무가 너무 일반적임", points: 7 });
  }

  if (skillDepth < 4) {
    penalties.push({ id: "weak-skill-depth", label: "Weak skill depth", labelKo: "스킬 깊이 부족", points: 8 });
  }

  if (gpaRatio === null) {
    penalties.push({ id: "missing-gpa", label: "Missing GPA", labelKo: "GPA 미입력", points: 6 });
  } else if (gpaRatio < 0.78) {
    penalties.push({ id: "mid-gpa", label: "GPA is below competitive threshold", labelKo: "GPA 경쟁력 보완 필요", points: 7 });
  }

  if (!profile?.portfolio_url && !profile?.github_url) {
    penalties.push({ id: "empty-portfolio", label: "No portfolio or GitHub link", labelKo: "포트폴리오/GitHub 링크 없음", points: 10 });
  }

  return penalties;
};

const evaluateProfile = (profile: ProfileRow | null): EvaluationScores => {
  const skillDepth = getSkillDepth(profile);
  const projectCount = Number(profile?.project_count ?? 0);
  const internshipCount = Number(profile?.internship_count ?? 0);
  const hasPortfolio = Boolean(profile?.portfolio_url || profile?.github_url);
  const hasMetrics = hasMeasurableAchievement(profile);
  const genericGoal = isGenericGoal(profile);
  const gpa = gpaSignal(getGpaRatio(profile?.gpa_score, profile?.gpa_scale));
  const penalties = collectPenalties(profile);
  const totalPenalty = penalties.reduce((sum, penalty) => sum + penalty.points, 0);

  const requiredFields: Array<keyof ProfileRow> = [
    "full_name",
    "school_name",
    "major",
    "gpa_score",
    "gpa_scale",
    "core_skills",
    "tech_stack",
    "target_role",
    "preferred_location",
    "experience_summary",
    "portfolio_url",
  ];
  const filledFields = requiredFields.filter((field) => cleanText(profile?.[field]).length > 0).length;

  return {
    profileCompleteness: clamp(30 + filledFields * 5 - (profile ? 0 : 16) - Math.min(14, totalPenalty * 0.25)),
    marketReadiness: clamp(34 + skillDepth * 2.4 + internshipCount * 4 + projectCount * 3 + gpa * 0.45 + (genericGoal ? -9 : 4) + (hasMetrics ? 4 : -7) - Math.min(12, totalPenalty * 0.22)),
    interviewReadiness: clamp(33 + (profile?.experience_summary ? 10 : 0) + (hasMetrics ? 7 : -8) + internshipCount * 3 + projectCount * 2.5 + gpa * 0.35 + (profile?.target_role ? 3 : -5)),
    portfolioStrength: clamp(26 + projectCount * 8 + (hasPortfolio ? 12 : -12) + (hasMetrics ? 6 : -6) + Math.min(10, skillDepth * 1.7)),
  };
};

const evaluateSyntheticProfile = (profile: SyntheticCareerProfile): EvaluationScores => {
  const projectCount = profile.projects.length;
  const internshipCount = profile.internships.length;
  const skillDepth = profile.skills.length;
  const hasMetrics = /\d|%|\$|users|revenue|reduced|increased/i.test([profile.year_1_state, profile.year_3_state, profile.year_5_state].join(" "));
  const id = candidateNumber(profile.profile_id);
  const qualitySpread = ((id * 37) % 21) - 10;
  const gpa = gpaSignal(syntheticGpaRatio(profile));
  const hasPortfolio = projectCount >= 2 && id % 4 !== 0;

  return {
    profileCompleteness: clamp(36 + skillDepth * 3 + projectCount * 4 + internshipCount * 4 + gpa * 0.7 + qualitySpread * 0.8),
    marketReadiness: clamp(34 + skillDepth * 2.8 + projectCount * 4 + internshipCount * 6 + gpa * 0.9 + (profile.target_role ? 4 : -4) + qualitySpread),
    interviewReadiness: clamp(32 + projectCount * 4 + internshipCount * 5 + (profile.key_decisions.length > 2 ? 6 : 0) + (hasMetrics ? 5 : -5) + gpa * 0.6 + qualitySpread * 0.8),
    portfolioStrength: clamp(28 + projectCount * 9 + skillDepth * 1.8 + (hasPortfolio ? 8 : -5) + (hasMetrics ? 5 : -4) + qualitySpread * 0.6),
  };
};

const averageScore = (scores: EvaluationScores) => Math.round((scores.profileCompleteness + scores.marketReadiness + scores.interviewReadiness + scores.portfolioStrength) / 4);

const confidenceLabel = (score: number, language: LanguageMode) => {
  if (score < 50) return language === "en" ? "Early Stage" : "초기 단계";
  if (score < 68) return language === "en" ? "Developing" : "성장 중";
  if (score < 82) return language === "en" ? "Competitive" : "경쟁 가능";
  return language === "en" ? "Strong Candidate" : "강한 후보";
};

const buildExplanation = (scores: EvaluationScores, penalties: Penalty[], language: LanguageMode) => {
  const entries = Object.entries(scores) as Array<[keyof EvaluationScores, number]>;
  const strongest = entries.sort((a, b) => b[1] - a[1])[0];
  const weakest = [...entries].sort((a, b) => a[1] - b[1])[0];
  const names = {
    en: {
      profileCompleteness: "profile completeness",
      marketReadiness: "market readiness",
      interviewReadiness: "interview readiness",
      portfolioStrength: "portfolio strength",
    },
    ko: {
      profileCompleteness: "프로필 완성도",
      marketReadiness: "시장 준비도",
      interviewReadiness: "면접 준비도",
      portfolioStrength: "포트폴리오 강도",
    },
  }[language];

  if (language === "en") {
    if (penalties.some((penalty) => penalty.id === "thin-projects" || penalty.id === "missing-projects")) {
      return "Your profile is complete, but project depth is still developing.";
    }
    return `Your ${names[strongest[0]]} is the strongest signal, while ${names[weakest[0]]} needs the most work.`;
  }

  if (penalties.some((penalty) => penalty.id === "thin-projects" || penalty.id === "missing-projects")) {
    return "프로필은 어느 정도 채워졌지만 프로젝트 깊이는 아직 성장 중입니다.";
  }
  return `${names[strongest[0]]}가 가장 강하고, ${names[weakest[0]]} 보완이 가장 필요합니다.`;
};

const benchmarkAgainstSyntheticProfiles = (score: number) => {
  const scores = getSyntheticProfiles().map((profile) => averageScore(evaluateSyntheticProfile(profile))).sort((a, b) => a - b);
  if (!scores.length) return { topPercent: Math.max(1, Math.min(99, 100 - score)), benchmarkSize: 0, medianScore: 58 };
  const atOrBelow = scores.filter((item) => item <= score).length;
  const percentileRank = Math.round((atOrBelow / scores.length) * 100);
  const topPercent = Math.max(1, Math.min(99, 100 - percentileRank + 1));
  const medianScore = scores[Math.floor(scores.length / 2)] ?? 58;
  return { topPercent, benchmarkSize: scores.length, medianScore };
};

const recommendedRoles = (profile: ProfileRow | null, language: LanguageMode) => {
  const role = cleanText(profile?.target_role);
  const skills = parseProfileSkills(profile).join(" ").toLowerCase();
  const roles = new Set<string>();
  if (role) roles.add(role);
  if (/sql|data|python|analysis|analytics/.test(skills)) roles.add(language === "en" ? "Data Analyst" : "데이터 분석가");
  if (/react|typescript|javascript|frontend/.test(skills)) roles.add(language === "en" ? "Frontend Engineer" : "프론트엔드 엔지니어");
  if (/java|node|backend|api|spring/.test(skills)) roles.add(language === "en" ? "Backend Engineer" : "백엔드 엔지니어");
  roles.add(language === "en" ? "Software Engineer" : "소프트웨어 엔지니어");
  return [...roles].slice(0, 5);
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

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "full_name, school_name, major, gpa_score, gpa_scale, core_skills, tech_stack, skills, role_certifications, language_test_score, internship_count, project_count, target_role, target_industry, preferred_location, portfolio_url, github_url, experience_summary",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const scores = evaluateProfile(profile ?? null);
  const penalties = collectPenalties(profile ?? null);
  const overall = averageScore(scores);
  const benchmark = benchmarkAgainstSyntheticProfiles(overall);
  const displayName = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || (language === "en" ? "User" : "사용자");

  return NextResponse.json({
    name: displayName,
    topPercent: benchmark.topPercent,
    benchmarkSize: benchmark.benchmarkSize,
    benchmarkScore: overall,
    benchmarkMedianScore: benchmark.medianScore,
    completeness: scores.profileCompleteness,
    scores,
    penalties: penalties.map((penalty) => ({
      ...penalty,
      label: language === "en" ? penalty.label : penalty.labelKo,
    })),
    confidenceLabel: confidenceLabel(overall, language),
    explanation: buildExplanation(scores, penalties, language),
    trend: [Math.max(20, overall - 8), Math.max(25, overall - 5), Math.max(30, overall - 2), overall],
    recommendedRoles: recommendedRoles(profile ?? null, language),
    recommendedRoleSource: "profile_fallback",
    signals:
      language === "en"
        ? [
            `Profile Completeness: ${scores.profileCompleteness}`,
            `Market Readiness: ${scores.marketReadiness}`,
            `Interview Readiness: ${scores.interviewReadiness}`,
            `Portfolio Strength: ${scores.portfolioStrength}`,
          ]
        : [
            `프로필 완성도: ${scores.profileCompleteness}`,
            `시장 준비도: ${scores.marketReadiness}`,
            `면접 준비도: ${scores.interviewReadiness}`,
            `포트폴리오 강도: ${scores.portfolioStrength}`,
          ],
    weeklyReport:
      language === "en"
        ? [
            "Add one measurable achievement with numbers.",
            "Publish or link one portfolio proof item.",
            "Make your target role more specific.",
          ]
        : [
            "숫자가 들어간 정량 성과를 하나 추가하세요.",
            "포트폴리오 증거 하나를 공개하거나 링크하세요.",
            "목표 직무를 더 구체적으로 적으세요.",
          ],
  });
}

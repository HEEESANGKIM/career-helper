import type { SyntheticCareerProfile } from "@/lib/career-data";
import { hasPortfolioLinks } from "@/lib/portfolio-links";
import {
  COMPLETION_FIELDS,
  computeValidatedCompletion,
  countValidatedProfileFields,
  isGenericTargetRole,
  profileRowToFormInput,
  type LanguageMode,
  type ProfileDbInput,
} from "@/lib/profile-validation";
import { parseProfileSkills } from "@/lib/skill-list";

export type ReadinessProfile = {
  full_name?: string | null;
  school_name?: string | null;
  major?: string | null;
  gpa_score?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  role_certifications?: string | null;
  language_test_name?: string | null;
  language_test_score?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
  target_industry?: string | null;
  preferred_location?: string | null;
  desired_companies?: string | null;
  portfolio_url?: string | null;
  experience_summary?: string | null;
  graduation_date?: string | null;
};

export type ReadinessScores = {
  profileCompleteness: number;
  marketReadiness: number;
  interviewReadiness: number;
  portfolioStrength: number;
};

export type ReadinessPenalty = {
  id: string;
  label: string;
  labelKo: string;
  points: number;
};

export type ReadinessBenchmark = {
  referenceSize: number;
  medianScore: number;
  betterThanPercent: number;
  deltaFromMedian: number;
};

const clamp = (value: number, min = 5, max = 95) => Math.max(min, Math.min(max, Math.round(value)));

const cleanText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const hasMeasurableAchievement = (profile: ReadinessProfile | null) =>
  /\d|%|\$|won|달러|명|개|배|시간|users|revenue|reduced|increased/i.test(cleanText(profile?.experience_summary));

const isGenericGoal = (profile: ReadinessProfile | null) => isGenericTargetRole(cleanText(profile?.target_role));

const getSkillDepth = (profile: ReadinessProfile | null) => parseProfileSkills(profile).length;

export const collectReadinessPenalties = (profile: ReadinessProfile | null): ReadinessPenalty[] => {
  const penalties: ReadinessPenalty[] = [];
  const projectCount = Number(profile?.project_count ?? 0);
  const skillDepth = getSkillDepth(profile);

  if (projectCount <= 0) {
    penalties.push({ id: "missing-projects", label: "Missing projects", labelKo: "프로젝트 없음", points: 8 });
  } else if (projectCount === 1) {
    penalties.push({ id: "thin-projects", label: "Limited project depth", labelKo: "프로젝트 깊이 부족", points: 4 });
  }

  if (!hasMeasurableAchievement(profile)) {
    penalties.push({ id: "no-metrics", label: "No measurable achievements", labelKo: "정량 성과 부족", points: 6 });
  }

  if (isGenericGoal(profile)) {
    penalties.push({ id: "generic-goal", label: "Generic career goal", labelKo: "목표 직무가 너무 일반적임", points: 5 });
  }

  if (skillDepth < 4) {
    penalties.push({ id: "weak-skill-depth", label: "Weak skill depth", labelKo: "스킬 깊이 부족", points: 5 });
  }

  if (!hasPortfolioLinks(profile?.portfolio_url)) {
    penalties.push({ id: "empty-portfolio", label: "No portfolio link", labelKo: "포트폴리오 링크 없음", points: 6 });
  }

  return penalties;
};

const penaltyDeduction = (penalties: ReadinessPenalty[]) =>
  Math.min(28, Math.round(penalties.reduce((sum, penalty) => sum + penalty.points, 0) * 0.55));

const evidenceBonus = (profile: ReadinessProfile | null) => {
  let bonus = 0;
  if (hasMeasurableAchievement(profile)) bonus += 4;
  if (hasPortfolioLinks(profile?.portfolio_url)) bonus += 4;
  if (Number(profile?.project_count ?? 0) >= 2) bonus += 3;
  if (Number(profile?.internship_count ?? 0) >= 1) bonus += 2;
  if (!isGenericGoal(profile) && cleanText(profile?.target_role)) bonus += 2;
  return bonus;
};

export const profileCompletionPercent = (profile: ReadinessProfile | null) => {
  if (!profile) return 0;
  return computeValidatedCompletion(profileRowToFormInput(profile as ProfileDbInput));
};

export const evaluateReadinessScores = (profile: ReadinessProfile | null): ReadinessScores => {
  const completionPct = profileCompletionPercent(profile);
  const skillDepth = getSkillDepth(profile);
  const projectCount = Number(profile?.project_count ?? 0);
  const internshipCount = Number(profile?.internship_count ?? 0);
  const hasPortfolio = hasPortfolioLinks(profile?.portfolio_url);
  const hasMetrics = hasMeasurableAchievement(profile);
  const genericGoal = isGenericGoal(profile);
  const penalties = collectReadinessPenalties(profile);
  const deduction = penaltyDeduction(penalties);
  const filledRatio = countValidatedProfileFields(profile as ProfileDbInput) / COMPLETION_FIELDS.length;

  return {
    profileCompleteness: clamp(completionPct - Math.min(8, Math.round(deduction * 0.25))),
    marketReadiness: clamp(
      completionPct * 0.35 +
        skillDepth * 2.5 +
        internshipCount * 3 +
        projectCount * 2.5 +
        (genericGoal ? -6 : 4) +
        (hasMetrics ? 4 : -5) -
        Math.min(12, Math.round(deduction * 0.35)),
    ),
    interviewReadiness: clamp(
      completionPct * 0.3 +
        (profile?.experience_summary ? 10 : 0) +
        (hasMetrics ? 6 : -6) +
        internshipCount * 3 +
        projectCount * 2 +
        (profile?.target_role ? 3 : -4) -
        Math.min(10, Math.round(deduction * 0.3)),
    ),
    portfolioStrength: clamp(
      completionPct * 0.25 +
        projectCount * 6 +
        (hasPortfolio ? 10 : -8) +
        (hasMetrics ? 5 : -4) +
        Math.min(8, skillDepth * 1.5) -
        Math.min(10, Math.round(deduction * 0.25)),
    ),
  };
};

export const overallReadinessScore = (
  profile: ReadinessProfile | null,
  scores: ReadinessScores,
  penalties: ReadinessPenalty[],
) => {
  const completionPct = profileCompletionPercent(profile);
  const axisAverage = Math.round(
    (scores.profileCompleteness + scores.marketReadiness + scores.interviewReadiness + scores.portfolioStrength) / 4,
  );
  const blended = Math.round(completionPct * 0.55 + axisAverage * 0.45 - penaltyDeduction(penalties) + evidenceBonus(profile));
  return clamp(blended);
};

export const syntheticToReadinessProfile = (profile: SyntheticCareerProfile): ReadinessProfile => {
  const half = Math.max(1, Math.ceil(profile.skills.length / 2));
  const hasMetrics = /\d|%|\$|users|revenue|reduced|increased/i.test(
    [profile.year_1_state, profile.year_3_state, profile.year_5_state].join(" "),
  );

  return {
    full_name: "Reference Profile",
    school_name: profile.education_background || "Reference University",
    major: profile.major || "Undeclared",
    core_skills: profile.skills.slice(0, half).join(", "),
    tech_stack: profile.skills.slice(half).join(", ") || profile.skills.join(", "),
    internship_count: profile.internships.length,
    project_count: profile.projects.length,
    target_role: profile.target_role,
    target_industry: profile.target_industry,
    preferred_location: "Seoul",
    desired_companies: "Reference Company",
    role_certifications: profile.skills.length >= 4 ? "Reference Certification" : "",
    language_test_name: hasMetrics ? "TOEIC" : "",
    language_test_score: hasMetrics ? "900" : "",
    experience_summary: [profile.year_1_state, profile.year_3_state, profile.year_5_state].filter(Boolean).join(" "),
    portfolio_url: profile.projects.length >= 2 ? "https://example.com/portfolio" : null,
    graduation_date: "2024-06-01",
  };
};

/** Seed profiles are scored on career narrative evidence, not Settings form completion. */
export const evaluateSyntheticReferenceScore = (profile: SyntheticCareerProfile): number => {
  const projectCount = profile.projects.length;
  const internshipCount = profile.internships.length;
  const skillDepth = profile.skills.length;
  const hasMetrics = /\d|%|\$|users|revenue|reduced|increased/i.test(
    [profile.year_1_state, profile.year_3_state, profile.year_5_state].join(" "),
  );
  const hasSpecificRole = Boolean(profile.target_role?.trim()) && !isGenericTargetRole(profile.target_role);

  let score = 38;
  score += Math.min(16, skillDepth * 2);
  score += Math.min(15, projectCount * 5);
  score += Math.min(12, internshipCount * 4);
  if (hasMetrics) score += 8;
  if (hasSpecificRole) score += 5;
  if (projectCount >= 2) score += 5;
  if (profile.key_decisions.length >= 2) score += 4;

  return clamp(score);
};

export const benchmarkReadiness = (userScore: number, referenceScores: number[]): ReadinessBenchmark => {
  const sorted = [...referenceScores].sort((a, b) => a - b);
  if (!sorted.length) {
    return { referenceSize: 0, medianScore: userScore, betterThanPercent: 0, deltaFromMedian: 0 };
  }

  const medianScore = sorted[Math.floor(sorted.length / 2)] ?? userScore;
  const betterThanCount = sorted.filter((score) => score < userScore).length;
  const betterThanPercent = Math.min(99, Math.round((betterThanCount / sorted.length) * 100));

  return {
    referenceSize: sorted.length,
    medianScore,
    betterThanPercent,
    deltaFromMedian: userScore - medianScore,
  };
};

export const benchmarkSummaryText = (
  benchmark: ReadinessBenchmark,
  readinessScore: number,
  completionPct: number,
  language: LanguageMode,
) => {
  const comparison =
    benchmark.betterThanPercent >= 99
      ? language === "en"
        ? `top of the ${benchmark.referenceSize} reference profiles`
        : `참고 프로필 ${benchmark.referenceSize}개 중 최상위`
      : language === "en"
        ? `ahead of ${benchmark.betterThanPercent}% of ${benchmark.referenceSize} reference profiles`
        : `참고 프로필 ${benchmark.referenceSize}개 중 ${benchmark.betterThanPercent}%보다 높음`;

  const delta = benchmark.deltaFromMedian;
  const deltaText = `${delta >= 0 ? "+" : ""}${delta}`;

  if (language === "en") {
    return `Readiness ${readinessScore}/100 · Settings completion ${completionPct}% · ${comparison} (reference median ${benchmark.medianScore}, ${deltaText}).`;
  }
  return `준비도 ${readinessScore}/100 · Settings 완성도 ${completionPct}% · ${comparison} (참고군 중앙값 ${benchmark.medianScore}, ${deltaText}점).`;
};

export const benchmarkPercentileLabel = (betterThanPercent: number, language: LanguageMode) => {
  if (betterThanPercent >= 99) {
    return language === "en" ? "Top" : "최상위";
  }
  return language === "en" ? `${betterThanPercent}% beat` : `${betterThanPercent}% 초과`;
};

export const readinessConfidenceLabel = (score: number, language: LanguageMode) => {
  if (score < 45) return language === "en" ? "Early Stage" : "초기 단계";
  if (score < 60) return language === "en" ? "Developing" : "성장 중";
  if (score < 75) return language === "en" ? "Competitive" : "경쟁 가능";
  if (score < 85) return language === "en" ? "Strong Profile" : "준비 양호";
  return language === "en" ? "Strong Candidate" : "강한 후보";
};

export const buildReadinessExplanation = (
  scores: ReadinessScores,
  penalties: ReadinessPenalty[],
  completionPct: number,
  language: LanguageMode,
) => {
  const entries = Object.entries(scores) as Array<[keyof ReadinessScores, number]>;
  const strongest = [...entries].sort((a, b) => b[1] - a[1])[0];
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
    if (penalties.length >= 3) {
      return `Settings completion is ${completionPct}%, but evidence depth still limits your readiness score.`;
    }
    return `Settings completion is ${completionPct}%. ${names[strongest[0]]} is strongest; ${names[weakest[0]]} needs the most work.`;
  }

  if (penalties.length >= 3) {
    return `Settings 완성도는 ${completionPct}%이지만, 증거·깊이 부족으로 준비도 점수가 제한됩니다.`;
  }
  return `Settings 완성도 ${completionPct}% 기준입니다. ${names[strongest[0]]}가 가장 강하고 ${names[weakest[0]]} 보완이 필요합니다.`;
};

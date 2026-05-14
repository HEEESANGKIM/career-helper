import { NextRequest, NextResponse } from "next/server";
import {
  cleanText,
  getUserIdFromRequest,
  getUserProfile,
  languageName,
  parseLanguage,
  requestEvaluationJson,
  safeList,
  saveEvaluation,
  saveFeatureRecord,
  validationError,
} from "@/lib/evaluation-server";
import { careerDataCopy, findCareerTemplate, getRelatedSyntheticProfiles, localizeTemplate } from "@/lib/career-data";

export const runtime = "nodejs";

type Language = "ko" | "en";
type RiskLevel = "low" | "medium" | "high";

const normalizeLevel = (value: unknown): RiskLevel => {
  const level = String(value ?? "").toLowerCase();
  return level === "low" || level === "medium" || level === "high" ? level : "medium";
};

function normalizeTimeline(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 5);
}

function normalizePath(value: unknown, fallback: ReturnType<typeof fallbackPaths>[number]) {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    id: cleanText(item.id, 60) || fallback.id,
    title: cleanText(item.title, 120) || fallback.title,
    fitLevel: normalizeLevel(item.fitLevel ?? fallback.fitLevel),
    riskLevel: normalizeLevel(item.riskLevel ?? fallback.riskLevel),
    timeline: normalizeTimeline(item.timeline, fallback.timeline),
    pros: safeList(item.pros, fallback.pros, 5),
    cons: safeList(item.cons, fallback.cons, 5),
    bestFor: cleanText(item.bestFor, 500) || fallback.bestFor,
    mainBottleneck: cleanText(item.mainBottleneck, 500) || fallback.mainBottleneck,
    nextMove: cleanText(item.nextMove, 500) || fallback.nextMove,
  };
}

function normalizeDecision(value: unknown, fallback: ReturnType<typeof fallbackDecisions>[number]) {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    id: cleanText(item.id, 80) || fallback.id,
    title: cleanText(item.title, 180) || fallback.title,
    riskImpact: cleanText(item.riskImpact, 400) || fallback.riskImpact,
    timelineImpact: cleanText(item.timelineImpact, 400) || fallback.timelineImpact,
    skillGapImpact: cleanText(item.skillGapImpact, 400) || fallback.skillGapImpact,
    nextAction: cleanText(item.nextAction, 500) || fallback.nextAction,
  };
}

function normalizeRiskEvent(value: unknown, fallback: ReturnType<typeof fallbackRiskEvents>[number]) {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    title: cleanText(item.title, 160) || fallback.title,
    description: cleanText(item.description, 500) || fallback.description,
    impact: cleanText(item.impact, 500) || fallback.impact,
    prevention: cleanText(item.prevention, 500) || fallback.prevention,
  };
}

function fallbackPaths(language: Language, targetRole: string) {
  if (language === "en") {
    return [
      {
        id: "safe",
        title: "Safe Route",
        fitLevel: "high" as const,
        riskLevel: "low" as const,
        timeline: ["Year 0: Apply to beginner-friendly roles", "Year 1: Build stable role experience", "Year 2: Move toward stronger target teams"],
        pros: ["Lower risk", "Faster first job", "More interview volume"],
        cons: ["May start below ideal title", "Growth can be slower"],
        bestFor: "Students and new grads who need a stable first role quickly.",
        mainBottleneck: "Turning general experience into clear role-specific proof.",
        nextMove: `Apply to 20 entry-level ${targetRole || "target role"} openings and tune your resume keywords.`,
      },
      {
        id: "growth",
        title: "Growth Route",
        fitLevel: "medium" as const,
        riskLevel: "medium" as const,
        timeline: ["Year 0: Build portfolio and apply selectively", "Year 1: Join a high-learning team", "Year 2: Convert ownership into stronger offers"],
        pros: ["Fast learning", "Stronger portfolio story", "Higher upside"],
        cons: ["More ambiguity", "Requires self-direction"],
        bestFor: "Candidates who can tolerate uncertainty and want faster skill growth.",
        mainBottleneck: "Building enough proof before the market loses patience.",
        nextMove: "Choose one portfolio project and ship a credible version in 30 days.",
      },
      {
        id: "credential",
        title: "Credential Route",
        fitLevel: "medium" as const,
        riskLevel: "medium" as const,
        timeline: ["Year 0: Complete certification or structured program", "Year 1: Use credential to enter interviews", "Year 2: Pair credential with work proof"],
        pros: ["Clear learning structure", "Improves weak resume signals", "Good for switchers"],
        cons: ["Costs time or money", "Credential alone is not enough"],
        bestFor: "Career switchers or students with weak direct experience.",
        mainBottleneck: "Avoiding credential collection without applied proof.",
        nextMove: "Pick one role-specific certification and pair it with a public project.",
      },
    ];
  }

  return [
    {
      id: "safe",
      title: "안정 루트",
      fitLevel: "high" as const,
      riskLevel: "low" as const,
      timeline: ["0년차: 입문 친화 공고에 집중 지원", "1년차: 안정적인 실무 경험 확보", "2년차: 더 강한 목표 팀으로 이동 준비"],
      pros: ["리스크가 낮음", "첫 취업 가능성이 높음", "면접 기회가 많음"],
      cons: ["처음 직무명이 이상적이지 않을 수 있음", "성장 속도가 느릴 수 있음"],
      bestFor: "첫 직장을 빠르게 확보해야 하는 학생과 신입에게 적합합니다.",
      mainBottleneck: "일반 경험을 목표 직무에 맞는 증거로 바꾸는 것.",
      nextMove: `${targetRole || "목표 직무"} 입문 공고 20개에 맞춰 이력서 키워드를 조정하세요.`,
    },
    {
      id: "growth",
      title: "성장 루트",
      fitLevel: "medium" as const,
      riskLevel: "medium" as const,
      timeline: ["0년차: 포트폴리오를 만들며 선별 지원", "1년차: 학습 밀도가 높은 팀 합류", "2년차: 오너십 경험을 더 강한 제안으로 전환"],
      pros: ["빠른 학습", "강한 포트폴리오 스토리", "높은 성장 가능성"],
      cons: ["불확실성이 큼", "자기주도성이 필요함"],
      bestFor: "불확실성을 감수하고 빠르게 성장하고 싶은 지원자에게 적합합니다.",
      mainBottleneck: "시장 타이밍을 놓치기 전에 충분한 증거를 만드는 것.",
      nextMove: "포트폴리오 프로젝트 하나를 정하고 30일 안에 공개 가능한 버전을 만드세요.",
    },
    {
      id: "credential",
      title: "자격 강화 루트",
      fitLevel: "medium" as const,
      riskLevel: "medium" as const,
      timeline: ["0년차: 자격증 또는 구조화된 교육 이수", "1년차: 자격 신호로 면접 진입", "2년차: 자격과 실무 증거를 연결"],
      pros: ["학습 구조가 명확함", "약한 이력서 신호 보완", "전환자에게 유리"],
      cons: ["시간 또는 비용이 듦", "자격만으로는 부족함"],
      bestFor: "직접 경험이 부족한 학생, 신입, 직무 전환자에게 적합합니다.",
      mainBottleneck: "자격증만 쌓고 적용 증거가 없는 상태를 피하는 것.",
      nextMove: "직무 관련 자격 하나를 고르고 공개 프로젝트와 함께 준비하세요.",
    },
  ];
}

function fallbackDecisions(language: Language) {
  if (language === "en") {
    return [
      { id: "portfolio-90", title: "What if I focus on portfolio for 90 days?", riskImpact: "Lowers skill-signal risk.", timelineImpact: "May delay applications by 2-4 weeks.", skillGapImpact: "Closes proof and storytelling gaps.", nextAction: "Define one project with a role-specific problem and measurable outcome." },
      { id: "apply-now", title: "What if I apply immediately?", riskImpact: "Raises interview-failure risk if proof is weak.", timelineImpact: "Fastest market feedback.", skillGapImpact: "Reveals resume and interview gaps quickly.", nextAction: "Apply to 20 beginner-friendly roles and track rejection reasons." },
      { id: "grad-school", title: "What if I go to graduate school?", riskImpact: "Lowers credential risk but raises time/cost risk.", timelineImpact: "Adds 1-2 years before full-time entry.", skillGapImpact: "Improves depth but still needs applied proof.", nextAction: "Compare program cost against target role requirements." },
      { id: "startup-first", title: "What if I choose startup first?", riskImpact: "Higher stability risk, stronger ownership upside.", timelineImpact: "Can accelerate learning in year one.", skillGapImpact: "Builds broad execution proof.", nextAction: "Target startups where you can own one visible project." },
      { id: "big-tech-prep", title: "What if I prepare for big tech interviews?", riskImpact: "Higher interview-failure risk, stronger upside.", timelineImpact: "Requires 8-12 weeks of focused prep.", skillGapImpact: "Improves structured problem solving.", nextAction: "Schedule weekly mock interviews and track misses." },
    ];
  }
  return [
    { id: "portfolio-90", title: "90일 동안 포트폴리오에 집중하면?", riskImpact: "역량 증거 부족 리스크가 낮아집니다.", timelineImpact: "지원 시작이 2-4주 늦어질 수 있습니다.", skillGapImpact: "증거와 스토리텔링 갭을 줄입니다.", nextAction: "직무 문제와 측정 가능한 결과가 있는 프로젝트 하나를 정의하세요." },
    { id: "apply-now", title: "지금 바로 지원하면?", riskImpact: "증거가 약하면 면접 실패 리스크가 올라갑니다.", timelineImpact: "가장 빠르게 시장 피드백을 받습니다.", skillGapImpact: "이력서와 면접 갭이 빠르게 드러납니다.", nextAction: "입문 친화 공고 20개에 지원하고 탈락 이유를 기록하세요." },
    { id: "grad-school", title: "대학원에 가면?", riskImpact: "학력 신호 리스크는 낮지만 시간/비용 리스크가 커집니다.", timelineImpact: "정규직 진입이 1-2년 늦어질 수 있습니다.", skillGapImpact: "깊이는 좋아지지만 적용 증거가 필요합니다.", nextAction: "프로그램 비용과 목표 직무 요구사항을 비교하세요." },
    { id: "startup-first", title: "스타트업을 먼저 선택하면?", riskImpact: "안정성 리스크는 높지만 오너십 기회가 큽니다.", timelineImpact: "1년차 학습 속도가 빨라질 수 있습니다.", skillGapImpact: "넓은 실행 증거를 만들 수 있습니다.", nextAction: "눈에 보이는 프로젝트를 맡을 수 있는 스타트업을 찾으세요." },
    { id: "big-tech-prep", title: "빅테크 면접을 준비하면?", riskImpact: "면접 실패 리스크는 높지만 보상 가능성이 큽니다.", timelineImpact: "8-12주의 집중 준비가 필요합니다.", skillGapImpact: "구조적 문제 해결 능력이 좋아집니다.", nextAction: "매주 모의 면접을 예약하고 틀린 유형을 기록하세요." },
  ];
}

function fallbackRiskEvents(language: Language) {
  if (language === "en") {
    return [
      { title: "Hiring freeze", description: "Target companies may reduce entry-level openings.", impact: "Slower response and fewer interviews.", prevention: "Keep a wider company list and include stable industries." },
      { title: "Weak portfolio", description: "Projects do not show role-specific proof.", impact: "Resume screens and interviews become harder.", prevention: "Build one targeted project with clear before/after evidence." },
      { title: "Interview failure", description: "Answers are too generic or unstructured.", impact: "Good applications may not convert.", prevention: "Practice 5 mock interviews and prepare 3 STAR stories." },
      { title: "Burnout", description: "Applying, studying, and projects compete for energy.", impact: "Quality drops across all work.", prevention: "Use a weekly plan with one main focus and recovery time." },
      { title: "Skill mismatch", description: "Current skills do not match target role keywords.", impact: "Lower callback rate.", prevention: "Map 10 job descriptions and close the top 3 repeated gaps." },
    ];
  }
  return [
    { title: "채용 동결", description: "목표 회사의 신입 채용이 줄어들 수 있습니다.", impact: "응답이 늦고 면접 기회가 줄어듭니다.", prevention: "지원 회사군을 넓히고 안정 산업도 포함하세요." },
    { title: "약한 포트폴리오", description: "프로젝트가 직무별 증거를 충분히 보여주지 못합니다.", impact: "서류와 면접 통과가 어려워집니다.", prevention: "명확한 전후 결과가 있는 타깃 프로젝트 하나를 만드세요." },
    { title: "면접 실패", description: "답변이 일반적이거나 구조가 약합니다.", impact: "좋은 지원도 최종 결과로 이어지지 않습니다.", prevention: "모의 면접 5회와 STAR 스토리 3개를 준비하세요." },
    { title: "번아웃", description: "지원, 공부, 프로젝트가 동시에 에너지를 소모합니다.", impact: "전체 준비 품질이 떨어집니다.", prevention: "주간 계획에 핵심 목표 하나와 회복 시간을 넣으세요." },
    { title: "스킬 미스매치", description: "현재 기술이 목표 직무 키워드와 맞지 않습니다.", impact: "서류 콜백률이 낮아집니다.", prevention: "공고 10개를 분석하고 반복되는 상위 3개 갭을 닫으세요." },
  ];
}

function fallbackPlan(language: Language) {
  return language === "en"
    ? ["Build one targeted portfolio project", "Apply to 20 beginner-friendly roles", "Practice 5 mock interviews", "Improve resume keywords", "Contact 10 alumni or recruiters", "Complete one role-specific certification", "Prepare 3 STAR stories"]
    : ["타깃 포트폴리오 프로젝트 1개 만들기", "입문 친화 공고 20개 지원하기", "모의 면접 5회 연습하기", "이력서 키워드 개선하기", "동문 또는 리크루터 10명에게 연락하기", "직무 관련 자격/강의 1개 완료하기", "STAR 스토리 3개 준비하기"];
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const language = parseLanguage(body?.language);
  const currentStatus = cleanText(body?.currentStatus, 160);
  const majorBackground = cleanText(body?.majorBackground, 240);
  const currentSkills = cleanText(body?.currentSkills, 800);
  const experienceLevel = cleanText(body?.experienceLevel, 120);
  const targetRole = cleanText(body?.targetRole, 160);
  const targetCompanyType = cleanText(body?.targetCompanyType, 160);
  const timeline = cleanText(body?.timeline, 80);
  const riskTolerance = cleanText(body?.riskTolerance, 80);
  const careerPriority = cleanText(body?.careerPriority, 160);

  if (!currentStatus || !targetRole || !timeline || !riskTolerance || !careerPriority) {
    return validationError("currentStatus, targetRole, timeline, riskTolerance, and careerPriority are required.");
  }

  const userId = await getUserIdFromRequest(request);
  const profile = await getUserProfile(userId);
  const template = findCareerTemplate(targetRole);
  const localizedTemplate = localizeTemplate(template, language);
  const syntheticExamples = getRelatedSyntheticProfiles(targetRole, 5);
  const pathFallback = fallbackPaths(language, targetRole);
  const decisionFallback = fallbackDecisions(language);
  const riskFallback = fallbackRiskEvents(language);
  const planFallback = fallbackPlan(language);

  const prompt = [
    "You are PathMate.ai Next Move, an AI career strategy board for students, new graduates, interns, entry-level job seekers, and career switchers.",
    "Hide technical simulation complexity. Do not mention Monte Carlo. Be practical, action-oriented, and easy to understand.",
    "Avoid fake precise probabilities. Use qualitative Low/Medium/High labels.",
    `Return JSON only in ${languageName(language)}.`,
    "Schema:",
    `{
  "summary": string,
  "recommendedPath": string,
  "paths": [
    {
      "id": "safe" | "growth" | "credential",
      "title": string,
      "fitLevel": "low" | "medium" | "high",
      "riskLevel": "low" | "medium" | "high",
      "timeline": string[],
      "pros": string[],
      "cons": string[],
      "bestFor": string,
      "mainBottleneck": string,
      "nextMove": string
    }
  ],
  "parallelTimelines": string[],
  "decisionCards": [
    {
      "id": string,
      "title": string,
      "riskImpact": string,
      "timelineImpact": string,
      "skillGapImpact": string,
      "nextAction": string
    }
  ],
  "riskEvents": [
    {
      "title": string,
      "description": string,
      "impact": string,
      "prevention": string
    }
  ],
  "skillGaps": string[],
  "ninetyDayPlan": string[]
}`,
    "",
    `currentStatus: ${currentStatus}`,
    `majorBackground: ${majorBackground}`,
    `currentSkills: ${currentSkills}`,
    `experienceLevel: ${experienceLevel}`,
    `targetRole: ${targetRole}`,
    `targetCompanyType: ${targetCompanyType}`,
    `timeline: ${timeline}`,
    `riskTolerance: ${riskTolerance}`,
    `careerPriority: ${careerPriority}`,
    `roleTemplate: ${JSON.stringify(localizedTemplate)}`,
    `syntheticEarlyCareerExamples: ${JSON.stringify(syntheticExamples)}`,
    `userProfileData: ${JSON.stringify(profile ?? {})}`,
  ].join("\n");

  let source: "openai" | "demo_fallback" = "demo_fallback";
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await requestEvaluationJson(prompt);
    source = parsed ? "openai" : "demo_fallback";
  } catch {
    parsed = null;
  }

  const parsedPaths = Array.isArray(parsed?.paths) ? parsed.paths : [];
  const parsedDecisions = Array.isArray(parsed?.decisionCards) ? parsed.decisionCards : [];
  const parsedRisks = Array.isArray(parsed?.riskEvents) ? parsed.riskEvents : [];
  const result = {
    sourceNote: careerDataCopy[language],
    roleTemplate: localizedTemplate,
    summary:
      cleanText(parsed?.summary, 1200) ||
      (language === "en"
        ? "Your best first move is to create visible proof while applying to beginner-friendly roles."
        : "가장 좋은 첫 수는 입문 친화 공고에 지원하면서 눈에 보이는 직무 증거를 만드는 것입니다."),
    recommendedPath: cleanText(parsed?.recommendedPath, 300) || pathFallback[0].title,
    paths: pathFallback.map((fallback, index) => normalizePath(parsedPaths[index], fallback)),
    parallelTimelines: safeList(
      parsed?.parallelTimelines,
      pathFallback.map((path) => `${path.title}: ${path.timeline.join(" -> ")}`),
      6,
    ),
    decisionCards: decisionFallback.map((fallback, index) => normalizeDecision(parsedDecisions[index], fallback)),
    riskEvents: riskFallback.map((fallback, index) => normalizeRiskEvent(parsedRisks[index], fallback)),
    skillGaps: safeList(parsed?.skillGaps, language === "en" ? ["Role-specific proof", "Interview storytelling", "Resume keyword alignment"] : ["직무별 증거", "면접 스토리텔링", "이력서 키워드 정렬"], 8),
    ninetyDayPlan: safeList(parsed?.ninetyDayPlan, planFallback, 7),
  };

  const input = { currentStatus, majorBackground, currentSkills, experienceLevel, targetRole, targetCompanyType, timeline, riskTolerance, careerPriority, userProfileData: profile ?? null };
  const saved = await saveEvaluation({
    userId,
    featureType: "career-chess",
    input,
    output: result,
    overallScore: null,
    language,
  });

  await saveFeatureRecord({
    table: "career_simulations",
    payload: {
      user_id: userId,
      current_role: currentStatus,
      target_role: targetRole,
      timeline_years: Number.parseInt(timeline, 10) || null,
      risk_tolerance: riskTolerance,
      selected_path: result.recommendedPath,
      input_json: input,
      output_json: result,
      language,
      evaluation_id: saved?.id ?? null,
    },
  });

  return NextResponse.json({ ...result, source, evaluationId: saved?.id ?? null, savedAt: saved?.created_at ?? null });
}

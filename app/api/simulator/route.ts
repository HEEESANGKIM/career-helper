import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

type LanguageMode = "ko" | "en";

type LocalizedText = {
  ko: string;
  en: string;
};

type VirtualPosting = {
  id: string;
  title: LocalizedText;
  company: string;
  role: LocalizedText;
  location: LocalizedText;
  deadline: string;
  humanApplicants: number;
  description: LocalizedText;
  requirements: LocalizedText[];
  screeningFocus: LocalizedText[];
  source: "ai_generated" | "template_fallback";
};

type PostingCandidate = Partial<
  Omit<VirtualPosting, "title" | "role" | "location" | "description" | "requirements" | "screeningFocus" | "source"> & {
    title: Partial<LocalizedText> | string;
    role: Partial<LocalizedText> | string;
    location: Partial<LocalizedText> | string;
    description: Partial<LocalizedText> | string;
    requirements: Array<Partial<LocalizedText> | string>;
    screeningFocus: Array<Partial<LocalizedText> | string>;
  }
>;

const parseJson = (text: string) => {
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

const clampScore = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

const parseLanguage = (value: unknown): LanguageMode => (String(value ?? "").toLowerCase() === "en" ? "en" : "ko");

const cleanText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const readNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const todayKst = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const fixedMayDeadlineIso = (day: number) => {
  const deadline = new Date(Date.UTC(2026, 4, day, 14, 59, 59, 0));
  return deadline.toISOString();
};

const isOpenDeadline = (deadline: string) => {
  const time = new Date(deadline).getTime();
  return Number.isFinite(time) && time > Date.now();
};

const normalizeDeadline = (_value: unknown, index: number) => {
  return fixedMayDeadlineIso(8 + index * 7);
};

const localizedText = (value: unknown, fallbackKo: string, fallbackEn: string): LocalizedText => {
  if (typeof value === "string") {
    const text = cleanText(value);
    return { ko: text || fallbackKo, en: text || fallbackEn };
  }

  if (value && typeof value === "object") {
    const typed = value as Partial<LocalizedText>;
    return {
      ko: cleanText(typed.ko) || fallbackKo,
      en: cleanText(typed.en) || fallbackEn,
    };
  }

  return { ko: fallbackKo, en: fallbackEn };
};

const localizedList = (value: unknown, fallback: LocalizedText[]) => {
  if (!Array.isArray(value)) return fallback;

  const items = value
    .map((item, idx) => localizedText(item, fallback[idx]?.ko ?? "", fallback[idx]?.en ?? ""))
    .filter((item) => item.ko || item.en)
    .slice(0, 4);

  return items.length > 0 ? items : fallback;
};

const buildTemplatePostings = (language: LanguageMode, targetRole: string): VirtualPosting[] => {
  const roleKo = cleanText(targetRole) || (language === "en" ? "Software Engineer" : "소프트웨어 엔지니어");
  const roleEn = language === "en" ? roleKo : "Software Engineer";

  return [
    {
      id: "vh-samsung-01",
      title: { ko: "소프트웨어 엔지니어 (DX 부문)", en: "Software Engineer (DX Division)" },
      company: "Samsung Electronics",
      role: { ko: roleKo, en: roleEn },
      location: { ko: "서울", en: "Seoul" },
      deadline: fixedMayDeadlineIso(10),
      humanApplicants: 7,
      description: {
        ko: "대규모 소비자 서비스 및 내부 시스템을 위한 플랫폼 소프트웨어 개발 포지션입니다.",
        en: "Platform engineering role for large-scale consumer products and internal systems.",
      },
      requirements: [
        { ko: "프로젝트 문제 정의와 구현 근거 설명", en: "Explain project problem framing and implementation rationale" },
        { ko: "Git 기반 협업 경험", en: "Git-based collaboration experience" },
        { ko: "정량 성과 또는 검증 지표 제시", en: "Quantified results or validation metrics" },
      ],
      screeningFocus: [
        { ko: "직무 키워드와 경험의 직접성", en: "Direct match between role keywords and experience" },
        { ko: "면접 답변의 구조와 근거", en: "Interview answer structure and evidence" },
      ],
      source: "template_fallback",
    },
    {
      id: "vh-google-01",
      title: { ko: "어소시에이트 소프트웨어 엔지니어", en: "Associate Software Engineer" },
      company: "Google",
      role: { ko: "백엔드 엔지니어", en: "Backend Engineer" },
      location: { ko: "서울 / 하이브리드", en: "Seoul / Hybrid" },
      deadline: fixedMayDeadlineIso(17),
      humanApplicants: 5,
      description: {
        ko: "확장 가능한 백엔드 개발, 데이터 기반 제품 개선, 크로스팀 협업 중심 역할입니다.",
        en: "Focuses on scalable backend services, data-driven iteration, and cross-functional collaboration.",
      },
      requirements: [
        { ko: "SQL 또는 분석 기반 의사결정 경험", en: "SQL or analytics-based decision making" },
        { ko: "프론트엔드/백엔드 중 하나 이상의 구현 경험", en: "Frontend or backend implementation experience" },
        { ko: "A/B 테스트나 지표 해석 경험", en: "A/B testing or metric interpretation experience" },
      ],
      screeningFocus: [
        { ko: "문제 해결 흐름", en: "Problem-solving flow" },
        { ko: "성과 지표의 구체성", en: "Specificity of impact metrics" },
      ],
      source: "template_fallback",
    },
    {
      id: "vh-startup-01",
      title: { ko: "초기 프론트엔드 엔지니어", en: "Early Frontend Engineer" },
      company: "Korean IT Startup (Stealth)",
      role: { ko: "프론트엔드 개발자", en: "Frontend Engineer" },
      location: { ko: "서울", en: "Seoul" },
      deadline: fixedMayDeadlineIso(24),
      humanApplicants: 6,
      description: {
        ko: "MVP부터 운영까지 프론트엔드 아키텍처를 주도하며 빠르게 기능을 출시하는 포지션입니다.",
        en: "Owns frontend architecture from MVP to production and ships features quickly.",
      },
      requirements: [
        { ko: "React 기반 화면 구현 경험", en: "React-based UI implementation experience" },
        { ko: "빠른 제품 실험과 사용자 피드백 반영", en: "Fast product experiments and user feedback iteration" },
        { ko: "컴포넌트 설계와 상태 관리 이해", en: "Component design and state management understanding" },
      ],
      screeningFocus: [
        { ko: "제품 감각과 구현 속도", en: "Product sense and shipping speed" },
        { ko: "프론트엔드 구조화 역량", en: "Frontend structure and maintainability" },
      ],
      source: "template_fallback",
    },
  ];
};

const normalizePosting = (item: PostingCandidate, index: number, source: VirtualPosting["source"]): VirtualPosting | null => {
  const title = localizedText(item.title, `가상 채용 공고 ${index + 1}`, `Mock Hiring Posting ${index + 1}`);
  const role = localizedText(item.role, "소프트웨어 엔지니어", "Software Engineer");
  const location = localizedText(item.location, "서울", "Seoul");
  const description = localizedText(
    item.description,
    "실전 채용 흐름을 연습하기 위한 현실적인 가상 공고입니다.",
    "A realistic mock posting for practicing an end-to-end hiring process.",
  );
  const deadline = normalizeDeadline(item.deadline, index);

  if (!isOpenDeadline(deadline)) return null;

  return {
    id: cleanText(item.id) || `vh-ai-${index + 1}`,
    title,
    company: cleanText(item.company) || `Fictional Tech Studio ${index + 1}`,
    role,
    location,
    deadline,
    humanApplicants: clampScore(readNumber(item.humanApplicants, 5), 2, 9),
    description,
    requirements: localizedList(item.requirements, [
      { ko: "직무 관련 프로젝트 경험", en: "Role-relevant project experience" },
      { ko: "문제 해결 과정 설명 능력", en: "Ability to explain problem-solving process" },
      { ko: "정량 성과 또는 학습 근거", en: "Quantified impact or learning evidence" },
    ]),
    screeningFocus: localizedList(item.screeningFocus, [
      { ko: "기술 선택 근거", en: "Technical decision rationale" },
      { ko: "협업과 커뮤니케이션", en: "Collaboration and communication" },
      { ko: "성과의 구체성", en: "Specificity of impact" },
    ]),
    source,
  };
};

const generateVirtualPostings = async (
  language: LanguageMode,
  profileSummary: string,
  targetRole: string,
): Promise<{ items: VirtualPosting[]; source: VirtualPosting["source"] }> => {
  const fallback = buildTemplatePostings(language, targetRole).filter((posting) => isOpenDeadline(posting.deadline));
  if (!openai) {
    return { items: fallback, source: "template_fallback" as const };
  }

  try {
    const today = todayKst();
    const prompt = [
      language === "en"
        ? "Create realistic fictional job postings for a hiring-process simulator."
        : "채용 전형 시뮬레이터용 현실적인 가상 공고를 생성한다.",
      language === "en"
        ? "All postings must be fictional. Do not use real company names or claim the jobs are real."
        : "모든 공고는 가상이어야 한다. 실제 기업명이나 실제 공고처럼 보이는 주장은 금지한다.",
      language === "en"
        ? `Today is ${today}. Deadlines must be future dates, 7 to 30 days after today. Closed or expired postings must not be included.`
        : `오늘은 ${today}이다. 마감일은 반드시 오늘 이후 7~30일 사이여야 하며, 마감/종료 공고는 포함하지 않는다.`,
      language === "en"
        ? "Make the postings practical: realistic screening criteria, applicant pool pressure, and role-specific requirements."
        : "실전처럼 느껴지도록 직무별 요구사항, 서류/자소서/면접 평가 포인트, 경쟁 풀 압박을 현실적으로 구성한다.",
      language === "en" ? "Return JSON only." : "반드시 JSON만 반환한다.",
<<<<<<< HEAD
      language === "en"
        ? "The simulator UI is in English: make every en field read like native English; ko fields should still be coherent Korean."
        : "시뮬레이터 UI가 한국어다: ko 필드는 자연스러운 한국어로, en 필드도 문맥에 맞는 영어로 작성한다.",
=======
>>>>>>> origin/dohyeon
      `profileSummary: ${profileSummary || "not provided"}`,
      `targetRole: ${targetRole || "not provided"}`,
      "schema:",
      `{
  "items": [
    {
      "id": "vh-ai-...",
      "title": { "ko": "...", "en": "..." },
      "company": "fictional company name",
      "role": { "ko": "...", "en": "..." },
      "location": { "ko": "...", "en": "..." },
      "deadline": "ISO-8601 future date",
      "humanApplicants": 2-9,
      "description": { "ko": "...", "en": "..." },
      "requirements": [{ "ko": "...", "en": "..." }],
      "screeningFocus": [{ "ko": "...", "en": "..." }]
    }
  ]
}`,
    ].join("\n");

    const response = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
    const parsed = parseJson(response.output_text?.trim() ?? "");
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    const items = rawItems
      .map((item: PostingCandidate, idx: number) => normalizePosting(item, idx, "ai_generated"))
      .filter((item: VirtualPosting | null): item is VirtualPosting => Boolean(item))
      .slice(0, 6);

    return { items: items.length > 0 ? items : fallback, source: items.length > 0 ? ("ai_generated" as const) : ("template_fallback" as const) };
  } catch {
    return { items: fallback, source: "template_fallback" as const };
  }
};

const buildQuestionFallback = (language: LanguageMode, role: string, level: string) => {
  if (language === "en") {
    return {
      question: `For a ${level} ${role} role, explain a recent case where you defined and solved a problem using the STAR structure.`,
      timeLimitSec: 120,
      rubric: ["Problem framing", "Technical decision rationale", "Measured impact", "Communication & collaboration"],
      followUps: [
        "How did you validate that your solution actually worked?",
        "If you had one more sprint, what would you improve first?",
      ],
      expectedSignals: ["Clear ownership", "Numbers-backed outcomes", "Tradeoff awareness"],
    };
  }

  return {
    question: `${level} ${role} 포지션 기준으로, 최근 프로젝트에서 문제를 정의하고 해결한 사례를 STAR 구조로 설명해 주세요.`,
    timeLimitSec: 120,
    rubric: ["문제 정의", "기술 선택 근거", "정량 성과", "협업 커뮤니케이션"],
    followUps: ["해결안이 실제로 효과 있었는지 어떻게 검증했나요?", "한 스프린트를 더 쓸 수 있다면 무엇을 개선하겠나요?"],
    expectedSignals: ["주도성", "수치 기반 성과", "트레이드오프 이해"],
  };
};

const buildEvaluationFallback = (language: LanguageMode, answer: string) => {
  const fallbackScore = clampScore(Math.min(1, answer.length / 750) * 100, 20, 92);

  if (language === "en") {
    return {
      score: fallbackScore,
      summary: "Baseline score was assigned from response structure and signal density.",
      strengths: ["Mentions relevant project context", "Shows role alignment"],
      improvements: ["Add quantified outcomes (%, latency, throughput)", "Clarify why your technical choice beat alternatives"],
      categoryScores: {
        problemSolving: clampScore(fallbackScore - 4, 1, 99),
        technicalDepth: clampScore(fallbackScore - 2, 1, 99),
        communication: clampScore(fallbackScore, 1, 99),
        impact: clampScore(fallbackScore - 5, 1, 99),
      },
      hiringSignal: fallbackScore >= 75 ? "proceed" : "hold",
      nextStepAdvice: [
        "Rebuild your answer in STAR order with one metric per step.",
        "Add one explicit tradeoff and one risk mitigation.",
      ],
    };
  }

  return {
    score: fallbackScore,
    summary: "답변의 구조와 근거 밀도를 기준으로 기본 점수를 부여했습니다.",
    strengths: ["프로젝트 맥락을 언급함", "직무 적합도를 표현함"],
    improvements: ["성과 수치(%, 시간, 비용)를 명시하세요", "기술 선택 이유를 대안과 비교해 설명하세요"],
    categoryScores: {
      problemSolving: clampScore(fallbackScore - 4, 1, 99),
      technicalDepth: clampScore(fallbackScore - 2, 1, 99),
      communication: clampScore(fallbackScore, 1, 99),
      impact: clampScore(fallbackScore - 5, 1, 99),
    },
    hiringSignal: fallbackScore >= 75 ? "proceed" : "hold",
    nextStepAdvice: [
      "STAR 순서로 다시 정리하고 각 단계에 숫자 지표를 1개 이상 넣으세요.",
      "대안과의 트레이드오프, 리스크 대응을 한 줄씩 추가하세요.",
    ],
  };
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const mode = String(body?.mode ?? "");
  const language = parseLanguage(body?.language);

  if (mode === "postings") {
    const profileSummary = cleanText(body?.profileSummary).slice(0, 1800);
    const targetRole = cleanText(body?.targetRole).slice(0, 120);
    const useAiPostings = body?.useAiPostings === true;
    const generated = useAiPostings
      ? await generateVirtualPostings(language, profileSummary, targetRole)
      : {
          items: buildTemplatePostings(language, targetRole),
          source: "template_fallback" as const,
        };
    const items = generated.items.filter((posting) => isOpenDeadline(posting.deadline));

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        source: generated.source,
        items,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  if (mode === "question") {
    const role = String(body?.targetRole ?? (language === "en" ? "software engineer" : "개발자"));
    const level = String(body?.level ?? (language === "en" ? "junior" : "주니어"));
    const fallback = buildQuestionFallback(language, role, level);

    if (!openai) return NextResponse.json(fallback);

    try {
      const prompt = [
        language === "en"
          ? "You are a strict interviewer for real hiring rounds."
          : "너는 실제 채용 라운드에서 평가하는 엄격한 면접관이다.",
        language === "en"
          ? "Create one high-signal interview question with realistic constraints and practical follow-ups."
          : "실무 맥락이 있는 고신호 면접 질문 1개와 후속 질문을 만든다.",
        language === "en"
          ? "Return JSON only. Keep wording natural and specific to the role."
          : "반드시 JSON만 반환하고, 직무 맥락에 맞게 구체적으로 작성한다.",
<<<<<<< HEAD
        language === "en"
          ? "All string fields in the JSON (question, rubric, followUps, expectedSignals) must be in English."
          : "JSON의 모든 문자열 필드(질문, 루브릭, 후속 질문, 기대 신호)는 반드시 한국어로 작성한다.",
=======
>>>>>>> origin/dohyeon
        `role: ${role}`,
        `level: ${level}`,
        "schema:",
        `{
  "question": string,
  "timeLimitSec": number,
  "rubric": [string, string, string, string],
  "followUps": [string, string, string],
  "expectedSignals": [string, string, string]
}`,
      ].join("\n");

      const response = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
      const parsed = parseJson(response.output_text?.trim() ?? "");
      if (!parsed) return NextResponse.json(fallback);

      return NextResponse.json({
        question: String(parsed.question ?? fallback.question),
        timeLimitSec:
          typeof parsed.timeLimitSec === "number"
            ? clampScore(parsed.timeLimitSec, 60, 240)
            : fallback.timeLimitSec,
        rubric: Array.isArray(parsed.rubric) ? parsed.rubric.map(String).slice(0, 4) : fallback.rubric,
        followUps: Array.isArray(parsed.followUps) ? parsed.followUps.map(String).slice(0, 3) : fallback.followUps,
        expectedSignals: Array.isArray(parsed.expectedSignals)
          ? parsed.expectedSignals.map(String).slice(0, 3)
          : fallback.expectedSignals,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (mode === "evaluate") {
    const question = String(body?.question ?? "");
    const answer = String(body?.answer ?? "");
    const targetRole = String(body?.targetRole ?? "");
    const rubric = Array.isArray(body?.rubric) ? body.rubric.map(String).slice(0, 6) : [];
    const fallback = buildEvaluationFallback(language, answer);

    if (!openai) return NextResponse.json(fallback);

    try {
      const prompt = [
        language === "en"
          ? "You are evaluating a candidate in a real interview."
          : "너는 실제 면접에서 지원자를 평가한다.",
        language === "en"
          ? "Be strict, evidence-based, and avoid inflated scores."
          : "점수는 엄격하고 근거 기반으로 부여하며 과장된 칭찬을 금지한다.",
        language === "en"
          ? "Use rubric alignment, technical depth, clarity, and measurable impact."
          : "루브릭 정합성, 기술 깊이, 전달력, 정량 성과를 기준으로 평가한다.",
        language === "en" ? "Return JSON only." : "반드시 JSON만 반환한다.",
<<<<<<< HEAD
        language === "en"
          ? "All explanatory strings in the JSON (summary, strengths, improvements, nextStepAdvice) must be in English."
          : "summary, strengths, improvements, nextStepAdvice 등 JSON 안의 모든 설명 문자열은 반드시 한국어로 작성한다. (hiringSignal 값은 지정된 코드만 사용)",
=======
>>>>>>> origin/dohyeon
        "schema:",
        `{
  "score": number,
  "summary": string,
  "strengths": [string, string, string],
  "improvements": [string, string, string],
  "categoryScores": {
    "problemSolving": number,
    "technicalDepth": number,
    "communication": number,
    "impact": number
  },
  "hiringSignal": "strong_hire" | "proceed" | "hold" | "reject",
  "nextStepAdvice": [string, string]
}`,
        "",
        `${language === "en" ? "Target role" : "지원 직무"}: ${targetRole}`,
        `${language === "en" ? "Question" : "질문"}: ${question}`,
        `${language === "en" ? "Rubric" : "루브릭"}: ${rubric.join(", ")}`,
        `${language === "en" ? "Answer" : "답변"}: ${answer}`,
      ].join("\n");

      const response = await openai.responses.create({ model: "gpt-4.1-mini", input: prompt });
      const parsed = parseJson(response.output_text?.trim() ?? "");
      if (!parsed) return NextResponse.json(fallback);

      const category = parsed.categoryScores ?? {};
      const hiringSignalRaw = String(parsed.hiringSignal ?? fallback.hiringSignal).toLowerCase();
      const hiringSignal = ["strong_hire", "proceed", "hold", "reject"].includes(hiringSignalRaw)
        ? hiringSignalRaw
        : fallback.hiringSignal;

      return NextResponse.json({
        score: typeof parsed.score === "number" ? clampScore(parsed.score, 1, 99) : fallback.score,
        summary: String(parsed.summary ?? fallback.summary),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : fallback.strengths,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 3) : fallback.improvements,
        categoryScores: {
          problemSolving:
            typeof category.problemSolving === "number"
              ? clampScore(category.problemSolving, 1, 99)
              : fallback.categoryScores.problemSolving,
          technicalDepth:
            typeof category.technicalDepth === "number"
              ? clampScore(category.technicalDepth, 1, 99)
              : fallback.categoryScores.technicalDepth,
          communication:
            typeof category.communication === "number"
              ? clampScore(category.communication, 1, 99)
              : fallback.categoryScores.communication,
          impact: typeof category.impact === "number" ? clampScore(category.impact, 1, 99) : fallback.categoryScores.impact,
        },
        hiringSignal,
        nextStepAdvice: Array.isArray(parsed.nextStepAdvice)
          ? parsed.nextStepAdvice.map(String).slice(0, 3)
          : fallback.nextStepAdvice,
      });
    } catch {
      return NextResponse.json(fallback);
    }
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { languageName, parseLanguageFromRequest, type LanguageMode } from "@/lib/evaluation-server";

export const runtime = "nodejs";

type HiringStatus = "open" | "unknown";
type CompetitionLevel = "low" | "moderate" | "high" | "unknown";
type SourceKind = "verified_web_search";

type EvidenceSource = {
  label: string;
  url: string;
  sourceType: "job_posting" | "search_result";
  verifiedAt: string;
};

type MarketInsights = {
  source: "verified_web_search" | "cache";
  searchedAt: string;
  postingPoolSize: number | null;
  postingsChecked: number;
  averageApplicantsPerPosting: number | null;
  averageViewsPerPosting: number | null;
  competitionLevel: CompetitionLevel;
  summary: string;
  caveat: string;
  evidence: EvidenceSource[];
};

type RealJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
  publishedAt: string;
  deadline: string;
  hiringStatus: HiringStatus;
  source: SourceKind;
  sourceLabel: string;
  fitScore: number;
  priorityScore: number;
  applicantCount: number | null;
  viewCount: number | null;
  competitionLevel: CompetitionLevel;
  competitionText: string;
  fitReasons: string[];
  evidence: EvidenceSource[];
};

type RealJobResponse = {
  recommendedRoles: string[];
  marketInsights: MarketInsights;
  items: RealJob[];
  pool: RealJob[];
  poolIndex: number;
  poolSize: number;
};

type ProfileRow = {
  target_role?: string | null;
  preferred_location?: string | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  major?: string | null;
  education_level?: string | null;
  role_certifications?: string | null;
  language_test_name?: string | null;
  language_test_score?: string | null;
};

type CoverLetterRow = {
  resume_text?: string | null;
  job_description?: string | null;
  generated_text?: string | null;
  tone?: string | null;
  created_at?: string | null;
};

const TRUSTED_JOB_DOMAINS = [
  "jobkorea.co.kr",
  "www.jobkorea.co.kr",
  "wanted.co.kr",
  "www.wanted.co.kr",
  "incruit.com",
  "www.incruit.com",
  "catch.co.kr",
  "www.catch.co.kr",
  "rocketpunch.com",
  "www.rocketpunch.com",
  "peoplenjob.com",
  "www.peoplenjob.com",
];

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const POOL_TARGET_SIZE = 10;
const MAX_CANDIDATES = 24;
const MAX_POOL_SEARCH_PASSES = 3;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

const missingCoreConfig = !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey;

const createAuthedUserClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const serviceClient = missingCoreConfig ? null : createClient(supabaseUrl!, supabaseServiceRoleKey!);
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const nowIso = () => new Date().toISOString();

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const getUserFromToken = async (token: string) => {
  if (!token || missingCoreConfig) return null;
  const authedClient = createAuthedUserClient(token);
  const { data, error } = await authedClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

const cleanText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const limitText = (value: unknown, max = 220) => {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePublishedDate = (value: string) => {
  const normalized = value.trim().replace(/\./g, "-").replace(/\//g, "-");
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) return null;
  const [y, m, d] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
};

const isRecentPosting = (publishedAt: string, maxDays = 45) => {
  if (publishedAt === "unknown") return true;
  const publishedDate = parsePublishedDate(publishedAt);
  if (!publishedDate) return false;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((todayUtc - publishedDate.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= maxDays;
};

const isLikelyClosed = (job: Partial<RealJob>) => {
  const text = `${job.title ?? ""} ${job.summary ?? ""}`.toLowerCase();
  return ["마감", "종료", "모집완료", "closed", "expired"].some((keyword) => text.includes(keyword));
};

const isTrustedJobUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return TRUSTED_JOB_DOMAINS.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const getCompetitionLevel = (applicants: number | null): CompetitionLevel => {
  if (applicants === null) return "unknown";
  if (applicants >= 100) return "high";
  if (applicants >= 30) return "moderate";
  return "low";
};

const competitionPenalty = (level: CompetitionLevel) => {
  if (level === "high") return 12;
  if (level === "moderate") return 6;
  return 0;
};

const UNKNOWN_LOCATION_KO = "지역 미공개";
const UNKNOWN_LOCATION_EN = "Location not disclosed";

const unknownLocation = (lang: LanguageMode) => (lang === "en" ? UNKNOWN_LOCATION_EN : UNKNOWN_LOCATION_KO);

const competitionText = (
  applicants: number | null,
  views: number | null,
  averageApplicants: number | null = null,
  lang: LanguageMode = "ko",
) => {
  const loc = lang === "en" ? "en-US" : "ko-KR";
  if (applicants === null && views === null) {
    return lang === "en" ? "No public applicant or view counts" : "지원자수/조회수 공개 데이터 없음";
  }

  const parts = [];
  if (applicants !== null) {
    parts.push(
      lang === "en" ? `${applicants.toLocaleString(loc)} applicants` : `지원자 ${applicants.toLocaleString(loc)}명`,
    );
  }
  if (views !== null) {
    parts.push(lang === "en" ? `${views.toLocaleString(loc)} views` : `조회 ${views.toLocaleString(loc)}회`);
  }
  if (applicants !== null && averageApplicants !== null && averageApplicants > 0) {
    const diff = applicants - averageApplicants;
    const direction = diff >= 0 ? (lang === "en" ? "above average" : "평균보다 높음") : lang === "en" ? "below average" : "평균보다 낮음";
    parts.push(direction);
  }
  return parts.join(" · ");
};

const splitTerms = (...values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  values
    .join(" ")
    .split(/[,/|·\n\r\t ]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2 && !["and", "or", "기타", "무관"].includes(term))
    .forEach((term) => seen.add(term));
  return [...seen].slice(0, 28);
};

const buildProfileText = (profile: ProfileRow | null, coverLetters: CoverLetterRow[]) =>
  [
    profile?.target_role,
    profile?.preferred_location,
    profile?.core_skills,
    profile?.tech_stack,
    profile?.major,
    profile?.education_level,
    profile?.role_certifications,
    profile?.language_test_name,
    profile?.language_test_score,
    ...coverLetters.flatMap((item) => [item.resume_text, item.job_description, item.generated_text]),
  ]
    .map((value) => cleanText(value).slice(0, 350))
    .filter(Boolean)
    .join(" | ");

const fallbackRoles = (profile: ProfileRow | null, coverLetters: CoverLetterRow[]) => {
  const explicitRole = cleanText(profile?.target_role);
  const terms = splitTerms(profile?.target_role, profile?.tech_stack, profile?.core_skills, profile?.major, ...coverLetters.map((item) => item.job_description ?? ""));
  const roles = [explicitRole, ...terms]
    .filter(Boolean)
    .map((term) => (term.length > 18 ? term.slice(0, 18) : term));
  return [...new Set(roles)].slice(0, 5);
};

const parseAiJson = (text: string): unknown => {
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

const getRecommendedRoles = async (
  profile: ProfileRow | null,
  coverLetters: CoverLetterRow[],
  lang: LanguageMode,
) => {
  const fallback = fallbackRoles(profile, coverLetters);
  if (!openai) return fallback;

  const profileText = buildProfileText(profile, coverLetters);
  if (!profileText) return fallback;

  try {
    const instructions =
      lang === "en"
        ? [
            "From the applicant profile and cover letter text, extract only realistic job search keywords for JSON output.",
            "Do not invent job titles or exaggerate roles.",
            "Return 3-5 short keywords that work on major Korean job boards (JobKorea, Wanted, Incruit, Catch, RocketPunch, etc.). Keywords may be Korean or English as commonly used in postings.",
            `All string values in the JSON must be in ${languageName(lang)} (use English role phrases in the roles array).`,
            'Schema: {"roles":["..."]}',
            "",
            profileText.slice(0, 3000),
          ].join("\n")
        : [
            "지원자 프로필/자소서 내용에서 실제 검색에 쓸 직무 키워드만 뽑아 JSON으로 출력한다.",
            "존재하지 않는 직무명이나 과장된 직무명은 만들지 않는다.",
            "한국 채용 플랫폼에서 검색 가능한 짧은 키워드 3~5개만 추천한다.",
            `roles 배열의 모든 문자열은 ${languageName(lang)}로 작성한다.`,
            '스키마: {"roles":["..."]}',
            "",
            profileText.slice(0, 3000),
          ].join("\n");

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: instructions,
    });

    const parsed = parseAiJson(response.output_text?.trim() ?? "") as { roles?: unknown } | null;
    const roles = Array.isArray(parsed?.roles)
      ? parsed.roles.map((role) => cleanText(role)).filter(Boolean).slice(0, 5)
      : [];
    return roles.length > 0 ? roles : fallback;
  } catch {
    return fallback;
  }
};

const scoreJob = (
  job: Pick<RealJob, "title" | "summary" | "location" | "publishedAt" | "competitionLevel">,
  profile: ProfileRow | null,
  lang: LanguageMode,
) => {
  const terms = splitTerms(profile?.target_role, profile?.core_skills, profile?.tech_stack, profile?.major);
  const haystack = `${job.title} ${job.summary}`.toLowerCase();
  const matched = terms.filter((term) => haystack.includes(term)).slice(0, 5);
  const preferredLocation = cleanText(profile?.preferred_location);
  const locationMatch = preferredLocation && job.location.includes(preferredLocation.split(/[,\s/]+/)[0]);
  const recentBonus = isRecentPosting(job.publishedAt, 14) ? 6 : 0;
  const matchScore = matched.length > 0 ? matched.length * 8 : 0;
  const locationBonus = locationMatch ? 6 : 0;
  const fitScore = clamp(50 + matchScore + locationBonus + recentBonus, 35, 96);
  const priorityScore = clamp(fitScore - competitionPenalty(job.competitionLevel) + recentBonus / 2, 20, 98);
  const fitReasons =
    lang === "en"
      ? [
          matched.length > 0
            ? `Profile keyword overlap: ${matched.join(", ")}`
            : "Limited direct overlap between profile keywords and this posting.",
          locationMatch
            ? "Posting location aligns with your preferred location."
            : "Check the original posting for location requirements.",
          job.competitionLevel === "unknown"
            ? "Applicant counts are not public; competition is assessed conservatively."
            : "Competition reflects disclosed applicant counts where available.",
        ]
      : [
          matched.length > 0 ? `프로필 키워드 일치: ${matched.join(", ")}` : "프로필 키워드와 직접 일치하는 항목은 제한적입니다.",
          locationMatch ? "희망 지역과 공고 지역이 맞습니다." : "지역 조건은 공고 원문 확인이 필요합니다.",
          job.competitionLevel === "unknown"
            ? "지원자수 공개 데이터가 없어 경쟁 강도는 보수적으로 봐야 합니다."
            : "공개 지원자수 기준 경쟁 강도를 반영했습니다.",
        ];

  return { fitScore, priorityScore, fitReasons };
};

const toEvidence = (label: string, url: string, sourceType: EvidenceSource["sourceType"]): EvidenceSource => ({
  label,
  url,
  sourceType,
  verifiedAt: nowIso(),
});

const verifyLiveJobPosting = async (job: RealJob) => {
  if (!isTrustedJobUrl(job.url) || isLikelyClosed(job)) return false;

  try {
    const response = await fetch(job.url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "career-helper/1.0",
      },
    });

    if (!response.ok) return false;
    const finalUrl = response.url || job.url;
    if (!isTrustedJobUrl(finalUrl)) return false;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) return false;

    const html = (await response.text()).slice(0, 220000).toLowerCase();
    const closedMarkers = [
      "마감된 공고",
      "채용공고가 마감",
      "접수 마감되었습니다",
      "모집마감",
      "채용마감",
      "지원이 마감",
      "recruitment has closed",
      "this job is no longer",
    ];
    return !closedMarkers.some((marker) => html.includes(marker));
  } catch {
    return false;
  }
};

const normalizeWebItem = (raw: unknown, profile: ProfileRow | null, lang: LanguageMode): RealJob | null => {
  if (!raw || typeof raw !== "object") return null;
  const job = raw as Partial<RealJob>;
  const url = cleanText(job.url);
  const title = cleanText(job.title);
  const company = cleanText(job.company);
  if (!url || !title || !company || !isTrustedJobUrl(url)) return null;

  const applicantCount = readNumber(job.applicantCount);
  const viewCount = readNumber(job.viewCount);
  const competitionLevel = getCompetitionLevel(applicantCount);
  const L = (ko: string, en: string) => (lang === "en" ? en : ko);
  const baseJob = {
    title,
    company,
    location: cleanText(job.location) || unknownLocation(lang),
    url,
    summary:
      limitText(job.summary, 260) ||
      L("검증된 채용 플랫폼에서 확인된 공고입니다.", "Posting verified on a trusted job platform."),
    publishedAt: cleanText(job.publishedAt) || "unknown",
    deadline: cleanText(job.deadline) || "unknown",
    hiringStatus: (job.hiringStatus === "open" ? "open" : "unknown") as HiringStatus,
    source: "verified_web_search" as const,
    sourceLabel: L("검증된 웹 검색", "Verified web search"),
    applicantCount,
    viewCount,
    competitionLevel,
    competitionText: competitionText(applicantCount, viewCount, undefined, lang),
    evidence: [toEvidence(L("채용공고 원문", "Job posting source"), url, "job_posting")],
  };
  const scored = scoreJob(baseJob, profile, lang);
  return { ...baseJob, ...scored };
};

const decodeUrlParam = (raw: string) => {
  let value = cleanText(raw);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (value.startsWith("http")) return value;
    try {
      const next = decodeURIComponent(value);
      if (next === value) break;
      value = cleanText(next);
    } catch {
      break;
    }
  }
  return value.startsWith("http") ? value : "";
};

const parseExcludeUrls = (raw: string | null) =>
  (raw ?? "")
    .split(",")
    .map((part) => decodeUrlParam(part))
    .filter(Boolean)
    .slice(0, 12);

const fetchVerifiedWebJobs = async (
  roles: string[],
  profile: ProfileRow | null,
  coverLetters: CoverLetterRow[],
  lang: LanguageMode,
  excludeUrls: string[] = [],
) => {
  if (!openai) return [] as RealJob[];

  const L = (ko: string[], en: string[]) => (lang === "en" ? en.join("\n") : ko.join("\n"));

  const prompt = L(
    [
      `오늘 날짜는 ${new Date().toISOString().slice(0, 10)}이다.`,
      "한국 채용 플랫폼에서 현재 모집중인 실제 채용공고만 웹 검색한다.",
      "절대 공고를 새로 만들지 않는다. 검색 결과나 공고 원문에서 확인되지 않는 값은 null 또는 unknown으로 둔다.",
      "지원자수(applicantCount), 조회수(viewCount)는 공고 원문/검색 결과에서 숫자가 보일 때만 입력하고 추정하지 않는다.",
      "마감/종료/closed/expired 공고는 제외한다.",
      "허용 도메인: jobkorea.co.kr, wanted.co.kr, incruit.com, catch.co.kr, rocketpunch.com, peoplenjob.com",
      `지원자 프로필에 맞는 서로 다른 채용공고를 최소 ${POOL_TARGET_SIZE}개 찾는다(회사·직무·URL이 모두 달라야 함).`,
      "JSON 객체만 출력한다.",
      `summary 필드의 문장은 반드시 ${languageName(lang)}로 작성한다.`,
    ],
    [
      `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
      "Use web search to find only real, currently open job postings on major South Korean job platforms.",
      "Never fabricate postings. Use null or unknown for any field not confirmed in search results or posting text.",
      "Fill applicantCount and viewCount only when explicit numbers appear; do not estimate.",
      "Exclude closed, expired, or 마감 postings.",
      "Allowed domains: jobkorea.co.kr, wanted.co.kr, incruit.com, catch.co.kr, rocketpunch.com, peoplenjob.com",
      `Find at least ${POOL_TARGET_SIZE} different open postings that fit the applicant (distinct company, role, and URL).`,
      "Output a JSON object only.",
      `Write every human-readable string in the JSON (especially summary) in ${languageName(lang)}.`,
    ],
  );

  const excludeBlock =
    excludeUrls.length > 0
      ? lang === "en"
        ? [
            "",
            "The user already saw these postings — find different open jobs (different URLs):",
            ...excludeUrls.map((url) => `- ${url}`),
          ].join("\n")
        : [
            "",
            "사용자가 이미 본 공고이므로 다른 모집중 공고(다른 URL)를 찾으세요:",
            ...excludeUrls.map((url) => `- ${url}`),
          ].join("\n")
      : "";

  const tail = [
    "",
    lang === "en" ? `Search keywords: ${roles.join(", ")}` : `검색 키워드: ${roles.join(", ")}`,
    lang === "en"
      ? `Profile: ${buildProfileText(profile, coverLetters).slice(0, 2400) || "Insufficient profile text"}`
      : `프로필: ${buildProfileText(profile, coverLetters).slice(0, 2400) || "프로필 정보 부족"}`,
    excludeBlock,
    "",
    `{
  "items": [
    {
      "title": "...",
      "company": "...",
      "location": "...",
      "url": "...",
      "summary": "...",
      "publishedAt": "YYYY-MM-DD 또는 unknown",
      "deadline": "YYYY-MM-DD 또는 상시채용 또는 unknown",
      "hiringStatus": "open",
      "applicantCount": null,
      "viewCount": null
    }
  ]
}`,
  ].join("\n");

  try {
    const aiResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: `${prompt}\n${tail}`,
    });

    const parsed = parseAiJson(aiResponse.output_text?.trim() ?? "") as { items?: unknown } | null;
    const candidates = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalized = candidates
      .map((item) => normalizeWebItem(item, profile, lang))
      .filter((item): item is RealJob => Boolean(item))
      .filter(
        (item) =>
          (item.hiringStatus === "open" || item.hiringStatus === "unknown") && isRecentPosting(item.publishedAt),
      )
      .slice(0, MAX_CANDIDATES);

    const verified = await Promise.all(
      normalized.map(async (item) => {
        const ok = await verifyLiveJobPosting(item);
        return ok ? item : null;
      }),
    );

    const seenUrls = new Set<string>();
    return verified
      .filter((item): item is RealJob => {
        if (!item || seenUrls.has(item.url)) return false;
        seenUrls.add(item.url);
        if (excludeUrls.includes(item.url)) return false;
        return true;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, POOL_TARGET_SIZE);
  } catch {
    return [];
  }
};

const mergeJobPools = (existing: RealJob[], incoming: RealJob[]) => {
  const seen = new Set(existing.map((job) => job.url));
  const merged = [...existing];
  for (const job of incoming) {
    if (seen.has(job.url)) continue;
    seen.add(job.url);
    merged.push(job);
  }
  return merged.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, POOL_TARGET_SIZE);
};

const buildVerifiedJobPool = async (
  roles: string[],
  profile: ProfileRow | null,
  coverLetters: CoverLetterRow[],
  lang: LanguageMode,
  excludeUrls: string[],
) => {
  const roleSeeds = [...new Set([...roles, ...fallbackRoles(profile, coverLetters)])].slice(0, 8);
  let pool: RealJob[] = [];
  const excluded = new Set(excludeUrls);

  for (let pass = 0; pass < MAX_POOL_SEARCH_PASSES && pool.length < POOL_TARGET_SIZE; pass += 1) {
    const offset = pass * 3;
    const searchRoles = roleSeeds.slice(offset, offset + 5);
    if (searchRoles.length === 0) break;

    const batch = await fetchVerifiedWebJobs(searchRoles, profile, coverLetters, lang, [
      ...excluded,
      ...pool.map((job) => job.url),
    ]);
    pool = mergeJobPools(pool, batch);
    if (batch.length === 0 && pass > 0) break;
  }

  return pool;
};

const buildMarketInsights = (
  source: MarketInsights["source"],
  items: RealJob[],
  postingPoolSize: number | null,
  searchedAt = nowIso(),
  lang: LanguageMode = "ko",
): MarketInsights => {
  const applicants = items.map((item) => item.applicantCount).filter((value): value is number => value !== null);
  const views = items.map((item) => item.viewCount).filter((value): value is number => value !== null);
  const averageApplicants = applicants.length > 0 ? Math.round(applicants.reduce((sum, value) => sum + value, 0) / applicants.length) : null;
  const averageViews = views.length > 0 ? Math.round(views.reduce((sum, value) => sum + value, 0) / views.length) : null;
  const competitionLevel = getCompetitionLevel(averageApplicants);
  const sourceName =
    lang === "en"
      ? source === "cache"
          ? "Cached verified results"
          : "Verified web search"
      : source === "cache"
          ? "저장된 검증 결과"
          : "검증된 웹 검색";

  const locale = lang === "en" ? "en-US" : "ko-KR";

  return {
    source,
    searchedAt,
    postingPoolSize,
    postingsChecked: items.length,
    averageApplicantsPerPosting: averageApplicants,
    averageViewsPerPosting: averageViews,
    competitionLevel,
    summary:
      averageApplicants === null
        ? lang === "en"
          ? `No public applicant count was confirmed in ${sourceName} results.`
          : `${sourceName} 결과에서 지원자수 공개 데이터가 확인되지 않았습니다.`
        : lang === "en"
          ? `Based on ${sourceName}, average disclosed applicants per posting is ${averageApplicants.toLocaleString(locale)}.`
          : `${sourceName} 기준 공개 지원자수 평균은 공고당 ${averageApplicants.toLocaleString(locale)}명입니다.`,
    caveat:
      lang === "en"
        ? "Many postings do not disclose headcount or true competition ratios; we show competition from disclosed applicant counts only. We never estimate missing numbers."
        : "채용인원이 공개되지 않는 공고가 많아 정확한 경쟁률 대신 공개 지원자수/공고 기준 경쟁 강도로 표시합니다. 숫자가 없는 공고는 추정하지 않습니다.",
    evidence: items.flatMap((item) => item.evidence).slice(0, 6),
  };
};

const applyAverageCompetitionText = (items: RealJob[], averageApplicants: number | null, lang: LanguageMode) =>
  items.map((item) => ({
    ...item,
    competitionText: competitionText(item.applicantCount, item.viewCount, averageApplicants, lang),
  }));

const normalizeCachedItem = (raw: unknown, lang: LanguageMode): RealJob | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<RealJob>;
  if (item.url && item.title && item.company && isTrustedJobUrl(item.url)) {
    const L = (ko: string, en: string) => (lang === "en" ? en : ko);
    return {
      title: cleanText(item.title),
      company: cleanText(item.company),
      location: cleanText(item.location) || unknownLocation(lang),
      url: item.url,
      summary: cleanText(item.summary) || L("검증된 채용 공고입니다.", "Verified job posting."),
      publishedAt: cleanText(item.publishedAt) || "unknown",
      deadline: cleanText(item.deadline) || "unknown",
      hiringStatus: item.hiringStatus === "open" ? "open" : "unknown",
      source: "verified_web_search",
      sourceLabel:
        cleanText(item.sourceLabel) ||
        L("검증된 웹 검색", "Verified web search"),
      fitScore: clamp(readNumber(item.fitScore) ?? 50, 0, 100),
      priorityScore: clamp(readNumber(item.priorityScore) ?? readNumber(item.fitScore) ?? 50, 0, 100),
      applicantCount: readNumber(item.applicantCount),
      viewCount: readNumber(item.viewCount),
      competitionLevel: item.competitionLevel ?? getCompetitionLevel(readNumber(item.applicantCount)),
      competitionText:
        cleanText(item.competitionText) ||
        competitionText(readNumber(item.applicantCount), readNumber(item.viewCount), undefined, lang),
      fitReasons: Array.isArray(item.fitReasons) ? item.fitReasons.map(String).slice(0, 4) : [],
      evidence:
        Array.isArray(item.evidence) && item.evidence.length > 0
          ? item.evidence
          : [toEvidence(L("채용공고 원문", "Job posting source"), item.url, "job_posting")],
    };
  }
  return normalizeWebItem(raw, null, lang);
};

const normalizeCachedResponse = (raw: unknown, searchedAt: string, lang: LanguageMode): RealJobResponse | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<RealJobResponse> & { pool?: unknown[] };
  const sourceList = Array.isArray(value.pool) && value.pool.length > 0 ? value.pool : value.items;
  if (!Array.isArray(sourceList) || sourceList.length === 0) return null;

  const pool = sourceList
    .map((item) => normalizeCachedItem(item, lang))
    .filter((item): item is RealJob => Boolean(item?.url && isTrustedJobUrl(item.url)))
    .slice(0, POOL_TARGET_SIZE);

  if (pool.length === 0) return null;

  const poolIndex = clamp(readNumber(value.poolIndex) ?? 0, 0, pool.length - 1);
  const cachedInsights = value.marketInsights as MarketInsights | undefined;
  const postingPoolSize = cachedInsights?.postingPoolSize ?? pool.length;
  const marketInsights = buildMarketInsights("cache", pool, postingPoolSize, searchedAt, lang);
  return {
    recommendedRoles: Array.isArray(value.recommendedRoles) ? value.recommendedRoles.map(String).slice(0, 5) : [],
    marketInsights: {
      ...marketInsights,
      source: "cache",
      searchedAt,
    },
    items: pool[poolIndex] ? [pool[poolIndex]] : [],
    pool,
    poolIndex,
    poolSize: pool.length,
  };
};

const buildPoolPayload = (
  pool: RealJob[],
  poolIndex: number,
  recommendedRoles: string[],
  marketInsights: MarketInsights,
  profile: ProfileRow | null,
  lang: LanguageMode,
) => {
  const localizedPool = applyAverageCompetitionText(
    pool.map((item) => relocalizeCachedJob(item, profile, lang)),
    marketInsights.averageApplicantsPerPosting,
    lang,
  );
  const safeIndex = localizedPool.length === 0 ? 0 : clamp(poolIndex, 0, localizedPool.length - 1);
  return {
    recommendedRoles,
    marketInsights,
    pool: localizedPool,
    poolIndex: safeIndex,
    poolSize: localizedPool.length,
    items: localizedPool[safeIndex] ? [localizedPool[safeIndex]] : [],
  };
};

const relocalizeCachedJob = (item: RealJob, profile: ProfileRow | null, lang: LanguageMode): RealJob => {
  const L = (ko: string, en: string) => (lang === "en" ? en : ko);
  const scored = scoreJob(item, profile, lang);
  return {
    ...item,
    ...scored,
    location:
      item.location === UNKNOWN_LOCATION_KO || item.location === UNKNOWN_LOCATION_EN
        ? unknownLocation(lang)
        : item.location,
    sourceLabel: L("검증된 웹 검색", "Verified web search"),
    evidence: (item.evidence ?? []).map((e) => ({
      ...e,
      label:
        e.label === "채용공고 원문" || e.label === "Job posting source"
          ? L("채용공고 원문", "Job posting source")
          : e.label,
    })),
  };
};

export async function GET(request: NextRequest) {
  if (missingCoreConfig || !serviceClient) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const language = parseLanguageFromRequest(request);
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const excludeUrls = forceRefresh ? parseExcludeUrls(request.nextUrl.searchParams.get("exclude")) : [];
  const requestedPoolIndex = clamp(readNumber(request.nextUrl.searchParams.get("poolIndex")) ?? 0, 0, POOL_TARGET_SIZE - 1);

  const { data: cached, error: cacheError } = await serviceClient
    .from("real_job_search_cache")
    .select("results, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cacheError) {
    return NextResponse.json({ error: cacheError.message }, { status: 500 });
  }

  const { data: latestCoverLetter } = await serviceClient
    .from("cover_letters")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select(
      "target_role, preferred_location, core_skills, tech_stack, major, education_level, role_certifications, language_test_name, language_test_score",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: coverLetters } = await serviceClient
    .from("cover_letters")
    .select("resume_text, job_description, generated_text, tone, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const typedProfile = (profile ?? null) as ProfileRow | null;
  const typedCoverLetters = (coverLetters ?? []) as CoverLetterRow[];

  const cacheUpdatedAt = cached?.updated_at ?? cached?.created_at;
  const cacheTime = cacheUpdatedAt ? new Date(cacheUpdatedAt).getTime() : 0;
  const coverLetterTime = latestCoverLetter?.created_at ? new Date(latestCoverLetter.created_at).getTime() : 0;
  const canUseCache = Boolean(cached?.results) && cacheTime >= coverLetterTime && Date.now() - cacheTime <= CACHE_MAX_AGE_MS;

  if (!forceRefresh && canUseCache && cached?.results) {
    const cachedResponse = normalizeCachedResponse(cached.results, cacheUpdatedAt, language);
    if (cachedResponse && cachedResponse.pool.length > 0) {
      const poolIndex = clamp(requestedPoolIndex, 0, cachedResponse.pool.length - 1);
      const cachedPool = cachedResponse.pool;
      const poolNote =
        cachedPool.length < POOL_TARGET_SIZE
          ? language === "en"
            ? `Showing ${cachedPool.length} cached verified posting(s). Use “Search new picks” to run a fresh search (up to ${POOL_TARGET_SIZE}).`
            : `저장된 검증 공고 ${cachedPool.length}건입니다. ‘새 목록 검색’으로 최대 ${POOL_TARGET_SIZE}건까지 다시 찾을 수 있습니다.`
          : undefined;

      return NextResponse.json({
        source: "cache",
        searchedAt: cacheUpdatedAt,
        poolNote,
        ...buildPoolPayload(
          cachedPool,
          poolIndex,
          cachedResponse.recommendedRoles,
          cachedResponse.marketInsights,
          typedProfile,
          language,
        ),
      });
    }
  }

  const recommendedRoles = await getRecommendedRoles(typedProfile, typedCoverLetters, language);

  let source: MarketInsights["source"] = "verified_web_search";
  let postingPoolSize: number | null = null;
  const pool = await buildVerifiedJobPool(recommendedRoles, typedProfile, typedCoverLetters, language, excludeUrls);

  if (pool.length === 0) {
    const refreshHint =
      forceRefresh && excludeUrls.length > 0
        ? language === "en"
          ? " Could not find a different verified posting yet — try again in a moment."
          : " 아직 다른 검증 공고를 찾지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "";
    return NextResponse.json(
      {
        error:
          (language === "en"
            ? "No live postings met the filters (verified platform URL, active, recent/accessible)."
            : "실공고 조건(검증 가능한 채용 플랫폼 URL, 모집중, 최근/접근 가능)을 만족하는 결과를 찾지 못했습니다.") + refreshHint,
      },
      { status: 404 },
    );
  }

  const marketInsights = buildMarketInsights(source, pool, postingPoolSize ?? pool.length, undefined, language);

  const results: RealJobResponse = {
    ...buildPoolPayload(pool, 0, recommendedRoles, marketInsights, typedProfile, language),
  };

  if (forceRefresh) {
    await serviceClient.from("real_job_search_cache").delete().eq("user_id", user.id);
  }

  const { error: saveError } = await serviceClient.from("real_job_search_cache").upsert(
    {
      user_id: user.id,
      results: {
        recommendedRoles,
        marketInsights,
        pool,
        poolIndex: 0,
        poolSize: pool.length,
        items: pool,
      },
      updated_at: marketInsights.searchedAt,
    },
    { onConflict: "user_id" },
  );

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  const poolNote =
    pool.length < POOL_TARGET_SIZE
      ? language === "en"
        ? `Verified ${pool.length} live posting(s) for your profile (target up to ${POOL_TARGET_SIZE}). This is not an account limit — try filling target role/skills or run “Search new picks” again.`
        : `프로필 기준 검증된 실공고 ${pool.length}건입니다(목표 최대 ${POOL_TARGET_SIZE}건). 계정 제한이 아니라 검색·검증 결과이니, 희망직무·스킬을 보강하거나 ‘새 목록 검색’을 다시 시도해 보세요.`
      : undefined;

  return NextResponse.json({
    source,
    searchedAt: marketInsights.searchedAt,
    poolNote,
    ...results,
  });
}

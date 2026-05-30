import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

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
  "saramin.co.kr",
  "www.saramin.co.kr",
  "jobkorea.co.kr",
  "www.jobkorea.co.kr",
  "wanted.co.kr",
  "www.wanted.co.kr",
  "incruit.com",
  "www.incruit.com",
  "catch.co.kr",
  "www.catch.co.kr",
  "jumpit.saramin.co.kr",
  "rocketpunch.com",
  "www.rocketpunch.com",
  "peoplenjob.com",
  "www.peoplenjob.com",
];

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_RESULTS = 8;

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
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
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

const competitionText = (applicants: number | null, views: number | null, averageApplicants: number | null = null) => {
  if (applicants === null && views === null) {
    return "지원자수와 조회수 공개 데이터 없음";
  }

  const parts = [];
  if (applicants !== null) parts.push(`지원자 ${applicants.toLocaleString("ko-KR")}명`);
  if (views !== null) parts.push(`조회 ${views.toLocaleString("ko-KR")}회`);
  if (applicants !== null && averageApplicants !== null && averageApplicants > 0) {
    parts.push(applicants >= averageApplicants ? "평균보다 높음" : "평균보다 낮음");
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

const getRecommendedRoles = async (profile: ProfileRow | null, coverLetters: CoverLetterRow[]) => {
  const fallback = fallbackRoles(profile, coverLetters);
  if (!openai) return fallback;

  const profileText = buildProfileText(profile, coverLetters);
  if (!profileText) return fallback;

  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        "지원자 프로필과 자기소개서 내용에서 실제 채용 검색에 쓸 직무 키워드만 JSON으로 출력한다.",
        "존재하지 않는 직무명이나 과장된 직무명은 만들지 않는다.",
        "한국 채용 플랫폼에서 검색 가능한 직무/키워드 3~5개만 추천한다.",
        '스키마: {"roles":["..."]}',
        "",
        profileText.slice(0, 3000),
      ].join("\n"),
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

const buildSearchQueries = (roles: string[], profile: ProfileRow | null) => {
  const coreTerms = splitTerms(profile?.tech_stack, profile?.core_skills).slice(0, 4);
  const base = roles.length > 0 ? roles : fallbackRoles(profile, []);
  const queries = base.map((role) => [role, ...coreTerms.slice(0, 2), "채용"].join(" ").trim());
  return [...new Set(queries.filter(Boolean))].slice(0, 5);
};

const scoreJob = (job: Pick<RealJob, "title" | "summary" | "location" | "publishedAt" | "competitionLevel">, profile: ProfileRow | null) => {
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
  const fitReasons = [
    matched.length > 0 ? `프로필 키워드 일치: ${matched.join(", ")}` : "프로필 키워드와 직접 일치하는 항목은 제한적입니다.",
    locationMatch ? "희망 지역과 공고 지역이 맞습니다." : "지역 조건은 공고 본문에서 확인이 필요합니다.",
    job.competitionLevel === "unknown" ? "지원자수 공개 데이터가 없어 경쟁 강도는 보수적으로 봐야 합니다." : "공개 지원자수 기준 경쟁 강도를 반영했습니다.",
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
    const closedMarkers = ["마감된 공고", "채용공고가 마감", "접수 마감되었습니다", "모집마감", "채용마감", "expired", "closed"];
    return !closedMarkers.some((marker) => html.includes(marker));
  } catch {
    return false;
  }
};

const normalizeWebItem = (raw: unknown, profile: ProfileRow | null): RealJob | null => {
  if (!raw || typeof raw !== "object") return null;
  const job = raw as Partial<RealJob>;
  const url = cleanText(job.url);
  const title = cleanText(job.title);
  const company = cleanText(job.company);
  if (!url || !title || !company || !isTrustedJobUrl(url)) return null;

  const applicantCount = readNumber(job.applicantCount);
  const viewCount = readNumber(job.viewCount);
  const competitionLevel = getCompetitionLevel(applicantCount);
  const baseJob = {
    title,
    company,
    location: cleanText(job.location) || "지역 미공개",
    url,
    summary: limitText(job.summary, 260) || "검증된 채용 플랫폼에서 확인한 공고입니다.",
    publishedAt: cleanText(job.publishedAt) || "unknown",
    deadline: cleanText(job.deadline) || "unknown",
    hiringStatus: (job.hiringStatus === "open" ? "open" : "unknown") as HiringStatus,
    source: "verified_web_search" as const,
    sourceLabel: "검증된 웹 검색",
    applicantCount,
    viewCount,
    competitionLevel,
    competitionText: competitionText(applicantCount, viewCount),
    evidence: [toEvidence("채용공고 원문", url, "job_posting")],
  };
  const scored = scoreJob(baseJob, profile);
  return { ...baseJob, ...scored };
};

const fetchVerifiedWebJobs = async (roles: string[], profile: ProfileRow | null, coverLetters: CoverLetterRow[]) => {
  if (!openai) return [] as RealJob[];

  const queries = buildSearchQueries(roles, profile);
  const prompt = [
    `오늘 날짜는 ${new Date().toISOString().slice(0, 10)}입니다.`,
    "한국 채용 플랫폼에서 현재 모집중인 실제 채용공고만 직접 검색한다.",
    "공고를 새로 만들지 않는다. 검색 결과나 공고 원문에서 확인하지 못한 값은 null 또는 unknown으로 둔다.",
    "지원자수(applicantCount), 조회수(viewCount)는 공고 원문이나 검색 결과에서 숫자가 보일 때만 입력하고 추정하지 않는다.",
    "마감/종료/closed/expired 공고는 제외한다.",
    "허용 도메인: saramin.co.kr, jobkorea.co.kr, wanted.co.kr, incruit.com, catch.co.kr, jumpit.saramin.co.kr, rocketpunch.com, peoplenjob.com",
    "JSON 객체만 출력한다.",
    `검색 쿼리: ${queries.join(" / ")}`,
    `추천 직무: ${roles.join(", ")}`,
    `프로필: ${buildProfileText(profile, coverLetters).slice(0, 2400) || "프로필 정보 부족"}`,
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
      input: prompt,
    });

    const parsed = parseAiJson(aiResponse.output_text?.trim() ?? "") as { items?: unknown } | null;
    const candidates = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalized = candidates
      .map((item) => normalizeWebItem(item, profile))
      .filter((item): item is RealJob => Boolean(item))
      .filter((item) => item.hiringStatus === "open" && isRecentPosting(item.publishedAt))
      .slice(0, MAX_RESULTS);

    const verified = await Promise.all(
      normalized.map(async (item) => {
        const ok = await verifyLiveJobPosting(item);
        return ok ? item : null;
      }),
    );

    return verified
      .filter((item): item is RealJob => Boolean(item))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, MAX_RESULTS);
  } catch {
    return [];
  }
};

const buildMarketInsights = (
  source: MarketInsights["source"],
  items: RealJob[],
  postingPoolSize: number | null,
  searchedAt = nowIso(),
): MarketInsights => {
  const applicants = items.map((item) => item.applicantCount).filter((value): value is number => value !== null);
  const views = items.map((item) => item.viewCount).filter((value): value is number => value !== null);
  const averageApplicants = applicants.length > 0 ? Math.round(applicants.reduce((sum, value) => sum + value, 0) / applicants.length) : null;
  const averageViews = views.length > 0 ? Math.round(views.reduce((sum, value) => sum + value, 0) / views.length) : null;
  const competitionLevel = getCompetitionLevel(averageApplicants);
  const sourceName = source === "cache" ? "저장된 검증 결과" : "검증된 웹 검색";

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
        ? `${sourceName} 결과에서 지원자수 공개 데이터가 확인되지 않았습니다.`
        : `${sourceName} 기준 공개 지원자수 평균은 공고당 ${averageApplicants.toLocaleString("ko-KR")}명입니다.`,
    caveat:
      "채용 인원과 지원자수를 공개하지 않는 공고가 많아 경쟁 강도는 공개 지표가 있는 공고만 반영합니다. 숫자가 없는 공고는 추정하지 않습니다.",
    evidence: items.flatMap((item) => item.evidence).slice(0, 6),
  };
};

const applyAverageCompetitionText = (items: RealJob[], averageApplicants: number | null) =>
  items.map((item) => ({
    ...item,
    competitionText: competitionText(item.applicantCount, item.viewCount, averageApplicants),
  }));

const normalizeCachedItem = (raw: unknown): RealJob | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<RealJob>;
  if (item.url && item.title && item.company && isTrustedJobUrl(item.url)) {
    return {
      title: cleanText(item.title),
      company: cleanText(item.company),
      location: cleanText(item.location) || "지역 미공개",
      url: item.url,
      summary: cleanText(item.summary) || "검증된 채용 공고입니다.",
      publishedAt: cleanText(item.publishedAt) || "unknown",
      deadline: cleanText(item.deadline) || "unknown",
      hiringStatus: item.hiringStatus === "open" ? "open" : "unknown",
      source: "verified_web_search",
      sourceLabel: "검증된 웹 검색",
      fitScore: clamp(readNumber(item.fitScore) ?? 50, 0, 100),
      priorityScore: clamp(readNumber(item.priorityScore) ?? readNumber(item.fitScore) ?? 50, 0, 100),
      applicantCount: readNumber(item.applicantCount),
      viewCount: readNumber(item.viewCount),
      competitionLevel: item.competitionLevel ?? getCompetitionLevel(readNumber(item.applicantCount)),
      competitionText: cleanText(item.competitionText) || competitionText(readNumber(item.applicantCount), readNumber(item.viewCount)),
      fitReasons: Array.isArray(item.fitReasons) ? item.fitReasons.map(String).slice(0, 4) : [],
      evidence: Array.isArray(item.evidence) && item.evidence.length > 0 ? item.evidence.map((source) => ({ ...source, sourceType: "job_posting" as const })) : [toEvidence("채용공고 원문", item.url, "job_posting")],
    };
  }
  return normalizeWebItem(raw, null);
};

const normalizeCachedResponse = (raw: unknown, searchedAt: string): RealJobResponse | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<RealJobResponse>;
  if (!Array.isArray(value.items) || value.items.length === 0) return null;

  const items = value.items
    .map((item) => normalizeCachedItem(item))
    .filter((item): item is RealJob => Boolean(item?.url && isTrustedJobUrl(item.url)))
    .slice(0, MAX_RESULTS);

  if (items.length === 0) return null;

  const marketInsights = value.marketInsights ?? buildMarketInsights("cache", items, null, searchedAt);
  return {
    recommendedRoles: Array.isArray(value.recommendedRoles) ? value.recommendedRoles.map(String).slice(0, 5) : [],
    marketInsights: {
      ...marketInsights,
      source: "cache",
      searchedAt,
    },
    items,
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

  const cacheUpdatedAt = cached?.updated_at ?? cached?.created_at;
  const cacheTime = cacheUpdatedAt ? new Date(cacheUpdatedAt).getTime() : 0;
  const coverLetterTime = latestCoverLetter?.created_at ? new Date(latestCoverLetter.created_at).getTime() : 0;
  const canUseCache = Boolean(cached?.results) && cacheTime >= coverLetterTime && Date.now() - cacheTime <= CACHE_MAX_AGE_MS;

  if (canUseCache && cached?.results) {
    const cachedResponse = normalizeCachedResponse(cached.results, cacheUpdatedAt);
    if (cachedResponse) {
      const verified = await Promise.all(
        cachedResponse.items.map(async (item) => {
          const ok = await verifyLiveJobPosting(item);
          return ok ? item : null;
        }),
      );
      const items = verified.filter((item): item is RealJob => Boolean(item));
      if (items.length > 0) {
        const marketInsights = buildMarketInsights("cache", items, cachedResponse.marketInsights.postingPoolSize, cacheUpdatedAt);
        return NextResponse.json({
          source: "cache",
          searchedAt: cacheUpdatedAt,
          recommendedRoles: cachedResponse.recommendedRoles,
          marketInsights,
          items: applyAverageCompetitionText(items, marketInsights.averageApplicantsPerPosting),
        });
      }
    }
  }

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
  const recommendedRoles = await getRecommendedRoles(typedProfile, typedCoverLetters);
  const items = await fetchVerifiedWebJobs(recommendedRoles, typedProfile, typedCoverLetters);

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "조건에 맞는 모집중 공고를 찾지 못했습니다. OPENAI_API_KEY 설정과 프로필의 희망 직무/기술 스택을 확인한 뒤 다시 시도해 주세요.",
      },
      { status: 404 },
    );
  }

  const marketInsights = buildMarketInsights("verified_web_search", items, null);
  const scoredItems = applyAverageCompetitionText(items, marketInsights.averageApplicantsPerPosting);

  const results: RealJobResponse = {
    recommendedRoles,
    marketInsights,
    items: scoredItems,
  };

  const { error: saveError } = await serviceClient.from("real_job_search_cache").upsert(
    {
      user_id: user.id,
      results,
      updated_at: marketInsights.searchedAt,
    },
    { onConflict: "user_id" },
  );

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "verified_web_search",
    searchedAt: marketInsights.searchedAt,
    ...results,
  });
}

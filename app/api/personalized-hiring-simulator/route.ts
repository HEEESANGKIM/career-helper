import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invokeBedrockJson, isBedrockConfigured } from "@/lib/bedrock-client";
import { clampScore, cleanText, getUserIdFromRequest } from "@/lib/evaluation-server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const serviceClient = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

type LanguageMode = "ko" | "en";

type ProfileRow = {
  full_name?: string | null;
  school_name?: string | null;
  major?: string | null;
  gpa_score?: number | null;
  gpa?: number | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  skills?: string | null;
  role_certifications?: string | null;
  desired_companies?: string | null;
  target_industry?: string | null;
  preferred_location?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  experience_summary?: string | null;
  internship_count?: number | null;
  project_count?: number | null;
  target_role?: string | null;
};

type CoverLetterRow = {
  resume_text?: string | null;
  job_description?: string | null;
  generated_text?: string | null;
};

function parseLanguage(value: unknown): LanguageMode {
  return String(value ?? "").toLowerCase() === "en" ? "en" : "ko";
}

function splitTerms(...values: Array<string | null | undefined>) {
  return values
    .join(",")
    .split(/[,/|•\n]/)
    .map((item) => cleanText(item, 80))
    .filter(Boolean);
}

function fallback(profile: ProfileRow | null, coverLetters: CoverLetterRow[], language: LanguageMode) {
  const skills = splitTerms(profile?.core_skills, profile?.tech_stack, profile?.skills).slice(0, 8);
  const targetRole = cleanText(profile?.target_role, 80) || (language === "en" ? "Software Engineering Intern" : "소프트웨어 엔지니어링 인턴");
  const targetCompany = splitTerms(profile?.desired_companies)[0] || "Nvidia";
  const projectCount = Number(profile?.project_count ?? 0);
  const internshipCount = Number(profile?.internship_count ?? 0);
  const resumeMatchScore = clampScore(50 + skills.length * 4 + projectCount * 5 + internshipCount * 4, 70);
  const interviewScore = clampScore(48 + (profile?.experience_summary ? 14 : 0) + internshipCount * 4, 66);
  const readinessScore = clampScore(Math.round(resumeMatchScore * 0.48 + interviewScore * 0.38 + Math.min(14, projectCount * 3)), 72);
  const lastJob = coverLetters[0]?.job_description;

  return {
    targetRole,
    targetCompany,
    experienceLevel: internshipCount > 1 ? (language === "en" ? "Entry Level" : "신입/주니어") : language === "en" ? "Internship / New Grad" : "인턴십 / 신입",
    jobDescription: cleanText(lastJob, 900) || (language === "en" ? `Targeting ${targetRole} roles with ${skills.join(", ") || "profile skills"}.` : `${skills.join(", ") || "프로필 스킬"} 기반으로 ${targetRole} 직무를 준비 중입니다.`),
    resumeMatchScore,
    interviewScore,
    readinessScore,
    missingSkills: language === "en" ? ["More measurable project impact", "Role-specific technical proof", "Company-specific motivation"] : ["정량 성과가 있는 프로젝트 근거", "직무별 기술 증거", "회사별 지원 동기"],
    strongSignals: [
      ...(skills.length ? skills.slice(0, 3) : [language === "en" ? "Profile skills started" : "프로필 스킬 입력됨"]),
      projectCount ? (language === "en" ? `${projectCount} project(s)` : `프로젝트 ${projectCount}개`) : language === "en" ? "Career target defined" : "커리어 목표 설정됨",
    ],
    weakSignals: language === "en" ? ["Interview examples need sharper results", "Resume bullets need stronger metrics"] : ["면접 사례의 결과가 더 구체적이어야 함", "이력서 문장에 정량 지표가 더 필요함"],
    interviewQuestions: {
      behavioral: language === "en" ? [`Tell me about the strongest project that proves your fit for ${targetRole}.`, "Describe a time you improved after feedback."] : [`${targetRole} 적합성을 가장 잘 보여주는 프로젝트를 설명해 주세요.`, "피드백을 받고 개선했던 경험을 말해 주세요."],
      technical: language === "en" ? [`Which technical decision in your ${skills[0] || "main"} work had the biggest trade-off?`, "How would you debug a slow feature used by real users?"] : [`${skills[0] || "주요 기술"} 관련 작업에서 가장 큰 트레이드오프가 있었던 기술 결정을 설명해 주세요.`, "실제 사용자가 쓰는 기능이 느릴 때 어떻게 디버깅하겠습니까?"],
      companyFit: language === "en" ? [`Why ${targetCompany}, and why this role now?`, "Which company product or technical area connects to your profile?"] : [`왜 ${targetCompany}이고, 왜 지금 이 직무인가요?`, "회사 제품/기술 영역 중 본인 프로필과 연결되는 부분은 무엇인가요?"],
      followUp: language === "en" ? ["What measurable result can you add?", "What would you do differently next time?"] : ["어떤 정량 결과를 추가할 수 있나요?", "다음에는 무엇을 다르게 하겠습니까?"],
    },
    answerFeedback: {
      clarity: clampScore(interviewScore + 6),
      specificity: clampScore(interviewScore - 4),
      relevance: clampScore(resumeMatchScore),
      structure: clampScore(interviewScore + 2),
      confidence: clampScore(interviewScore - 2),
    },
    recommendedActions: language === "en"
      ? ["Rewrite two resume bullets with measurable impact.", `Prepare one ${targetRole} story using your strongest project.`, `Research ${targetCompany} and connect one product to your skills.`]
      : ["이력서 문장 2개를 정량 성과 중심으로 다시 쓰세요.", `가장 강한 프로젝트로 ${targetRole} 면접 스토리 1개를 준비하세요.`, `${targetCompany} 제품 하나를 조사해 본인 스킬과 연결하세요.`],
    source: "profile_fallback" as const,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const language = parseLanguage(body?.language);
  const userId = await getUserIdFromRequest(request);
  if (!serviceClient || !userId) {
    return NextResponse.json(fallback(null, [], language));
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name, school_name, major, gpa_score, gpa, core_skills, tech_stack, skills, role_certifications, desired_companies, target_industry, preferred_location, portfolio_url, github_url, experience_summary, internship_count, project_count, target_role")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  const { data: coverLetters } = await serviceClient
    .from("cover_letters")
    .select("resume_text, job_description, generated_text")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  const base = fallback(profile ?? null, (coverLetters ?? []) as CoverLetterRow[], language);
  if (!isBedrockConfigured() || !profile) return NextResponse.json(base);

  const prompt = [
    "Personalize PathMate.ai Hiring Simulator from the authenticated user's profile.",
    `Return JSON only in ${language === "en" ? "English" : "Korean"}.`,
    "Schema: {targetRole,targetCompany,experienceLevel,jobDescription,resumeMatchScore,interviewScore,readinessScore,missingSkills:string[],strongSignals:string[],weakSignals:string[],interviewQuestions:{behavioral:string[],technical:string[],companyFit:string[],followUp:string[]},answerFeedback:{clarity:number,specificity:number,relevance:number,structure:number,confidence:number},recommendedActions:string[]}",
    "Use conservative estimated practice scores, not real hiring probabilities. Do not invent private facts.",
    `fallback: ${JSON.stringify(base)}`,
    `profile: ${JSON.stringify(profile)}`,
    `recentDocuments: ${JSON.stringify((coverLetters ?? []).slice(0, 2))}`,
  ].join("\n");

  try {
    const parsed = (await invokeBedrockJson(prompt, { temperature: 0.2, useKnowledgeBase: true })) as Partial<
      ReturnType<typeof fallback>
    > | null;
    if (!parsed) return NextResponse.json(base);

    return NextResponse.json({
      ...base,
      ...parsed,
      resumeMatchScore: clampScore(parsed.resumeMatchScore, base.resumeMatchScore),
      interviewScore: clampScore(parsed.interviewScore, base.interviewScore),
      readinessScore: clampScore(parsed.readinessScore, base.readinessScore),
      answerFeedback: {
        clarity: clampScore(parsed.answerFeedback?.clarity, base.answerFeedback.clarity),
        specificity: clampScore(parsed.answerFeedback?.specificity, base.answerFeedback.specificity),
        relevance: clampScore(parsed.answerFeedback?.relevance, base.answerFeedback.relevance),
        structure: clampScore(parsed.answerFeedback?.structure, base.answerFeedback.structure),
        confidence: clampScore(parsed.answerFeedback?.confidence, base.answerFeedback.confidence),
      },
      source: "bedrock",
    });
  } catch {
    return NextResponse.json(base);
  }
}

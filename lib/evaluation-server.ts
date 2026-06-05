import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invokeBedrockJson, isBedrockConfigured } from "@/lib/bedrock-client";

export type LanguageMode = "ko" | "en";
export type FeatureType = "hiring-manager" | "career-chess" | "background-check" | "interview";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
/** @deprecated Use isBedrockConfigured / invokeBedrockJson instead. Kept for gradual migration. */
export const openai = isBedrockConfigured() ? ({ configured: true } as const) : null;

export { isBedrockConfigured };

const serviceClient =
  supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

const createAuthedUserClient = (token: string) =>
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
    : null;

export const parseLanguage = (value: unknown): LanguageMode => (String(value ?? "").toLowerCase() === "en" ? "en" : "ko");

/** `?language=en` on GET routes (default Korean). */
export const parseLanguageFromRequest = (request: NextRequest): LanguageMode =>
  request.nextUrl.searchParams.get("language") === "en" ? "en" : "ko";

export const cleanText = (value: unknown, max = 5000) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const clampScore = (value: unknown, fallback = 50) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

export const safeList = (value: unknown, fallback: string[], max = 6) => {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, max);
  return items.length ? items : fallback;
};

export const parseJsonObject = (text: string) => {
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

export async function requestEvaluationJson(prompt: string) {
  if (!isBedrockConfigured()) return null;

  try {
    const parsed = await invokeBedrockJson(prompt, { temperature: 0.2, useKnowledgeBase: true });
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : parseJsonObject(String(parsed ?? ""));
  } catch {
    return null;
  }
}

const extractBearer = (request: NextRequest) => {
  const header = request.headers.get("authorization") ?? "";
  const [, token] = header.split("Bearer ");
  return token?.trim() ?? "";
};

export async function getUserIdFromRequest(request: NextRequest) {
  const token = extractBearer(request);
  if (!token) return null;
  const client = createAuthedUserClient(token);
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getUserProfile(userId: string | null) {
  if (!serviceClient || !userId) return null;

  const { data } = await serviceClient
    .from("profiles")
    .select("target_role, skills, core_skills, tech_stack, experience_summary, preferred_location")
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}

export async function saveEvaluation({
  userId,
  featureType,
  input,
  output,
  overallScore,
  language,
}: {
  userId: string | null;
  featureType: FeatureType;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  overallScore: number | null;
  language: LanguageMode;
}) {
  if (!serviceClient || !userId) return null;

  const { data, error } = await serviceClient
    .from("user_evaluations")
    .insert({
      user_id: userId,
      feature_type: featureType,
      input_json: input,
      output_json: output,
      overall_score: overallScore,
      language,
    })
    .select("id, created_at")
    .single();

  if (error) return null;
  return data;
}

export async function saveFeatureRecord({
  table,
  payload,
}: {
  table: "interview_sessions" | "career_simulations" | "background_reports";
  payload: Record<string, unknown>;
}) {
  if (!serviceClient || !payload.user_id) return;
  await serviceClient.from(table).insert(payload);
}

export function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function languageName(language: LanguageMode) {
  return language === "en" ? "English" : "Korean";
}

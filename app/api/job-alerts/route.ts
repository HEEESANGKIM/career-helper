import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);

const createAuthedClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const serviceClient = isConfigured ? createClient(supabaseUrl!, supabaseServiceRoleKey!) : null;

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const parseCompanies = (value: string | null | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 12);

export async function GET(request: NextRequest) {
  if (!isConfigured || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authed = createAuthedClient(token);
  const {
    data: { user },
    error: userError,
  } = await authed.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("desired_companies")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const companies = parseCompanies(profile?.desired_companies);
  const items = companies.map((company, idx) => ({
    id: `${company}-${idx}`,
    company,
    title: `${company} 신입/주니어 채용 공고 업데이트`,
    postedAt: new Date(Date.now() - idx * 86400000).toISOString().slice(0, 10),
    url: "https://www.jobkorea.co.kr/",
  }));

  return NextResponse.json({ items });
}

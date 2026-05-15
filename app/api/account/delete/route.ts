import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const missingConfig = !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey;

const createAuthedUserClient = (token: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const serviceClient = missingConfig ? null : createClient(supabaseUrl!, supabaseServiceRoleKey!);

const extractBearer = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const [, token] = authHeader.split("Bearer ");
  return token?.trim() ?? "";
};

const getUserFromToken = async (token: string) => {
  if (!token || missingConfig) return null;
  const authedClient = createAuthedUserClient(token);
  const { data, error } = await authedClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

/** Tables keyed by user_id; removed before auth user delete (DB also cascades). */
const USER_DATA_TABLES = [
  "career_decisions",
  "career_readiness_snapshots",
  "career_simulations",
  "interview_sessions",
  "user_evaluations",
  "real_job_search_cache",
  "cover_letters",
  "user_profiles",
  "profiles",
] as const;

export async function POST(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  for (const table of USER_DATA_TABLES) {
    const { error } = await serviceClient.from(table).delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

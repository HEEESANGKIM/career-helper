import { NextRequest, NextResponse } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

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

/** PostgREST: table not exposed / missing from schema cache (partial DB setup). */
const isMissingTableError = (error: PostgrestError) => {
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /Could not find the table/i.test(message) ||
    /schema cache/i.test(message)
  );
};

/**
 * Child tables first. Missing tables are skipped so older Supabase projects still work.
 * auth.users delete also cascades when FKs exist (see supabase/schema.sql).
 */
const USER_DATA_TABLES = [
  "career_decisions",
  "background_reports",
  "interview_sessions",
  "user_evaluations",
  "career_simulations",
  "career_readiness_snapshots",
  "real_job_search_cache",
  "cover_letters",
  "user_profiles",
  "profiles",
] as const;

async function deleteUserRows(userId: string) {
  const skipped: string[] = [];

  for (const table of USER_DATA_TABLES) {
    const { error } = await serviceClient!.from(table).delete().eq("user_id", userId);
    if (!error) continue;
    if (isMissingTableError(error)) {
      skipped.push(table);
      continue;
    }
    return { ok: false as const, error: error.message, table };
  }

  return { ok: true as const, skipped };
}

export async function POST(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleanup = await deleteUserRows(user.id);
  if (!cleanup.ok) {
    return NextResponse.json(
      { error: cleanup.error, detail: `Failed while clearing ${cleanup.table}.` },
      { status: 500 },
    );
  }

  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...(cleanup.skipped.length > 0 ? { skippedTables: cleanup.skipped } : {}),
  });
}

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const missingConfig = !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey;
const METADATA_KEY = "job_favorites";

type JobFavoriteRow = {
  id: string;
  job_url: string;
  job_title: string;
  company: string;
  location: string | null;
  summary: string | null;
  fit_score: number | null;
  saved_at: string;
};

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

const cleanText = (value: unknown, max = 500) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const isJobFavoritesTableMissing = (message: string) =>
  /job_favorites/i.test(message) &&
  (/schema cache/i.test(message) || /does not exist/i.test(message) || /PGRST205/i.test(message));

let tableReadyCache: boolean | null = null;

const isTableReady = async () => {
  if (!serviceClient) return false;
  if (tableReadyCache !== null) return tableReadyCache;

  const { error } = await serviceClient.from("job_favorites").select("id").limit(1);
  if (!error) {
    tableReadyCache = true;
    return true;
  }
  if (isJobFavoritesTableMissing(error.message)) {
    tableReadyCache = false;
    return false;
  }

  throw new Error(error.message);
};

const normalizeMetadataFavorites = (value: unknown): JobFavoriteRow[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<JobFavoriteRow>;
      if (!row.id || !row.job_url || !row.job_title || !row.company || !row.saved_at) return null;
      return {
        id: String(row.id),
        job_url: String(row.job_url),
        job_title: String(row.job_title),
        company: String(row.company),
        location: row.location ? String(row.location) : null,
        summary: row.summary ? String(row.summary) : null,
        fit_score: typeof row.fit_score === "number" ? row.fit_score : null,
        saved_at: String(row.saved_at),
      } satisfies JobFavoriteRow;
    })
    .filter((item): item is JobFavoriteRow => Boolean(item))
    .sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime())
    .slice(0, 50);
};

const readMetadataFavorites = async (userId: string) => {
  if (!serviceClient) return [] as JobFavoriteRow[];

  const { data, error } = await serviceClient.auth.admin.getUserById(userId);
  if (error || !data.user) return [];

  return normalizeMetadataFavorites(data.user.user_metadata?.[METADATA_KEY]);
};

const writeMetadataFavorites = async (userId: string, items: JobFavoriteRow[]) => {
  if (!serviceClient) {
    return { error: new Error("Server configuration is missing.") };
  }

  const { data: userData, error: readError } = await serviceClient.auth.admin.getUserById(userId);
  if (readError || !userData.user) {
    return { error: readError ?? new Error("User not found.") };
  }

  const nextMetadata = {
    ...(userData.user.user_metadata ?? {}),
    [METADATA_KEY]: items,
  };

  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });

  return { error };
};

const listTableFavorites = async (userId: string) => {
  if (!serviceClient) return { data: [] as JobFavoriteRow[], error: null as Error | null };

  const { data, error } = await serviceClient
    .from("job_favorites")
    .select("id, job_url, job_title, company, location, summary, fit_score, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false })
    .limit(50);

  if (error) {
    return { data: [] as JobFavoriteRow[], error: new Error(error.message) };
  }

  return { data: (data ?? []) as JobFavoriteRow[], error: null };
};

const saveTableFavorite = async (userId: string, payload: Omit<JobFavoriteRow, "id"> & { id?: string }) => {
  if (!serviceClient) return { data: null as JobFavoriteRow | null, error: new Error("Server configuration is missing.") };

  const row = {
    user_id: userId,
    job_url: payload.job_url,
    job_title: payload.job_title,
    company: payload.company,
    location: payload.location,
    summary: payload.summary,
    fit_score: payload.fit_score,
    saved_at: payload.saved_at,
  };

  const { data: existing, error: lookupError } = await serviceClient
    .from("job_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("job_url", payload.job_url)
    .maybeSingle();

  if (lookupError) {
    return { data: null, error: new Error(lookupError.message) };
  }

  if (existing?.id) {
    const { data, error } = await serviceClient
      .from("job_favorites")
      .update(row)
      .eq("id", existing.id)
      .select("id, job_url, job_title, company, location, summary, fit_score, saved_at")
      .single();

    return { data: (data as JobFavoriteRow | null) ?? null, error: error ? new Error(error.message) : null };
  }

  const { data, error } = await serviceClient
    .from("job_favorites")
    .insert(row)
    .select("id, job_url, job_title, company, location, summary, fit_score, saved_at")
    .single();

  return { data: (data as JobFavoriteRow | null) ?? null, error: error ? new Error(error.message) : null };
};

export async function GET(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tableReady = await isTableReady();
    if (tableReady) {
      const { data, error } = await listTableFavorites(user.id);
      if (error) {
        if (isJobFavoritesTableMissing(error.message)) {
          tableReadyCache = false;
          return NextResponse.json({ items: await readMetadataFavorites(user.id) });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ items: data });
    }

    return NextResponse.json({ items: await readMetadataFavorites(user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load favorites.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const body = await request.json().catch(() => null);
  const jobUrl = cleanText(body?.url, 2000);
  const jobTitle = cleanText(body?.title, 300);
  const company = cleanText(body?.company, 200);

  if (!jobUrl || !isHttpUrl(jobUrl)) {
    return NextResponse.json({ error: "A valid job url is required." }, { status: 400 });
  }
  if (!jobTitle || !company) {
    return NextResponse.json({ error: "title and company are required." }, { status: 400 });
  }

  const fitScoreRaw = typeof body?.fitScore === "number" ? body.fitScore : Number(body?.fitScore);
  const fitScore = Number.isFinite(fitScoreRaw) ? Math.max(0, Math.min(100, Math.round(fitScoreRaw))) : null;
  const savedAt = new Date().toISOString();
  const favoritePayload = {
    job_url: jobUrl,
    job_title: jobTitle,
    company,
    location: cleanText(body?.location, 200) || null,
    summary: cleanText(body?.summary, 500) || null,
    fit_score: fitScore,
    saved_at: savedAt,
  };

  try {
    const tableReady = await isTableReady();

    if (tableReady) {
      const { data, error } = await saveTableFavorite(user.id, favoritePayload);
      if (error) {
        if (isJobFavoritesTableMissing(error.message)) {
          tableReadyCache = false;
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      } else if (data) {
        return NextResponse.json({ item: data });
      }
    }

    const current = await readMetadataFavorites(user.id);
    const existing = current.find((item) => item.job_url === jobUrl);
    const nextItem: JobFavoriteRow = existing
      ? { ...existing, ...favoritePayload }
      : { id: randomUUID(), ...favoritePayload };

    const nextItems = [nextItem, ...current.filter((item) => item.job_url !== jobUrl)].slice(0, 50);
    const { error: writeError } = await writeMetadataFavorites(user.id, nextItems);
    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 500 });
    }

    return NextResponse.json({ item: nextItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save favorite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (missingConfig || !serviceClient) {
    return NextResponse.json({ error: "Server configuration is missing." }, { status: 500 });
  }

  const token = extractBearer(request);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    const tableReady = await isTableReady();

    if (tableReady) {
      const { data: existing, error: lookupError } = await serviceClient
        .from("job_favorites")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError && !isJobFavoritesTableMissing(lookupError.message)) {
        return NextResponse.json({ error: lookupError.message }, { status: 500 });
      }

      if (existing) {
        const { error: deleteError } = await serviceClient.from("job_favorites").delete().eq("id", id).eq("user_id", user.id);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
      }
    }

    const current = await readMetadataFavorites(user.id);
    const nextItems = current.filter((item) => item.id !== id);
    if (nextItems.length === current.length) {
      return NextResponse.json({ error: "Favorite not found." }, { status: 404 });
    }

    const { error: writeError } = await writeMetadataFavorites(user.id, nextItems);
    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete favorite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

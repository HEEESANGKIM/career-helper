import type { SupabaseClient } from "@supabase/supabase-js";

export const SETTINGS_ONBOARDING_PATH = "/settings?welcome=1";

export type ProfileOnboardingRow = {
  target_role?: string | null;
  core_skills?: string | null;
  tech_stack?: string | null;
  major?: string | null;
  school_name?: string | null;
  experience_summary?: string | null;
};

/** True when the auto-created profile still needs first-time setup. */
export function isProfileOnboardingNeeded(profile: ProfileOnboardingRow | null | undefined) {
  if (!profile) return true;

  const filled = [
    profile.target_role,
    profile.core_skills,
    profile.tech_stack,
    profile.major,
    profile.school_name,
    profile.experience_summary,
  ].filter((value) => String(value ?? "").trim().length > 0).length;

  return filled < 2;
}

export function isRecentlyCreatedUser(createdAt: string | undefined, windowMs = 5 * 60 * 1000) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= windowMs;
}

export function sanitizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

type ResolvePostAuthRedirectOptions = {
  /** Email sign-up that returned a session immediately. */
  isNewSignup?: boolean;
  /** OAuth / magic-link: user created within the last few minutes and profile is still empty. */
  treatRecentSignUpAsOnboarding?: boolean;
  next?: string | null;
};

export async function resolvePostAuthRedirect(
  client: SupabaseClient,
  options: ResolvePostAuthRedirectOptions = {},
): Promise<string> {
  if (options.isNewSignup) {
    return SETTINGS_ONBOARDING_PATH;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return "/login";
  }

  const { data: profile } = await client
    .from("profiles")
    .select("target_role, core_skills, tech_stack, major, school_name, experience_summary")
    .eq("user_id", user.id)
    .maybeSingle<ProfileOnboardingRow>();

  if (
    options.treatRecentSignUpAsOnboarding &&
    isRecentlyCreatedUser(user.created_at) &&
    isProfileOnboardingNeeded(profile)
  ) {
    return SETTINGS_ONBOARDING_PATH;
  }

  return sanitizeNextPath(options.next);
}

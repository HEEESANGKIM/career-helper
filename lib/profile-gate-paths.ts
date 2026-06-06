export const PROFILE_GATE_PATHS = ["/dashboard", "/cover-letter", "/hiring-simulator", "/matching"] as const;

export const PROFILE_GATE_SELECT =
  "full_name, school_name, school_type, education_level, major, graduation_status, graduation_date, gpa_score, gpa_scale, internship_count, project_count, target_role, target_industry, core_skills, tech_stack";

export const isProfileGatedPath = (pathname: string) =>
  PROFILE_GATE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const isSettingsPath = (pathname: string) =>
  pathname === "/settings" || pathname.startsWith("/settings/") || pathname.startsWith("/my-info");

export const PROFILE_GATE_SETTINGS_PATH = "/settings?profile_required=1";

export const profileGateMessage = (language: "ko" | "en") =>
  language === "en"
    ? "Complete all required fields (*) in Settings — including core skills and tech stack — before using Dashboard, Resume Lab, Hiring Simulator, or Job Match."
    : "Dashboard·Resume Lab·채용 시뮬레이터·Job Match를 사용하려면 Settings에서 * 표시 필수 항목(핵심 스킬·기술 스택 포함)을 모두 입력해 주세요.";

import { NextRequest, NextResponse } from "next/server";
import { careerDataCopy, findCareerTemplate, getRelatedSyntheticProfiles, localizeTemplate, type LanguageMode } from "@/lib/career-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  const language: LanguageMode = request.nextUrl.searchParams.get("language") === "en" ? "en" : "ko";
  const decodedRole = decodeURIComponent(role);
  const template = findCareerTemplate(decodedRole);
  return NextResponse.json({
    sourceNote: careerDataCopy[language],
    template: localizeTemplate(template, language),
    syntheticExamples: getRelatedSyntheticProfiles(template.role, 5),
  });
}

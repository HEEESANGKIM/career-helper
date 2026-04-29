import { NextRequest, NextResponse } from "next/server";
import { careerDataCopy, getCareerTemplates, localizeTemplate, type LanguageMode } from "@/lib/career-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const language: LanguageMode = request.nextUrl.searchParams.get("language") === "en" ? "en" : "ko";
  const roles = getCareerTemplates().map((template) => {
    const localized = localizeTemplate(template, language);
    return {
      role: localized.role,
      category: localized.category,
      requiredSkills: localized.requiredSkills,
      salaryBand: localized.salaryBand,
      beginnerEntryPoints: localized.beginnerEntryPoints,
    };
  });

  return NextResponse.json({
    sourceNote: careerDataCopy[language],
    roles,
  });
}

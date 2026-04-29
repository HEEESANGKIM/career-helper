import { listFiles, readCsv, readJson, writeJson } from "./utils";

type Role = { role: string; onet_code: string; category: string };

const roles = readJson<Role[]>("data/processed/roles.json", []);
const files = listFiles("data/raw/onet", [".csv", ".txt"]);
const rows = files.flatMap((file) => readCsv(file));

const skills = roles.map((role) => {
  const related = rows.filter((row) => Object.values(row).some((value) => String(value).includes(role.onet_code)));
  const extracted = related
    .map((row) => String(row.Element_Name || row.Title || row.Task || row.Skill || row["Element Name"] || "").trim())
    .filter(Boolean)
    .slice(0, 12);
  return {
    role: role.role,
    onet_code: role.onet_code,
    skills: extracted.length ? [...new Set(extracted)] : undefined,
  };
});

writeJson("data/processed/onet_role_frameworks.json", {
  source: "O*NET local download",
  note: "No scraping. Place O*NET CSV/TXT files in data/raw/onet.",
  generated_at: new Date().toISOString(),
  roles: skills,
});

console.log(`Processed ${files.length} O*NET files into data/processed/onet_role_frameworks.json`);

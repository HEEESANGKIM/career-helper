import { listFiles, readCsv, readJson, writeJson } from "./utils";

type SalaryBand = { role: string; entry: string; mid: string; currency: string; source: string };

const fallback = readJson<SalaryBand[]>("data/processed/salary_bands.json", []);
const files = listFiles("data/raw/bls_oews", [".csv"]);
const rows = files.flatMap((file) => readCsv(file));

const normalized = fallback.map((band) => {
  const match = rows.find((row) => {
    const title = String(row.OCC_TITLE || row.occupation || row.title || "").toLowerCase();
    return title && band.role.toLowerCase().split(" ").some((term) => title.includes(term));
  });
  return {
    ...band,
    entry: String(match?.A_PCT25 || match?.p25 || band.entry),
    mid: String(match?.A_MEDIAN || match?.median || band.mid),
    source: match ? "BLS OEWS local CSV" : band.source,
  };
});

writeJson("data/processed/salary_bands.json", normalized);
console.log(`Processed ${files.length} BLS OEWS CSV files into data/processed/salary_bands.json`);

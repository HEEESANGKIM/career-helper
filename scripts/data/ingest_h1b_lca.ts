import { listFiles, readCsv, writeJson } from "./utils";

const files = listFiles("data/raw/h1b", [".csv"]);
const rows = files.flatMap((file) => readCsv(file));

const examples = rows
  .map((row) => ({
    employer: row.EMPLOYER_NAME || row.employer || "",
    job_title: row.JOB_TITLE || row.job_title || "",
    worksite_state: row.WORKSITE_STATE || row.state || "",
    source: "DOL/OFLC H-1B LCA local disclosure file",
  }))
  .filter((row) => row.employer && row.job_title)
  .slice(0, 500);

writeJson("data/processed/company_examples.json", {
  note: "Derived only from manually downloaded OFLC disclosure files. No LinkedIn/Glassdoor/Blind/Reddit scraping.",
  generated_at: new Date().toISOString(),
  examples,
});

console.log(`Processed ${files.length} OFLC files into data/processed/company_examples.json`);

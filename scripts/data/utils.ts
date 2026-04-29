import fs from "node:fs";
import path from "node:path";

export const rootDir = process.cwd();

export function ensureDir(dir: string) {
  fs.mkdirSync(path.join(rootDir, dir), { recursive: true });
}

export function readJson<T>(file: string, fallback: T): T {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) return fallback;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

export function writeJson(file: string, value: unknown) {
  const fullPath = path.join(rootDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function listFiles(dir: string, extensions: string[]) {
  const fullDir = path.join(rootDir, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs
    .readdirSync(fullDir)
    .filter((file) => extensions.some((extension) => file.toLowerCase().endsWith(extension)))
    .map((file) => path.join(fullDir, file));
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
}

export function readCsv(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine);
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

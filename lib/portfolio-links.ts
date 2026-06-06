const LINK_SPLIT_PATTERN = /[\n,]+/;

export function parsePortfolioLinks(value: string | null | undefined) {
  return String(value ?? "")
    .split(LINK_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializePortfolioLinks(links: string[]) {
  return links.map((link) => link.trim()).filter(Boolean).join("\n");
}

export function hasPortfolioLinks(value: string | null | undefined) {
  return parsePortfolioLinks(value).length > 0;
}

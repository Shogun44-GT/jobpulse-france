import type { IncomingJob } from "./validation";

type ComparableJob = Pick<IncomingJob, "company" | "title" | "location" | "contract">;

const LEGAL_SUFFIXES = new Set([
  "sas", "sasu", "sa", "sarl", "eurl", "sci", "groupe", "group", "france"
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string, ignored = new Set<string>()) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !ignored.has(token)));
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function postalCode(value: string) {
  return normalize(value).match(/\b(?:0[1-9]|[1-8]\d|9[0-5]|2[ab])\d{3}\b/)?.[0];
}

export function duplicateScore(left: ComparableJob, right: ComparableJob) {
  if (left.contract && right.contract && left.contract !== right.contract) return 0;

  const company = jaccard(tokens(left.company, LEGAL_SUFFIXES), tokens(right.company, LEGAL_SUFFIXES));
  const title = jaccard(tokens(left.title), tokens(right.title));
  const leftPostal = postalCode(left.location);
  const rightPostal = postalCode(right.location);
  const location = leftPostal && rightPostal && leftPostal === rightPostal
    ? 1
    : jaccard(tokens(left.location), tokens(right.location));

  if (company < 0.68 || title < 0.62 || location < 0.25) return 0;
  return Number((company * 0.38 + title * 0.47 + location * 0.15).toFixed(4));
}

export function isProbableDuplicate(left: ComparableJob, right: ComparableJob) {
  return duplicateScore(left, right) >= 0.76;
}

import { incomingJobSchema, type IncomingJob } from "../validation";

type AtsSource = "greenhouse" | "lever" | "ashby" | "smartrecruiters";
const targets = (name: string) => (process.env[name] || "").split(",").map((v) => v.trim()).filter(Boolean);
const text = (html?: string | null) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const iso = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(typeof value === "number" ? value : String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
const contract = (value: string): IncomingJob["contract"] => {
  const v = value.toLowerCase();
  if (/alternance|apprenti|apprentice|work.study/.test(v)) return "alternance";
  if (/stage|intern(ship)?/.test(v)) return "stage";
  if (/graduate|new.grad/.test(v)) return "graduate";
  if (/cdd|fixed.term/.test(v)) return "cdd";
  if (/cdi|full.time|permanent/.test(v)) return "cdi";
  return undefined;
};
const keep = (job: IncomingJob | null) => {
  if (!job?.contract) return null;
  const france = /france|paris|lyon|lille|nantes|bordeaux|toulouse|marseille|montpellier|rennes|nice|grenoble|strasbourg|remote.*(fr|eu)|\bfr\b/i.test(job.location);
  const earlyCareer = ["stage", "alternance", "graduate"].includes(job.contract) ||
    (job.contract === "cdi" && /junior|débutant|debutant|new.grad|graduate/i.test(job.title));
  return france && earlyCareer ? job : null;
};
function parse(source: AtsSource, raw: Record<string, unknown>, company: string): IncomingJob | null {
  const categories = (raw.categories || {}) as Record<string, unknown>;
  const location = raw.location as Record<string, unknown> | undefined;
  const workplace = raw.workplace as Record<string, unknown> | undefined;
  const address = workplace?.location as Record<string, unknown> | undefined;
  const title = String(raw.title || raw.text || raw.name || "");
  const description = text(String(raw.content || raw.descriptionPlain || raw.description || raw.descriptionHtml || ""));
  const structuredLocation = [location?.city, location?.region, location?.country].filter(Boolean).join(", ");
  const locationText = String(categories.location || location?.name || structuredLocation || address?.address || (typeof raw.location === "string" ? raw.location : "France"));
  const commitment = String(categories.commitment || raw.employmentType || raw.employment_type || "");
  const parsed = incomingJobSchema.safeParse({
    externalId: String(raw.id || raw.uuid || raw.jobId || ""), source, company, title, description,
    location: locationText, contract: contract(`${title} ${commitment} ${description}`),
    remote: /remote|télétravail|hybrid|hybride/i.test(`${raw.workplaceType || raw.isRemote || ""} ${locationText} ${description}`),
    applyUrl: raw.absolute_url || raw.applyUrl || raw.jobUrl || raw.apply_url || raw.ref || raw.url,
    publishedAt: iso(raw.updated_at || raw.createdAt || raw.publishedDate || raw.releasedDate)
  });
  return parsed.success ? keep(parsed.data) : null;
}
async function json(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<unknown>;
}
async function collect(source: AtsSource, names: string[], load: (name: string) => Promise<Record<string, unknown>[]>) {
  const jobs: IncomingJob[] = [];
  const errors: string[] = [];
  await Promise.all(names.map(async (name) => {
    try { for (const raw of await load(name)) { const job = parse(source, raw, name); if (job) jobs.push(job); } }
    catch (error) { errors.push(`${name}: ${error instanceof Error ? error.message : "erreur"}`); }
  }));
  if (!jobs.length && errors.length === names.length) throw new Error(errors.join(" | ").slice(0, 1000));
  return [...new Map(jobs.map((job) => [job.externalId, job])).values()];
}
export const atsConfigured = (source: AtsSource) => targets({greenhouse:"GREENHOUSE_BOARDS",lever:"LEVER_SITES",ashby:"ASHBY_BOARDS",smartrecruiters:"SMARTRECRUITERS_COMPANIES"}[source]).length > 0;
export const fetchGreenhouseJobs = () => collect("greenhouse", targets("GREENHOUSE_BOARDS"), async (name) => {
  const data = await json(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(name)}/jobs?content=true`) as { jobs?: Record<string, unknown>[] };
  return data.jobs || [];
});
export const fetchLeverJobs = () => collect("lever", targets("LEVER_SITES"), async (name) => await json(`https://api.lever.co/v0/postings/${encodeURIComponent(name)}?mode=json`) as Record<string, unknown>[]);
export const fetchAshbyJobs = () => collect("ashby", targets("ASHBY_BOARDS"), async (name) => {
  const data = await json(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(name)}`) as { jobs?: Record<string, unknown>[] };
  return data.jobs || [];
});
export const fetchSmartRecruitersJobs = () => collect("smartrecruiters", targets("SMARTRECRUITERS_COMPANIES"), async (name) => {
  const data = await json(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(name)}/postings?limit=100`) as { content?: Record<string, unknown>[] };
  return data.content || [];
});

import { incomingJobSchema, type IncomingJob } from "../validation";

type LbaJob = {
  identifier?: {
    id?: string | null;
    partner_job_id?: string | null;
    partner_label?: string | null;
  };
  workplace?: {
    name?: string | null;
    brand?: string | null;
    legal_name?: string | null;
    location?: { address?: string | null } | null;
  };
  apply?: { url?: string | null };
  contract?: {
    remote?: "onsite" | "remote" | "hybrid" | null;
  };
  offer?: {
    title?: string | null;
    description?: string | null;
    status?: "Active" | "Filled" | "Cancelled" | null;
    publication?: {
      creation?: string | null;
      expiration?: string | null;
    } | null;
  };
};

type LbaSearchResponse = {
  jobs?: LbaJob[];
  warnings?: Array<{ code?: string; message?: string }>;
};

const DEFAULT_API_URL = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search";
const DEFAULT_ROMES = "M1805,M1806,M1804,M1802,M1810";

function validIso(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isFranceTravail(job: LbaJob) {
  return /france\s*travail|pole\s*emploi|pôle\s*emploi/i.test(job.identifier?.partner_label ?? "");
}

export function normalizeLaBonneAlternanceJob(job: LbaJob): IncomingJob | null {
  if (job.offer?.status && job.offer.status !== "Active") return null;
  if (isFranceTravail(job)) return null;

  const externalId = job.identifier?.id || job.identifier?.partner_job_id;
  const parsed = incomingJobSchema.safeParse({
    externalId,
    source: "la-bonne-alternance",
    company:
      job.workplace?.brand?.trim() ||
      job.workplace?.name?.trim() ||
      job.workplace?.legal_name?.trim() ||
      "Entreprise confidentielle",
    title: job.offer?.title?.trim(),
    description: job.offer?.description || "",
    location: job.workplace?.location?.address?.trim() || "France",
    contract: "alternance",
    remote: job.contract?.remote === "remote" || job.contract?.remote === "hybrid",
    applyUrl: job.apply?.url,
    publishedAt: validIso(job.offer?.publication?.creation),
    deadlineAt: validIso(job.offer?.publication?.expiration)
  });

  return parsed.success ? parsed.data : null;
}

export function isLaBonneAlternanceConfigured() {
  return Boolean(process.env.LA_BONNE_ALTERNANCE_API_KEY?.trim());
}

export async function fetchLaBonneAlternanceJobs() {
  const apiKey = process.env.LA_BONNE_ALTERNANCE_API_KEY?.trim();
  if (!apiKey) throw new Error("Variable manquante: LA_BONNE_ALTERNANCE_API_KEY");

  const url = new URL(process.env.LA_BONNE_ALTERNANCE_API_URL || DEFAULT_API_URL);
  url.searchParams.set("romes", process.env.LA_BONNE_ALTERNANCE_ROMES || DEFAULT_ROMES);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`Recherche La Bonne Alternance: ${response.status}${details ? ` — ${details}` : ""}`);
  }

  const data = (await response.json()) as LbaSearchResponse;
  const unique = new Map<string, IncomingJob>();
  for (const offer of data.jobs ?? []) {
    const job = normalizeLaBonneAlternanceJob(offer);
    if (job) unique.set(job.externalId, job);
  }
  return [...unique.values()];
}

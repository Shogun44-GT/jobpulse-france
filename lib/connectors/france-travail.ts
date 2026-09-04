import { incomingJobSchema, type IncomingJob } from "../validation";

type FtOffer = {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  dateActualisation?: string;
  lieuTravail?: { libelle?: string };
  entreprise?: { nom?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  alternance?: boolean;
  origineOffre?: { urlOrigine?: string };
  contact?: { urlPostulation?: string };
};

type FtSearchResponse = { resultats?: FtOffer[] };

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante: ${name}`);
  return value;
}

async function accessToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("FRANCE_TRAVAIL_CLIENT_ID"),
    client_secret: requireEnv("FRANCE_TRAVAIL_CLIENT_SECRET"),
    scope: "api_offresdemploiv2 o2dsoffre"
  });
  const response = await fetch(requireEnv("FRANCE_TRAVAIL_TOKEN_URL"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  if (!response.ok) {
  const details = (await response.text()).slice(0, 500);
  throw new Error(
    `Authentification France Travail: ${response.status} — ${details}`
  );
}
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Jeton France Travail absent de la réponse");
  return data.access_token;
}

function contract(offer: FtOffer, hint?: "stage" | "alternance"): IncomingJob["contract"] {
  if (hint) return hint;
  const text = `${offer.typeContrat ?? ""} ${offer.typeContratLibelle ?? ""} ${offer.intitule} ${offer.description ?? ""}`.toLowerCase();
  if (offer.alternance || /alternance|apprenti|professionnalisation/.test(text)) return "alternance";
  if (/stage|stagiaire/.test(text)) return "stage";
  if (/cdi/.test(text)) return "cdi";
  if (/cdd/.test(text)) return "cdd";
  return undefined;
}

function normalize(offer: FtOffer, hint?: "stage" | "alternance"): IncomingJob | null {
  const applyUrl = offer.contact?.urlPostulation || offer.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${offer.id}`;
  const parsed = incomingJobSchema.safeParse({
    externalId: offer.id,
    source: "france-travail",
    company: offer.entreprise?.nom?.trim() || "Entreprise confidentielle",
    title: offer.intitule,
    description: offer.description || "",
    location: offer.lieuTravail?.libelle || "France",
    contract: contract(offer, hint),
    remote: /télétravail|teletravail|remote/i.test(offer.description || ""),
    applyUrl,
    publishedAt: offer.dateCreation ? new Date(offer.dateCreation).toISOString() : undefined
  });
  return parsed.success ? parsed.data : null;
}

export async function fetchFranceTravailJobs() {
  const token = await accessToken();
  const searches: Array<{ keywords: string; contract: "stage" | "alternance" }> = [
    { keywords: "stage informatique", contract: "stage" },
    { keywords: "stage développeur", contract: "stage" },
    { keywords: "alternance informatique", contract: "alternance" },
    { keywords: "alternance développeur", contract: "alternance" },
    { keywords: "apprentissage informatique", contract: "alternance" }
  ];
  const batches = await Promise.all(searches.map(async (search) => {
    const url = new URL(`${requireEnv("FRANCE_TRAVAIL_API_URL")}/offres/search`);
    url.searchParams.set("motsCles", search.keywords);
    url.searchParams.set("range", "0-49");
    url.searchParams.set("sort", "1");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Recherche France Travail (${search.keywords}): ${response.status}`);
    const data = await response.json() as FtSearchResponse;
    return (data.resultats ?? []).map((offer) => normalize(offer, search.contract));
  }));
  const unique = new Map<string, IncomingJob>();
  for (const job of batches.flat()) if (job) unique.set(job.externalId, job);
  return [...unique.values()];
}

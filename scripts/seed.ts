import { closeDb, sql } from "../lib/db";
import { createHash } from "node:crypto";

const seedJobs = [
  ["demo-doctolib-1", "Doctolib", "Stage Software Engineer — Backend", "Paris", "stage", true, "https://careers.doctolib.com/"],
  ["demo-mistral-1", "Mistral AI", "Alternance Machine Learning Engineer", "Paris", "alternance", false, "https://jobs.lever.co/mistral/"],
  ["demo-backmarket-1", "Back Market", "Stage Data Analyst", "Bordeaux", "stage", true, "https://jobs.backmarket.com/"]
] as const;

async function main() {
  const source = await sql`SELECT id FROM sources WHERE slug = 'greenhouse' LIMIT 1`;
  if (!source.rows[0]) throw new Error("Lance d'abord npm run db:migrate");
  for (const job of seedJobs) {
    const [externalId, company, title, location, contract, remote, applyUrl] = job;
    const fp = createHash("sha256").update(`greenhouse|${externalId}`).digest("hex");
    await sql`
      INSERT INTO jobs (source_id, external_id, fingerprint, company, title, location, contract, remote, apply_url, published_at)
      VALUES (${source.rows[0].id}, ${externalId}, ${fp}, ${company}, ${title}, ${location}, ${contract}, ${remote}, ${applyUrl}, NOW())
      ON CONFLICT (fingerprint) DO NOTHING
    `;
  }
  console.log("Données de démonstration ajoutées.");
}

main().then(closeDb).catch(async (error) => { console.error(error); await closeDb(); process.exit(1); });

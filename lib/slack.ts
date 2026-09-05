import { sql } from "./db";
import { decryptSecret } from "./secret-crypto";
import { calculateMatch } from "./matching";

type SlackJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  contract?: string;
  remote: boolean;
  applyUrl: string;
  source: string;
  publishedAt?: string;
  score?: number;
  matchReasons?: string[];
};

export function slackConfigured() {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export function shouldNotify(contract?: string) {
  const allowed = (process.env.SLACK_CONTRACTS || "stage,alternance,graduate")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(contract && allowed.includes(contract.toLowerCase()));
}

export async function enqueueSlack(jobId: string) {
  await sql`INSERT INTO notification_outbox (job_id) VALUES (${jobId}) ON CONFLICT (job_id) DO NOTHING`;
}

async function postSlack(job: SlackJob, webhook = process.env.SLACK_WEBHOOK_URL) {
  if (!webhook) throw new Error("Webhook Slack manquant");
  const flags = [job.contract?.toUpperCase(), job.remote ? "Télétravail possible" : null].filter(Boolean).join(" • ");
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Nouvelle offre : ${job.title} chez ${job.company}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: `⚡ ${job.title}`.slice(0, 150), emoji: true } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*Entreprise*\n${job.company}` },
          { type: "mrkdwn", text: `*Localisation*\n${job.location}` },
          { type: "mrkdwn", text: `*Contrat*\n${flags || "Non précisé"}` },
          { type: "mrkdwn", text: `*Source*\n${job.source}` }
        ] },
        ...(typeof job.score === "number" ? [{ type: "section", text: { type: "mrkdwn", text: `*Compatibilité : ${job.score}%*${job.matchReasons?.length ? `\n${job.matchReasons.join(" • ")}` : ""}` } }] : []),
        { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Postuler maintenant", emoji: true }, style: "primary", url: job.applyUrl }] },
        { type: "context", elements: [{ type: "mrkdwn", text: "Détectée par JobPulse France • Vérifie toujours les informations sur le site source." }] }
      ]
    })
  });
  if (!response.ok) throw new Error(`Slack a répondu ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

export async function deliverSlackOutbox() {
  if (!slackConfigured()) return { sent: 0, failed: 0, skipped: "webhook_missing" };
  const max = Math.min(20, Math.max(1, Number(process.env.SLACK_MAX_MESSAGES_PER_RUN) || 10));
  const pending = await sql`
    SELECT o.id, j.id AS "jobId", j.company, j.title, j.location, j.contract, j.remote,
      j.apply_url AS "applyUrl", j.published_at AS "publishedAt", s.name AS source
    FROM notification_outbox o
    JOIN jobs j ON j.id = o.job_id JOIN sources s ON s.id = j.source_id
    WHERE o.status IN ('pending', 'failed') AND o.attempts < 3
    ORDER BY o.created_at ASC LIMIT ${max}
  `;
  let sent = 0; let failed = 0;
  for (const row of pending.rows) {
    const outboxId = row.id as string;
    await sql`UPDATE notification_outbox SET status = 'sending', attempts = attempts + 1 WHERE id = ${outboxId}`;
    try {
      await postSlack({ id: row.jobId as string, company: row.company as string, title: row.title as string, location: row.location as string, contract: row.contract as string | undefined, remote: row.remote as boolean, applyUrl: row.applyUrl as string, source: row.source as string, publishedAt: row.publishedAt as string | undefined });
      await sql`UPDATE notification_outbox SET status = 'sent', delivered_at = NOW(), last_error = NULL WHERE id = ${outboxId}`;
      sent += 1;
    } catch (error) {
      await sql`UPDATE notification_outbox SET status = 'failed', last_error = ${error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue"} WHERE id = ${outboxId}`;
      failed += 1;
    }
  }
  return { sent, failed, pending: pending.rows.length };
}

export async function sendSlackTest() {
  await postSlack({ id: "test", company: "JobPulse France", title: "Connexion Slack réussie", location: "France", contract: "test", remote: true, applyUrl: "https://francetravail.fr", source: "Message de test" });
}

export async function enqueueUserSlack(jobId: string) {
  const candidates = await sql`
    SELECT sc.user_id, j.id AS job_id, j.title, j.description, j.location, j.contract, j.remote,
      cp.desired_roles, cp.skills, cp.desired_locations, cp.desired_contracts,
      cp.remote_preference, cp.minimum_score
    FROM slack_connections sc
    JOIN jobs j ON j.id = ${jobId}
    LEFT JOIN candidate_profiles cp ON cp.user_id = sc.user_id
  `;
  for (const row of candidates.rows) {
    if (!row.desired_roles || !row.skills) continue;
    const match = calculateMatch({ title:row.title as string, description:row.description as string, location:row.location as string, contract:row.contract as string|null, remote:row.remote as boolean }, {
      desiredRoles:row.desired_roles as string[], skills:row.skills as string[],
      desiredLocations:row.desired_locations as string[], desiredContracts:row.desired_contracts as string[],
      remotePreference:row.remote_preference as string, minimumScore:row.minimum_score as number
    });
    if (!match.profileReady || match.score < Number(row.minimum_score ?? 60)) continue;
    await sql`
      INSERT INTO user_notification_outbox (user_id, job_id, match_score, match_reasons)
      VALUES (${row.user_id}, ${row.job_id}, ${match.score}, ${match.reasons})
      ON CONFLICT (user_id, job_id) DO NOTHING
    `;
  }
}

export async function deliverUserSlackOutbox() {
  const max = Math.min(30, Math.max(1, Number(process.env.SLACK_USER_MAX_MESSAGES_PER_RUN) || 20));
  const pending = await sql`
    SELECT o.id, sc.webhook_ciphertext, sc.webhook_iv, j.id AS "jobId", j.company,
      j.title, j.location, j.contract, j.remote, j.apply_url AS "applyUrl",
      j.published_at AS "publishedAt", s.name AS source, o.match_score, o.match_reasons
    FROM user_notification_outbox o
    JOIN slack_connections sc ON sc.user_id = o.user_id
    JOIN jobs j ON j.id = o.job_id JOIN sources s ON s.id = j.source_id
    WHERE o.status IN ('pending', 'failed') AND o.attempts < 3
    ORDER BY o.created_at ASC LIMIT ${max}
  `;
  let sent = 0; let failed = 0;
  for (const row of pending.rows) {
    const outboxId = row.id as string;
    await sql`UPDATE user_notification_outbox SET status='sending', attempts=attempts+1 WHERE id=${outboxId}`;
    try {
      const webhook = decryptSecret(row.webhook_ciphertext as string, row.webhook_iv as string);
      await postSlack({ id: row.jobId as string, company: row.company as string, title: row.title as string, location: row.location as string, contract: row.contract as string | undefined, remote: row.remote as boolean, applyUrl: row.applyUrl as string, source: row.source as string, publishedAt: row.publishedAt as string | undefined, score: row.match_score as number | undefined, matchReasons: row.match_reasons as string[] | undefined }, webhook);
      await sql`UPDATE user_notification_outbox SET status='sent', delivered_at=NOW(), last_error=NULL WHERE id=${outboxId}`;
      sent += 1;
    } catch (error) {
      await sql`UPDATE user_notification_outbox SET status='failed', last_error=${error instanceof Error ? error.message.slice(0,500) : "Erreur inconnue"} WHERE id=${outboxId}`;
      failed += 1;
    }
  }
  return { sent, failed, pending: pending.rows.length };
}

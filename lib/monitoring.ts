import { sql } from "./db";

const DEFAULT_FAILURE_THRESHOLD = 3;

export function shouldSendFailureAlert(failures: number, threshold = DEFAULT_FAILURE_THRESHOLD) {
  return failures >= threshold && failures % threshold === 0;
}

export async function alertAfterConsecutiveFailures(source: string, error?: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return { alerted: false, reason: "webhook_missing" };

  const threshold = Math.max(2, Number(process.env.SYNC_FAILURE_ALERT_THRESHOLD) || DEFAULT_FAILURE_THRESHOLD);
  const result = await sql`
    SELECT COUNT(*)::int AS failures
    FROM sync_runs
    WHERE source = ${source}
      AND status = 'failed'
      AND created_at > COALESCE(
        (SELECT MAX(created_at) FROM sync_runs WHERE source = ${source} AND status = 'success'),
        '-infinity'::timestamptz
      )
  `;
  const failures = Number(result.rows[0]?.failures ?? 0);
  if (!shouldSendFailureAlert(failures, threshold)) return { alerted: false, failures };

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Alerte JobPulse : ${source} a échoué ${failures} fois consécutives.`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "⚠️ Synchronisation en échec", emoji: true } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*Source*\n${source}` },
          { type: "mrkdwn", text: `*Échecs consécutifs*\n${failures}` }
        ] },
        ...(error ? [{ type: "section", text: { type: "mrkdwn", text: `*Dernière erreur*\n${error.slice(0, 300)}` } }] : []),
        { type: "context", elements: [{ type: "mrkdwn", text: "JobPulse continuera les nouvelles tentatives automatiquement." }] }
      ]
    })
  });
  if (!response.ok) throw new Error(`Slack monitoring a répondu ${response.status}`);
  return { alerted: true, failures };
}

import { closeDb, sql } from "../lib/db";
import { decryptSecret, encryptSecret, type SecretPurpose } from "../lib/secret-crypto";

async function rotateSlack() {
  const result = await sql`SELECT user_id, webhook_ciphertext, webhook_iv FROM slack_connections`;
  for (const row of result.rows) {
    const value = decryptSecret(row.webhook_ciphertext as string, row.webhook_iv as string, "slack");
    const encrypted = encryptSecret(value, "slack");
    await sql`UPDATE slack_connections SET webhook_ciphertext=${encrypted.ciphertext}, webhook_iv=${encrypted.iv} WHERE user_id=${row.user_id}`;
  }
  return result.rows.length;
}

async function rotateAi() {
  const result = await sql`SELECT user_id, api_key_ciphertext, api_key_iv FROM user_ai_settings`;
  for (const row of result.rows) {
    const value = decryptSecret(row.api_key_ciphertext as string, row.api_key_iv as string, "gemini");
    const encrypted = encryptSecret(value, "gemini");
    await sql`UPDATE user_ai_settings SET api_key_ciphertext=${encrypted.ciphertext}, api_key_iv=${encrypted.iv} WHERE user_id=${row.user_id}`;
  }
  return result.rows.length;
}

async function rotateCv() {
  const result = await sql`SELECT user_id, text_ciphertext, text_iv FROM candidate_cvs`;
  for (const row of result.rows) {
    const value = decryptSecret(row.text_ciphertext as string, row.text_iv as string, "cv");
    const encrypted = encryptSecret(value, "cv");
    await sql`UPDATE candidate_cvs SET text_ciphertext=${encrypted.ciphertext}, text_iv=${encrypted.iv} WHERE user_id=${row.user_id}`;
  }
  return result.rows.length;
}

async function main() {
  const counts: Record<SecretPurpose, number> = {
    slack: await rotateSlack(),
    gemini: await rotateAi(),
    cv: await rotateCv()
  };
  console.log(`Rotation terminée : Slack ${counts.slack}, Gemini ${counts.gemini}, CV ${counts.cv}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(closeDb);

import { sql } from "./db";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function getAdminDashboard() {
  const [metricsResult, usersResult, runsResult] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS "newUsers7d",
        (SELECT COUNT(*)::int FROM candidate_profiles
          WHERE cardinality(desired_roles) > 0 AND cardinality(skills) > 0) AS "completeProfiles",
        (SELECT COUNT(*)::int FROM candidate_cvs) AS cvs,
        (SELECT COUNT(*)::int FROM slack_connections) AS "slackConnections",
        (SELECT COUNT(*)::int FROM applications) AS applications,
        (SELECT COUNT(*)::int FROM ai_generation_log
          WHERE created_at >= NOW() - INTERVAL '30 days') AS "aiGenerations30d"
    `,
    sql`
      SELECT u.email, u.display_name AS "displayName", u.created_at AS "createdAt",
        u.last_login_at AS "lastLoginAt",
        EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.user_id = u.id) AS "hasProfile",
        EXISTS (SELECT 1 FROM candidate_cvs cv WHERE cv.user_id = u.id) AS "hasCv",
        EXISTS (SELECT 1 FROM slack_connections sc WHERE sc.user_id = u.id) AS "hasSlack",
        (SELECT COUNT(*)::int FROM applications a WHERE a.user_id = u.id) AS applications
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 20
    `,
    sql`
      SELECT source, status, fetched, inserted, duration_ms AS "durationMs",
        error, created_at AS "createdAt"
      FROM sync_runs
      ORDER BY created_at DESC
      LIMIT 25
    `
  ]);

  const metrics = metricsResult.rows[0] ?? {};
  return {
    metrics: {
      users: Number(metrics.users ?? 0),
      newUsers7d: Number(metrics.newUsers7d ?? 0),
      completeProfiles: Number(metrics.completeProfiles ?? 0),
      cvs: Number(metrics.cvs ?? 0),
      slackConnections: Number(metrics.slackConnections ?? 0),
      applications: Number(metrics.applications ?? 0),
      aiGenerations30d: Number(metrics.aiGenerations30d ?? 0)
    },
    users: usersResult.rows,
    runs: runsResult.rows
  };
}

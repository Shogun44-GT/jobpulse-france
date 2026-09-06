import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type SlackOAuthResponse = { ok:boolean; error?:string; team?:{id?:string;name?:string}; incoming_webhook?:{channel?:string;channel_id?:string;url?:string} };

export async function GET(request: Request) {
  const destination = new URL("/settings/slack", process.env.APP_URL || request.url);
  const session = await auth();
  if (!session?.user?.email) return NextResponse.redirect(new URL("/connexion", request.url));
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("jobpulse_slack_state")?.value;
  if (!expectedState || url.searchParams.get("state") !== expectedState) { destination.searchParams.set("error", "state"); return NextResponse.redirect(destination); }
  const code = url.searchParams.get("code");
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) { destination.searchParams.set("error", "configuration"); return NextResponse.redirect(destination); }
  const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const exchange = await fetch("https://slack.com/api/oauth.v2.access", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":`Basic ${basic}`}, body:new URLSearchParams({code,redirect_uri:`${appUrl}/api/slack/callback`}) });
  const data = await exchange.json() as SlackOAuthResponse;
  const webhook = data.incoming_webhook;
  if (!data.ok || !webhook?.url || !webhook.channel_id) { destination.searchParams.set("error", data.error || "oauth"); return NextResponse.redirect(destination); }
  const encrypted = encryptSecret(webhook.url, "slack");
  const email = session.user.email.toLowerCase();
  await sql`
    INSERT INTO slack_connections (user_id, team_id, team_name, channel_id, channel_name, webhook_ciphertext, webhook_iv)
    SELECT id, ${data.team?.id || "unknown"}, ${data.team?.name || "Slack"}, ${webhook.channel_id}, ${webhook.channel || "canal"}, ${encrypted.ciphertext}, ${encrypted.iv}
    FROM users WHERE LOWER(email) = ${email}
    ON CONFLICT (user_id) DO UPDATE SET team_id=EXCLUDED.team_id, team_name=EXCLUDED.team_name,
      channel_id=EXCLUDED.channel_id, channel_name=EXCLUDED.channel_name,
      webhook_ciphertext=EXCLUDED.webhook_ciphertext, webhook_iv=EXCLUDED.webhook_iv, updated_at=NOW()
  `;
  destination.searchParams.set("connected", "1");
  const response = NextResponse.redirect(destination);
  response.cookies.delete("jobpulse_slack_state");
  return response;
}

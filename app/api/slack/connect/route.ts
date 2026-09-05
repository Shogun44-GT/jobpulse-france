import { auth } from "@/auth";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.redirect(new URL("/connexion", request.url));
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/settings/slack?error=configuration", request.url));
  const state = randomBytes(32).toString("hex");
  const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/slack/callback`;
  const authorize = new URL("https://slack.com/oauth/v2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", "incoming-webhook");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  const response = NextResponse.redirect(authorize);
  response.cookies.set("jobpulse_slack_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}

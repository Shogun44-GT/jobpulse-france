import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { sql } from "@/lib/db";

export const { handlers, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/connexion" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.email) return false;
      const googleSub = typeof profile?.sub === "string" ? profile.sub : account.providerAccountId;
      await sql`
        INSERT INTO users (email, display_name, google_sub, image_url, email_verified, last_login_at)
        VALUES (${user.email}, ${user.name ?? null}, ${googleSub}, ${user.image ?? null}, TRUE, NOW())
        ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name,
          google_sub = EXCLUDED.google_sub, image_url = EXCLUDED.image_url,
          email_verified = TRUE, last_login_at = NOW(), updated_at = NOW()
      `;
      return true;
    }
  }
});

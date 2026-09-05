import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./account.css";
import "./auth-components.css";
import "./profile/profile.css";
import "./applications/applications.css";
import "./dashboard-actions.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "JobPulse France — Les offres avant tout le monde",
  description: "Alertes rapides pour les stages, alternances et premiers emplois tech en France."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}

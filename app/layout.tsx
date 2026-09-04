import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";

export const metadata: Metadata = {
  title: "JobPulse France — Les offres avant tout le monde",
  description: "Alertes rapides pour les stages, alternances et premiers emplois tech en France."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

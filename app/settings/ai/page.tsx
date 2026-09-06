import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AiSettingsPanel } from "./ai-settings-panel";

export default async function AiSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="aiPage"><section className="aiShell"><header className="aiHeader"><Link href="/" className="backLink">← Tableau de bord</Link><span className="aiGlyph">✦</span><h1>Accroches de candidature</h1><p>Utilise ton propre quota Gemini. JobPulse ne paie rien et ta clé reste chiffrée.</p></header><AiSettingsPanel/></section></main>;
}

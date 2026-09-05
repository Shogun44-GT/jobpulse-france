"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
export default function ConnexionPage() {
  return <main className="accountPage"><section className="accountCard"><Link href="/" className="backLink">← Retour aux offres</Link><span className="accountLogo">⚡</span><h1>Bienvenue sur JobPulse</h1><p>Connecte-toi pour enregistrer tes critères, suivre tes candidatures et recevoir des alertes personnalisées.</p><button className="googleButton" onClick={() => signIn("google", { callbackUrl: "/" })}><span>G</span> Continuer avec Google</button><small>En continuant, tu autorises l’utilisation de ton nom, ton adresse e-mail et ta photo de profil pour créer ton compte.</small></section></main>;
}

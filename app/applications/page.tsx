import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="accountPage"><section className="accountCard wide"><Link href="/" className="backLink">← Retour au tableau de bord</Link><h1>Mes candidatures</h1><div className="comingBlock"><h2>Aucune candidature suivie</h2><p>Les offres sauvegardées apparaîtront ici avec leur statut : à préparer, envoyée, entretien, offre reçue ou refus.</p></div></section></main>;
}

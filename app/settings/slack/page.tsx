import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function SlackSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="accountPage"><section className="accountCard wide"><Link href="/" className="backLink">← Retour au tableau de bord</Link><h1>Connexion Slack</h1><div className="comingBlock"><h2>Compte prêt</h2><p>La prochaine étape activera l’autorisation Slack personnelle pour choisir ton espace et ton canal d’alertes.</p></div></section></main>;
}

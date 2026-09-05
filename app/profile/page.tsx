import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="accountPage"><section className="accountCard wide"><Link href="/" className="backLink">← Retour au tableau de bord</Link><h1>Mon profil</h1><p>Connecté avec <strong>{session.user.email}</strong></p><div className="comingBlock"><h2>Profil candidat</h2><p>La prochaine étape ajoutera ton CV, tes technologies, tes villes et tes contrats recherchés.</p></div></section></main>;
}

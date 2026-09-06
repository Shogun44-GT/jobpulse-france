import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "./profile-form";
import { CvUpload } from "./cv-upload";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return (
    <main className="profilePage"><section className="profileShell">
      <header className="profileHeader"><div><Link href="/" className="backLink">← Tableau de bord</Link>
        <h1>Mon profil candidat</h1><p>Ces préférences serviront à classer les offres et à limiter les alertes inutiles.</p>
      </div><div className="profileIdentity"><span>{session.user.name ?? "Compte Google"}</span><small>{session.user.email}</small></div></header>
      <CvUpload />
      <ProfileForm />
    </section></main>
  );
}

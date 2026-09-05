import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ApplicationsBoard } from "./applications-board";
export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="applicationsPage"><section className="applicationsShell"><header className="applicationsHeader"><div><Link href="/" className="backLink">← Tableau de bord</Link><h1>Mes candidatures</h1><p>Suis chaque opportunité, garde tes notes et vois immédiatement la prochaine action.</p></div><div className="profileIdentity"><span>{session.user.name??"Compte Google"}</span><small>{session.user.email}</small></div></header><ApplicationsBoard/></section></main>;
}

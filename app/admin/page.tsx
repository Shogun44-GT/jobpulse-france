import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAdminDashboard, isAdminEmail } from "@/lib/admin";
import "./admin.css";

export const dynamic = "force-dynamic";

function dateTime(value: unknown) {
  if (!value) return "Jamais";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);
}

function yesNo(value: unknown) {
  return value ? <span className="adminYes">Oui</span> : <span className="adminNo">Non</span>;
}

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) notFound();

  const { metrics, users, runs } = await getAdminDashboard();
  const cards = [
    ["Utilisateurs", metrics.users],
    ["Nouveaux sur 7 jours", metrics.newUsers7d],
    ["Profils complétés", metrics.completeProfiles],
    ["CV enregistrés", metrics.cvs],
    ["Slack connectés", metrics.slackConnections],
    ["Candidatures suivies", metrics.applications],
    ["Générations IA sur 30 jours", metrics.aiGenerations30d]
  ] as const;

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <div><p>JOBPULSE FRANCE</p><h1>Administration</h1><span>Vue en lecture seule de l’adoption et de la santé du service.</span></div>
        <Link href="/">Retour aux offres</Link>
      </header>

      <section className="adminGrid" aria-label="Indicateurs">
        {cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value.toLocaleString("fr-FR")}</strong></article>)}
      </section>

      <section className="adminPanel">
        <div className="adminSectionTitle"><div><h2>Derniers utilisateurs</h2><p>Les 20 inscriptions les plus récentes.</p></div></div>
        <div className="adminTableWrap"><table><thead><tr><th>Utilisateur</th><th>Inscription</th><th>Dernière connexion</th><th>Profil</th><th>CV</th><th>Slack</th><th>Candidatures</th></tr></thead>
          <tbody>{users.map((user) => <tr key={String(user.email)}>
            <td><strong>{String(user.displayName || "Sans nom")}</strong><small>{String(user.email)}</small></td>
            <td>{dateTime(user.createdAt)}</td><td>{dateTime(user.lastLoginAt)}</td>
            <td>{yesNo(user.hasProfile)}</td><td>{yesNo(user.hasCv)}</td><td>{yesNo(user.hasSlack)}</td><td>{Number(user.applications ?? 0)}</td>
          </tr>)}</tbody>
        </table>{users.length === 0 && <p className="adminEmpty">Aucun utilisateur inscrit.</p>}</div>
      </section>

      <section className="adminPanel">
        <div className="adminSectionTitle"><div><h2>Synchronisations récentes</h2><p>Les 25 dernières exécutions enregistrées.</p></div></div>
        <div className="adminTableWrap"><table><thead><tr><th>Source</th><th>État</th><th>Offres lues</th><th>Ajoutées</th><th>Durée</th><th>Date</th><th>Erreur</th></tr></thead>
          <tbody>{runs.map((run, index) => <tr key={`${String(run.source)}-${String(run.createdAt)}-${index}`}>
            <td><strong>{String(run.source)}</strong></td>
            <td><span className={`adminStatus ${String(run.status)}`}>{String(run.status)}</span></td>
            <td>{Number(run.fetched ?? 0)}</td><td>{Number(run.inserted ?? 0)}</td><td>{(Number(run.durationMs ?? 0) / 1000).toFixed(1)} s</td>
            <td>{dateTime(run.createdAt)}</td><td className="adminError">{run.error ? String(run.error).slice(0, 160) : "—"}</td>
          </tr>)}</tbody>
        </table>{runs.length === 0 && <p className="adminEmpty">Aucune synchronisation enregistrée.</p>}</div>
      </section>
    </main>
  );
}

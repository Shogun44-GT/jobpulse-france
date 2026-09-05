import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SlackConnectionPanel } from "./slack-connection-panel";
export default async function SlackSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <main className="slackPage"><section className="slackShell"><header className="slackHeader"><Link href="/" className="backLink">← Tableau de bord</Link><span className="slackGlyph">✣</span><h1>Alertes Slack</h1><p>Choisis ton espace et ton canal. JobPulse y enverra les nouvelles offres correspondant à tes préférences.</p></header><SlackConnectionPanel/></section></main>;
}

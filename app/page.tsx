"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Bookmark, BriefcaseBusiness, Check, ChevronDown, Clock3, Copy, ExternalLink, LogIn, MapPin, Search, Settings2, SlidersHorizontal, Sparkles, UserRound, Zap } from "lucide-react";
import { demoJobs } from "@/lib/demo-data";
import type { Job } from "@/lib/types";

const contracts = ["Tous", "Stage", "Alternance", "Graduate", "CDI junior"];
const cities = ["Toute la France", "Paris", "Lyon", "Bordeaux", "Lille", "Nantes", "Toulouse"];

export default function Dashboard() {
  const fallbackJobs = process.env.NODE_ENV === "development" ? demoJobs : [];
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>(fallbackJobs);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({recent:0,alternances:0,sources:0});
  const [query, setQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState("Tous");
  const [location, setLocation] = useState("Toute la France");
  const [remote, setRemote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [savingJob, setSavingJob] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [generatingJob, setGeneratingJob] = useState<string | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<Record<string,{text:string;label:string}>>({});
  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedContract !== "Tous") params.set("contract", selectedContract.toLowerCase().replace(" junior", ""));
    if (location !== "Toute la France") params.set("location", location);
    if (remote) params.set("remote", "true");
    return params.toString();
  }, [query, selectedContract, location, remote]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/jobs?${apiQuery}`, { signal: controller.signal });
        if (!response.ok) throw new Error("API indisponible");
        const data = await response.json() as { jobs: Job[]; total: number; stats?:{recent:number;alternances:number;sources:number} };
        setJobs(data.jobs); setTotal(data.total); if(data.stats)setStats(data.stats);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) { setJobs(fallbackJobs); setTotal(fallbackJobs.length); }
      } finally { setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [apiQuery]);

  useEffect(() => {
    if (!session?.user) { setSavedJobs(new Set()); return; }
    fetch("/api/applications").then(async response => {
      if (!response.ok) return;
      const data = await response.json() as { applications: { jobId: string }[] };
      setSavedJobs(new Set(data.applications.map(item => item.jobId)));
    });
  }, [session]);

  async function followJob(jobId: string) {
    if (!session?.user) { await signIn("google", { callbackUrl: "/" }); return; }
    if (savedJobs.has(jobId)) { window.location.href = "/applications"; return; }
    setSavingJob(jobId); setNotice("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setSavedJobs(current => new Set(current).add(jobId));
      setNotice("Offre ajoutée à tes candidatures.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Une erreur est survenue"); }
    finally { setSavingJob(null); }
  }

  async function generateHook(jobId:string,format:"hook"|"letter"|"linkedin"){
    if(!session?.user){await signIn("google",{callbackUrl:"/"});return;}
    setGeneratingJob(`${jobId}:${format}`);setNotice("");
    try{
      const response=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId,format})});
      const data=await response.json();
      if(!response.ok){
        if(data.needsSetup){window.location.href="/settings/ai";return;}
        if(data.needsProfile){window.location.href="/profile";return;}
        throw new Error(data.error??"Génération impossible");
      }
      const labels={hook:"Accroche",letter:"Lettre de motivation",linkedin:"Message LinkedIn"};
      setGeneratedHooks(current=>({...current,[jobId]:{text:data.hook,label:labels[format]}}));
    }catch(error){setNotice(error instanceof Error?error.message:"Génération impossible")}finally{setGeneratingJob(null)}
  }

  return <main className="shell">
    <nav className="nav"><div className="brand"><span className="brandMark"><Zap size={19} fill="currentColor" /></span><span>JobPulse</span><small>FRANCE</small></div><div className="navActions"><Link className="navLink ghost" href="/applications"><BriefcaseBusiness size={16}/> Candidatures</Link><Link className="primary navLink" href="/settings/slack"><span className="slack">✣</span> Connecter Slack</Link>{session?.user ? <button className="userButton" onClick={() => signOut()}><UserRound size={16}/> {session.user.name || "Déconnexion"}</button> : <button className="navLink" onClick={() => signIn("google")}><LogIn size={16}/> Se connecter</button>}<Link className="iconButton" aria-label="Mon profil" href="/profile"><Settings2 size={18}/></Link></div></nav>
    <section className="hero"><div><p className="eyebrow"><span/> RECRUTEMENT 2026–2027</p><h1>Les meilleures offres.<br/><em>Avant tout le monde.</em></h1><p className="subtitle">Stages, alternances et premiers emplois tech en France, détectés à la source et envoyés sur Slack en moins de 10 minutes.</p></div><div className="freshness"><span className="pulse"/><div><strong>Surveillance active</strong><small>Synchronisation toutes les 10 min</small></div></div></section>
    <section className="stats"><article><span>OFFRES ACTIVES</span><strong>{total.toLocaleString("fr-FR")}</strong><small><b>Synchronisées</b> automatiquement</small></article><article className="accent"><span>NOUVELLES &lt; 1 H</span><strong>{stats.recent.toLocaleString("fr-FR")}</strong><small><Clock3 size={13}/> Détectées récemment</small></article><article><span>ALTERNANCES</span><strong>{stats.alternances.toLocaleString("fr-FR")}</strong><small>France entière</small></article><article><span>SOURCES ACTIVES</span><strong>{stats.sources}</strong><small><Check size={13}/> Sources avec offres actives</small></article></section>
    <section className="filters"><div className="search"><Search size={18}/><input aria-label="Rechercher" value={query} onChange={e => setQuery(e.target.value)} placeholder="Entreprise, métier, technologie…"/><button><SlidersHorizontal size={16}/> Filtres</button></div><div className="chips">{contracts.map(item => <button onClick={() => setSelectedContract(item)} className={selectedContract === item ? "selected" : ""} key={item}>{item}</button>)}</div><div className="filterBottom"><div className="select"><MapPin size={15}/><select aria-label="Ville" value={location} onChange={e => setLocation(e.target.value)}>{cities.map(city => <option key={city}>{city}</option>)}</select><ChevronDown size={14}/></div><label><input type="checkbox" checked={remote} onChange={e => setRemote(e.target.checked)}/> Télétravail possible</label><span className="resultCount">{loading ? "Chargement…" : `${total.toLocaleString("fr-FR")} résultats`}</span><button className="sort">Plus récentes <ChevronDown size={14}/></button></div></section>
    <section className="sectionHead"><div><h2>Offres fraîchement détectées</h2><p>Mises à jour automatiquement, sans doublons.</p></div><span><span className="liveDot"/> EN DIRECT</span></section>
    {notice && <div className="dashboardNotice">{notice}<Link href="/applications">Voir mes candidatures</Link></div>}
    <section className="grid">{jobs.map(job => <article className="job" key={job.id}><header><div className="company"><span className="logo">{job.logo || job.company.charAt(0)}</span><div><strong>{job.company}</strong><small>{job.source}</small></div></div><button className={savedJobs.has(job.id)?"savedBookmark":""} disabled={savingJob===job.id} onClick={()=>followJob(job.id)} aria-label={savedJobs.has(job.id)?"Voir dans mes candidatures":"Ajouter à mes candidatures"} title={savedJobs.has(job.id)?"Déjà suivie":"Suivre cette candidature"}><Bookmark size={17} fill={savedJobs.has(job.id)?"currentColor":"none"}/></button></header><h3>{job.title}</h3><div className="meta"><span><MapPin size={13}/>{job.location}</span>{job.remote && <span>Télétravail</span>}</div><div className="tags"><span>{job.contract || "non précisé"}</span><span>Tech</span></div><footer>{job.score ? <><div><small>Compatibilité</small><strong>{job.score}%</strong></div><div className="bar"><i style={{width:`${job.score}%`}}/></div></> : <><div/><div/></>}<a href={job.applyUrl} target="_blank" rel="noreferrer">Postuler <ExternalLink size={13}/></a></footer><div className="aiFormats"><button onClick={()=>generateHook(job.id,"hook")} disabled={Boolean(generatingJob)}><Sparkles size={13}/>{generatingJob===`${job.id}:hook`?"Génération…":"Accroche"}</button><button onClick={()=>generateHook(job.id,"letter")} disabled={Boolean(generatingJob)}>{generatingJob===`${job.id}:letter`?"Génération…":"Lettre"}</button><button onClick={()=>generateHook(job.id,"linkedin")} disabled={Boolean(generatingJob)}>{generatingJob===`${job.id}:linkedin`?"Génération…":"LinkedIn"}</button></div>{generatedHooks[job.id]&&<div className="hookResult"><strong>{generatedHooks[job.id].label}</strong><p>{generatedHooks[job.id].text}</p><button onClick={async()=>{await navigator.clipboard.writeText(generatedHooks[job.id].text);setNotice("Texte copié.")}}><Copy size={13}/>Copier</button></div>}<div className="posted"><Clock3 size={12}/>{job.publishedAt?.startsWith("Il") ? job.publishedAt : job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "Date inconnue"}</div></article>)}{!loading && jobs.length === 0 && <div className="empty">Aucune offre ne correspond à ces filtres.</div>}</section>
    <section className="cta"><Sparkles size={22}/><div><strong>Transforme l’alerte en candidature</strong><p>Utilise ton profil et ta propre clé Gemini pour générer une accroche personnalisée.</p></div><Link className="ctaButton" href="/settings/ai">Configurer l’IA</Link></section>
  </main>;
}

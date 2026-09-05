"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin, Save, Trash2 } from "lucide-react";

type Application = { id:string; jobId:string; status:string; notes:string; appliedAt:string|null; updatedAt:string; company:string; title:string; location:string; contract:string|null; remote:boolean; applyUrl:string; source:string };
const statuses = [
  ["saved","À postuler"],["applied","Envoyée"],["interview","Entretien"],
  ["offer","Offre reçue"],["rejected","Refusée"],["withdrawn","Abandonnée"]
];

export function ApplicationsBoard(){
  const [items,setItems]=useState<Application[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");
  const [saving,setSaving]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/applications").then(async(r)=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setItems(data.applications)}).catch(e=>setMessage(e.message??"Chargement impossible")).finally(()=>setLoading(false))},[]);
  const visible=useMemo(()=>filter==="all"?items:items.filter(item=>item.status===filter),[items,filter]);
  const counts=useMemo(()=>Object.fromEntries(statuses.map(([value])=>[value,items.filter(item=>item.status===value).length])),[items]);
  function change(id:string,field:"status"|"notes",value:string){setItems(current=>current.map(item=>item.id===id?{...item,[field]:value}:item))}
  async function save(item:Application){setSaving(item.id);setMessage("");try{const r=await fetch("/api/applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:item.status,notes:item.notes})});const data=await r.json();if(!r.ok)throw new Error(data.error);setMessage("Candidature mise à jour.")}catch(e){setMessage(e instanceof Error?e.message:"Enregistrement impossible")}finally{setSaving(null)}}
  async function remove(id:string){if(!confirm("Retirer cette offre de tes candidatures ?"))return;setSaving(id);try{const r=await fetch(`/api/applications?id=${id}`,{method:"DELETE"});const data=await r.json();if(!r.ok)throw new Error(data.error);setItems(current=>current.filter(item=>item.id!==id));setMessage("Candidature supprimée.")}catch(e){setMessage(e instanceof Error?e.message:"Suppression impossible")}finally{setSaving(null)}}
  if(loading)return <div className="applicationsState">Chargement de tes candidatures…</div>;
  return <>
    <section className="applicationStats"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}><strong>{items.length}</strong><span>Toutes</span></button>{statuses.slice(0,4).map(([value,label])=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}><strong>{counts[value]}</strong><span>{label}</span></button>)}</section>
    {message&&<div className="boardMessage">{message}</div>}
    {visible.length===0?<div className="applicationsEmpty"><h2>{items.length?"Aucun résultat":"Aucune candidature suivie"}</h2><p>{items.length?"Choisis un autre statut.":"Depuis le tableau de bord, clique sur le marque-page d’une offre pour l’ajouter ici."}</p></div>:
    <section className="applicationList">{visible.map(item=><article className="applicationCard" key={item.id}>
      <div className="applicationMain"><div className="applicationLogo">{item.company.charAt(0)}</div><div><span className="applicationCompany">{item.company} · {item.source}</span><h2>{item.title}</h2><div className="applicationMeta"><span><MapPin size={14}/>{item.location}</span><span>{item.contract??"Contrat non précisé"}</span>{item.remote&&<span>Télétravail</span>}</div></div><a href={item.applyUrl} target="_blank" rel="noreferrer">Voir l’offre <ExternalLink size={14}/></a></div>
      <div className="applicationControls"><label>Statut<select value={item.status} onChange={e=>change(item.id,"status",e.target.value)}>{statuses.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="notesField">Notes<textarea maxLength={2000} rows={2} value={item.notes} onChange={e=>change(item.id,"notes",e.target.value)} placeholder="Contact, prochaine action, date d’entretien…"/></label><div className="applicationButtons"><button disabled={saving===item.id} onClick={()=>save(item)}><Save size={15}/>{saving===item.id?"Enregistrement…":"Enregistrer"}</button><button className="deleteApplication" aria-label="Supprimer" disabled={saving===item.id} onClick={()=>remove(item.id)}><Trash2 size={16}/></button></div></div>
    </article>)}</section>}
  </>
}

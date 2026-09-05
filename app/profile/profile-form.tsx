"use client";
import { FormEvent, useEffect, useState } from "react";

type Profile = { headline:string; educationLevel:string; experienceYears:number; skills:string[]; desiredRoles:string[]; desiredLocations:string[]; desiredContracts:string[]; remotePreference:string; minimumScore:number };
const emptyProfile:Profile={headline:"",educationLevel:"",experienceYears:0,skills:[],desiredRoles:[],desiredLocations:[],desiredContracts:["stage","alternance"],remotePreference:"indifferent",minimumScore:60};
const contracts=[["stage","Stage"],["alternance","Alternance"],["cdi","CDI"],["cdd","CDD"],["freelance","Freelance"]];
const toText=(items:string[])=>items.join(", ");
const toList=(value:string)=>value.split(",").map((item)=>item.trim()).filter(Boolean);

export function ProfileForm(){
  const [profile,setProfile]=useState<Profile>(emptyProfile);
  const [lists,setLists]=useState({roles:"",skills:"",locations:""});
  const [status,setStatus]=useState<"loading"|"ready"|"saving"|"saved"|"error">("loading");
  const [message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/profile").then(async(response)=>{const data=await response.json();if(!response.ok)throw new Error(data.error??"Impossible de charger le profil");setProfile(data.profile);setLists({roles:toText(data.profile.desiredRoles),skills:toText(data.profile.skills),locations:toText(data.profile.desiredLocations)});setStatus("ready")}).catch((error)=>{setMessage(error.message);setStatus("error")})},[]);
  function toggleContract(value:string){setProfile((current)=>({...current,desiredContracts:current.desiredContracts.includes(value)?current.desiredContracts.filter((item)=>item!==value):[...current.desiredContracts,value]}))}
  async function save(event:FormEvent){event.preventDefault();setStatus("saving");setMessage("");const payload={...profile,desiredRoles:toList(lists.roles),skills:toList(lists.skills),desiredLocations:toList(lists.locations)};try{const response=await fetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error??"Impossible d’enregistrer le profil");setProfile(data.profile);setStatus("saved");setMessage("Profil enregistré. Tes futures alertes pourront utiliser ces préférences.")}catch(error){setMessage(error instanceof Error?error.message:"Une erreur est survenue");setStatus("error")}}
  if(status==="loading")return <div className="profileLoading">Chargement de ton profil…</div>;
  return <form className="profileForm" onSubmit={save}>
    <div className="profileSection introSection"><span className="sectionNumber">01</span><div><h2>Objectif professionnel</h2><p>Indique ce que tu recherches, avec des termes concrets.</p></div></div>
    <div className="profileGrid">
      <label className="field fieldWide">Présentation courte<input value={profile.headline} maxLength={160} onChange={(e)=>setProfile({...profile,headline:e.target.value})} placeholder="Étudiant en informatique, orienté data et backend"/><small>{profile.headline.length}/160 caractères</small></label>
      <label className="field fieldWide">Métiers recherchés<input value={lists.roles} onChange={(e)=>setLists({...lists,roles:e.target.value})} placeholder="Data analyst, développeur backend, ML engineer"/><small>Sépare chaque métier par une virgule.</small></label>
      <label className="field fieldWide">Compétences principales<input value={lists.skills} onChange={(e)=>setLists({...lists,skills:e.target.value})} placeholder="Python, SQL, TypeScript, Power BI"/><small>Sépare chaque compétence par une virgule.</small></label>
    </div>
    <div className="profileSection"><span className="sectionNumber">02</span><div><h2>Parcours</h2><p>Aide JobPulse à estimer le bon niveau d’offre.</p></div></div>
    <div className="profileGrid twoColumns">
      <label className="field">Niveau d’études<select value={profile.educationLevel} onChange={(e)=>setProfile({...profile,educationLevel:e.target.value})}><option value="">Non renseigné</option><option value="bac">Bac</option><option value="bac+2">Bac+2</option><option value="bac+3">Bac+3</option><option value="bac+5">Bac+5</option><option value="doctorat">Doctorat</option></select></label>
      <label className="field">Années d’expérience<input type="number" min="0" max="50" value={profile.experienceYears} onChange={(e)=>setProfile({...profile,experienceYears:Number(e.target.value)})}/></label>
    </div>
    <div className="profileSection"><span className="sectionNumber">03</span><div><h2>Préférences d’offres</h2><p>Choisis les critères qui doivent influencer ton classement.</p></div></div>
    <div className="profileGrid twoColumns">
      <label className="field fieldWide">Villes recherchées<input value={lists.locations} onChange={(e)=>setLists({...lists,locations:e.target.value})} placeholder="Paris, Lyon, Bordeaux, France entière"/><small>Sépare chaque lieu par une virgule.</small></label>
      <fieldset className="field fieldWide contractField"><legend>Types de contrat</legend><div className="contractChoices">{contracts.map(([value,label])=><label key={value} className={profile.desiredContracts.includes(value)?"contract active":"contract"}><input type="checkbox" checked={profile.desiredContracts.includes(value)} onChange={()=>toggleContract(value)}/>{label}</label>)}</div></fieldset>
      <label className="field">Télétravail<select value={profile.remotePreference} onChange={(e)=>setProfile({...profile,remotePreference:e.target.value})}><option value="indifferent">Indifférent</option><option value="hybrid">Hybride accepté</option><option value="remote">100 % télétravail</option></select></label>
      <label className="field scoreField">Score minimum <strong>{profile.minimumScore}%</strong><input type="range" min="0" max="100" step="5" value={profile.minimumScore} onChange={(e)=>setProfile({...profile,minimumScore:Number(e.target.value)})}/><small>Les alertes moins pertinentes pourront être masquées.</small></label>
    </div>
    <footer className="profileActions"><div className={`saveMessage ${status}`}>{message}</div><button type="submit" className="saveProfile" disabled={status==="saving"||profile.desiredContracts.length===0}>{status==="saving"?"Enregistrement…":"Enregistrer mon profil"}</button></footer>
  </form>
}

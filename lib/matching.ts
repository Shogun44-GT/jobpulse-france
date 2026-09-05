export type MatchJob = { title:string; description?:string; location:string; contract?:string|null; remote:boolean };
export type MatchProfile = { desiredRoles?:string[]; skills?:string[]; desiredLocations?:string[]; desiredContracts?:string[]; remotePreference?:string; minimumScore?:number };

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9+#.]+/g," ").trim();
const tokens=(value:string)=>new Set(normalize(value).split(" ").filter(word=>word.length>1));
function overlap(needle:string,haystack:string){const phrase=normalize(needle);const normalized=normalize(haystack);if(!phrase)return 0;if(normalized.includes(phrase))return 1;const wanted=tokens(needle);const found=tokens(haystack);return wanted.size?[...wanted].filter(word=>found.has(word)).length/wanted.size:0}
function list(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"&&item.trim().length>0):[]}

export function calculateMatch(job:MatchJob,profile:MatchProfile){
  const corpus=`${job.title} ${job.description??""}`;
  const roles=list(profile.desiredRoles);const skills=list(profile.skills);const locations=list(profile.desiredLocations);const contracts=list(profile.desiredContracts);
  const roleScore=roles.length?Math.max(...roles.map(role=>overlap(role,job.title))):0;
  const matchedSkills=skills.filter(skill=>overlap(skill,corpus)>=1);
  const skillScore=skills.length?matchedSkills.length/skills.length:0;
  const contractScore=contracts.length&&job.contract?Number(contracts.map(normalize).includes(normalize(job.contract))):0;
  const locationScore=locations.length?Number(locations.some(place=>["france","france entiere","toute la france"].includes(normalize(place))||overlap(place,job.location)>=1)):0;
  const remotePreference=profile.remotePreference??"indifferent";
  const remoteScore=remotePreference==="remote"?Number(job.remote):remotePreference==="hybrid"?(job.remote?1:.7):1;
  const score=Math.round(roleScore*35+skillScore*30+contractScore*15+locationScore*10+remoteScore*10);
  const reasons:string[]=[];
  if(roleScore>=.5)reasons.push("Métier recherché");
  if(matchedSkills.length)reasons.push(`${matchedSkills.slice(0,3).join(", ")} correspondent`);
  if(contractScore)reasons.push("Contrat souhaité");
  if(locationScore)reasons.push("Localisation compatible");
  if(remotePreference==="remote"&&job.remote)reasons.push("Télétravail compatible");
  return {score:Math.max(0,Math.min(100,score)),reasons:reasons.slice(0,3),profileReady:roles.length>0&&skills.length>0};
}

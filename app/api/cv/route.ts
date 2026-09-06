import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";
import { extractCvSkills } from "@/lib/cv";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
const MAX_SIZE=3*1024*1024;
async function email(){const session=await auth();return session?.user?.email?.trim().toLowerCase()??null}

export async function GET(){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  const result=await sql`SELECT cv.file_name,cv.file_size,cv.page_count,cv.text_length,cv.updated_at FROM candidate_cvs cv JOIN users u ON u.id=cv.user_id WHERE LOWER(u.email)=${userEmail} LIMIT 1`;
  const row=result.rows[0];
  return NextResponse.json({uploaded:Boolean(row),cv:row?{fileName:row.file_name,fileSize:row.file_size,pageCount:row.page_count,textLength:row.text_length,updatedAt:row.updated_at}:null});
}

export async function POST(request:Request){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  const form=await request.formData().catch(()=>null);const file=form?.get("cv");
  if(!(file instanceof File))return NextResponse.json({error:"Sélectionne un fichier PDF"},{status:400});
  if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf"))return NextResponse.json({error:"Le CV doit être au format PDF"},{status:415});
  if(file.size===0||file.size>MAX_SIZE)return NextResponse.json({error:"Le PDF doit peser moins de 3 Mo"},{status:413});
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(String.fromCharCode(...bytes.slice(0,5))!=="%PDF-")return NextResponse.json({error:"Ce fichier n’est pas un PDF valide"},{status:400});
  try{
    const pdf=await getDocumentProxy(bytes);
    if(pdf.numPages<1||pdf.numPages>12)return NextResponse.json({error:"Le CV doit contenir entre 1 et 12 pages"},{status:400});
    const extracted=await Promise.race([extractText(pdf,{mergePages:true}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("timeout")),12_000))]);
    const text=extracted.text.replace(/\u0000/g,"").replace(/[ \t]+/g," ").trim().slice(0,50_000);
    if(text.length<120)return NextResponse.json({error:"Ce PDF ne contient pas assez de texte. Utilise un CV PDF non scanné."},{status:422});
    const encrypted=encryptSecret(text,"cv");const hash=createHash("sha256").update(bytes).digest("hex");
    const result=await sql`INSERT INTO candidate_cvs(user_id,file_name,file_size,page_count,text_ciphertext,text_iv,text_length,content_hash) SELECT id,${file.name.slice(0,180)},${file.size},${extracted.totalPages},${encrypted.ciphertext},${encrypted.iv},${text.length},${hash} FROM users WHERE LOWER(email)=${userEmail} ON CONFLICT(user_id) DO UPDATE SET file_name=EXCLUDED.file_name,file_size=EXCLUDED.file_size,page_count=EXCLUDED.page_count,text_ciphertext=EXCLUDED.text_ciphertext,text_iv=EXCLUDED.text_iv,text_length=EXCLUDED.text_length,content_hash=EXCLUDED.content_hash,updated_at=NOW() RETURNING user_id`;
    if(!result.rows[0])return NextResponse.json({error:"Compte utilisateur introuvable"},{status:404});
    return NextResponse.json({ok:true,cv:{fileName:file.name,fileSize:file.size,pageCount:extracted.totalPages,textLength:text.length},detectedSkills:extractCvSkills(text)});
  }catch(error){console.error("CV extraction failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Impossible de lire ce PDF. Essaie de l’exporter à nouveau."},{status:422})}
}

export async function DELETE(){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  await sql`DELETE FROM candidate_cvs cv USING users u WHERE cv.user_id=u.id AND LOWER(u.email)=${userEmail}`;
  return NextResponse.json({ok:true});
}

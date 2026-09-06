import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { decryptSecret } from "@/lib/secret-crypto";
import { NextResponse } from "next/server";

async function email(){const session=await auth();return session?.user?.email?.toLowerCase()??null}

export async function GET(){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  const result=await sql`SELECT sc.team_name,sc.channel_name,sc.updated_at FROM slack_connections sc JOIN users u ON u.id=sc.user_id WHERE LOWER(u.email)=${userEmail} LIMIT 1`;
  const row=result.rows[0];
  return NextResponse.json({connected:Boolean(row),connection:row?{teamName:row.team_name,channelName:row.channel_name,updatedAt:row.updated_at}:null});
}

export async function POST(){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  const result=await sql`SELECT sc.webhook_ciphertext,sc.webhook_iv FROM slack_connections sc JOIN users u ON u.id=sc.user_id WHERE LOWER(u.email)=${userEmail} LIMIT 1`;
  const row=result.rows[0];if(!row)return NextResponse.json({error:"Slack n’est pas connecté"},{status:404});
  const response=await fetch(decryptSecret(row.webhook_ciphertext as string,row.webhook_iv as string,"slack"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"✅ JobPulse France est connecté. Tes prochaines alertes arriveront dans ce canal."})});
  if(!response.ok)return NextResponse.json({error:`Slack a répondu ${response.status}`},{status:502});
  return NextResponse.json({ok:true});
}

export async function DELETE(){
  const userEmail=await email();if(!userEmail)return NextResponse.json({error:"Non authentifié"},{status:401});
  await sql`DELETE FROM slack_connections sc USING users u WHERE sc.user_id=u.id AND LOWER(u.email)=${userEmail}`;
  return NextResponse.json({ok:true});
}

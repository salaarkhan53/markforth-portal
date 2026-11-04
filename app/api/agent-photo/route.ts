import {portalIdentity} from '../../../lib/portal-auth';
import {getDb} from '../../../db';
import {members,agentPhotos} from '../../../db/schema';
import {eq} from 'drizzle-orm';
export async function GET(req:Request){const user=await portalIdentity();if(!user)return new Response(null,{status:401});const db=getDb(),m=await db.select().from(members).where(eq(members.email,user.email.toLowerCase())).get();if(!m?.active||m.deletedAt||(user.source==='supabase'&&m.mustChangePassword))return new Response(null,{status:403});const key=new URL(req.url).searchParams.get('key')||'';const photo=await db.select().from(agentPhotos).where(eq(agentPhotos.agentKey,key)).get();if(!photo)return new Response(null,{status:404});const bytes=Uint8Array.from(atob(photo.data.split(',')[1]),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}

import {portalIdentity} from './portal-auth';
import {getDb} from '../db';
import {members} from '../db/schema';
import {eq} from 'drizzle-orm';
export async function onboardingContext(){const user=await portalIdentity();if(!user)throw Error('SIGN_IN');const db=getDb(),member=await db.select().from(members).where(eq(members.email,user.email.toLowerCase())).get();if(!member?.active||member.deletedAt||member.role!=='admin'||(user.source==='supabase'&&member.mustChangePassword))throw Error('ADMIN_REQUIRED');return {db,member};}
export const onboardingJson=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export function onboardingError(e:any){return onboardingJson({error:e.message==='SIGN_IN'?'Sign in with your administrator account.':e.message==='ADMIN_REQUIRED'?'Administrator access is required for onboarding records.':e.message},['SIGN_IN','ADMIN_REQUIRED'].includes(e.message)?403:400);}

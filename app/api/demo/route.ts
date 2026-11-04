import {cookies} from 'next/headers';
import {eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {settings,members,dids,leads,calls,bonusChallenges} from '../../../db/schema';
import {demoEnabled,DEMO_COOKIE,DEMO_USERS} from '../../../lib/demo';
export const dynamic='force-dynamic';
const json=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});

/* GET: tells the login page whether demo sign-in is available. */
export async function GET(){return json({enabled:demoEnabled()});}

/* POST {role:'admin'|'agent'}: demo sign-in. Only exists when DEMO_MODE=1. */
export async function POST(req:Request){
  if(!demoEnabled())return json({error:'Not found'},404);
  if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Invalid request origin'},403);
  const b:any=await req.json().catch(()=>({}));
  const role=b.role==='admin'?'admin':b.role==='agent'?'agent':null;
  if(!role)return json({error:'Choose admin or agent.'},400);
  await seed();
  (await cookies()).set(DEMO_COOKIE,role,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:12*3600});
  return json({ok:true});
}

/* Fills an empty demo database with sample people, DIDs, leads, call totals and a power hour. */
async function seed(){
  const db=getDb();
  if(await db.select().from(settings).where(eq(settings.key,'owner')).get())return;
  const people=[
    {email:DEMO_USERS.admin.email,name:DEMO_USERS.admin.name,role:'admin'},
    {email:DEMO_USERS.agent.email,name:DEMO_USERS.agent.name,role:'agent'},
    {email:'aisha.khan@markforth.demo',name:'Aisha Khan',role:'agent'},
    {email:'bilal.ahmed@markforth.demo',name:'Bilal Ahmed',role:'agent'},
    {email:'sara.malik@markforth.demo',name:'Sara Malik',role:'agent'},
  ];
  await db.insert(settings).values({key:'owner',value:DEMO_USERS.admin.email}).onConflictDoNothing();
  for(const p of people)await db.insert(members).values({...p,active:1}).onConflictDoNothing();
  const lines=[{id:'D1',label:'Medicare CPA - D1',campaign:'Medicare'},{id:'A7',label:'ACA - A7',campaign:'ACA'},{id:'F9',label:'Final Expense - F9',campaign:'Final Expense'}];
  for(const d of lines)await db.insert(dids).values({...d,active:1}).onConflictDoNothing();

  const now=new Date(),day=86400000;
  const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1,15)).getTime();
  const at=(daysAgo:number)=>new Date(Math.max(monthStart,now.getTime()-daysAgo*day-2*3600000)).toISOString();
  const agents=people.filter(p=>p.role==='agent');
  const customers=['Pat Rivera','Sam Carter','Alex Morgan','Jamie Brooks','Chris Lane','Taylor Reed','Jordan Hayes','Morgan Ellis','Casey Price','Riley Quinn','Drew Foster','Avery Cole','Quinn Parker','Reese Ward'];
  const plan:[number,number,string,string,string,string][]=[
    // agent index, days ago, campaign, did, status, outcome
    [0,0,'Medicare','D1','pending','pending'],[0,1,'Medicare','D1','cpa','sale'],[0,3,'ACA','A7','cpl','sale'],[0,6,'Final Expense','F9','rejected','not_sale'],
    [1,0,'Medicare','D1','cpa','sale'],[1,2,'Medicare','D1','cpa','sale'],[1,4,'ACA','A7','cpl','sale'],[1,5,'Medicare','D1','pending','pending'],
    [2,1,'ACA','A7','cpl','sale'],[2,2,'Final Expense','F9','pending','pending'],[2,7,'Medicare','D1','rejected','not_sale'],
    [3,0,'Final Expense','F9','pending','pending'],[3,3,'Medicare','D1','cpa','sale'],[3,8,'ACA','A7','pending','pending'],
  ];
  for(const [i,[a,ago,campaign,did,status,outcome]] of plan.entries()){
    const agent=agents[a];
    await db.insert(leads).values({id:crypto.randomUUID(),createdAt:at(ago),agentEmail:agent.email,agentName:agent.name,campaign,phone:'2025550'+String(100+i),customer:customers[i],age:String(58+i),zip:String(75001+i),state:['TX','FL','GA','OH','AZ'][i%5],did,status,outcome,
      note:outcome==='not_sale'?'Customer was not eligible for this plan.':status==='pending'?null:'Approved in demo review.',
      reviewedBy:status==='pending'?null:DEMO_USERS.admin.email,reviewedAt:status==='pending'?null:at(Math.max(0,ago-1))});
  }
  for(const [a,agent] of agents.entries())for(let ago=0;ago<6;ago++){
    const taken=18+((a*7+ago*5)%14),transferred=3+((a+ago)%5);
    const date=new Date(now.getTime()-ago*day).toISOString().slice(0,10);
    await db.insert(calls).values({id:crypto.randomUUID(),date,agentEmail:agent.email,campaign:['Medicare','ACA','Final Expense','Medicare'][a],did:['D1','A7','F9','D1'][a],taken,transferred});
  }
  await db.insert(bonusChallenges).values({id:crypto.randomUUID(),title:'Demo power hour',message:'Two confirmed sales unlocks the bonus. (Sample challenge)',startsAt:new Date(now.getTime()-3600000).toISOString(),endsAt:new Date(now.getTime()+3*day).toISOString(),target:2,amount:3000,campaign:'All campaigns',active:1,createdAt:now.toISOString()});
}

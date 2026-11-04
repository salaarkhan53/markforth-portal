import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { sqliteTable,text,integer } from 'drizzle-orm/sqlite-core';
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
function run(query,params,method){const st=sql.prepare(query);if(method==='run'){st.run(...params);return {rows:[]};}st.setReturnArrays(true);const rows=st.all(...params);return {rows:method==='get'?rows[0]:rows};}
const db=drizzle(async(...args)=>run(...args),async queries=>queries.map(q=>run(q.sql,q.params,q.method)));
const schemaCode=ts.transpileModule(fs.readFileSync('db/schema.ts','utf8').replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function('exports','sqliteTable','text','integer',schemaCode)(exports,sqliteTable,text,integer);
let user=null;
const code=ts.transpileModule(fs.readFileSync('app/api/portal/route.ts','utf8').replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mailEnv={PORTAL_OWNER_EMAIL:'owner@example.test'};const sent=[];let deliveryMode='ok';const fakeFetch=async(url,options)=>{sent.push({url,...options});if(deliveryMode==='unknown')throw Error('network interrupted');if(deliveryMode==='failed')return Response.json({message:'Invalid sender'},{status:422});return Response.json({id:'email-test-'+sent.length});};
const powerCode=ts.transpileModule(fs.readFileSync('lib/power.ts','utf8').replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const power={};new Function('exports','eq','bonusChallenges','bonusAwards','leads','members','notificationReads',powerCode)(power,eq,exports.bonusChallenges,exports.bonusAwards,exports.leads,exports.members,exports.notificationReads);
let authMode=false;const api={};new Function('exports','portalIdentity','getDb','members','leads','calls','settings','audit','eq','and','invitations','env','fetch','dids','authConfigured','adminAuth','revokeSessions','agentPhotos','bonusChallenges','evaluateBonuses','powerSnapshot','authSessions','notificationReads','chatMemberships','chatReads','inArray','isNull',code)(api,async()=>user,()=>db,exports.members,exports.leads,exports.calls,exports.settings,exports.audit,eq,and,exports.invitations,mailEnv,fakeFetch,exports.dids,()=>authMode,async()=>{throw Error('Password session required');},async()=>{},exports.agentPhotos,exports.bonusChallenges,power.evaluateBonuses,power.powerSnapshot,exports.authSessions,exports.notificationReads,exports.chatMemberships,exports.chatReads,inArray,isNull);
async function post(b,origin='https://portal.test'){return api.POST(new Request('https://portal.test/api/portal',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(b)}));}
function as(email){user={userId:email,email,displayName:email};}
assert.equal((await (await api.GET()).json()).login,true);
as('owner@example.test');assert.equal((await api.GET()).status,200);
assert.equal((await post({action:'setup',name:'Owner'})).status,200);
assert.equal((await post({action:'member',email:'agent@example.test',name:'Agent One',role:'agent',active:true})).status,200);
assert.equal((await post({action:'member',email:'other@example.test',name:'Agent Two',role:'agent',active:true})).status,200);
assert.equal((await post({action:'did',did:'D1',label:'Medicare D1',campaign:'Medicare'})).status,200);
as('agent@example.test');
assert.equal((await post({action:'member',email:'bad@example.test',name:'Bad',role:'admin'})).status,403);
assert.equal((await post({action:'review',id:'fake',status:'cpa'})).status,403);
assert.equal((await post({action:'submit',phone:'2025550100',customer:'Test Customer',campaign:'Medicare',did:' d1 ',createdAt:'2020-01-01'})).status,200);
assert.equal((await post({action:'submit',phone:'2025550100',customer:'Duplicate',campaign:'Medicare',did:'D1'})).status,409);
let d=await (await api.GET()).json();assert.equal(d.leads.length,1);assert(!d.leads[0].createdAt.startsWith('2020'));const leadId=d.leads[0].id;
as('other@example.test');d=await (await api.GET()).json();assert.equal(d.leads.length,0);assert.equal(d.members.length,0);assert(!JSON.stringify(d.leaderboard).includes('2025550100'));assert(!JSON.stringify(d.leaderboard).includes('agent@example.test'));
as('owner@example.test');assert.equal((await post({action:'review',id:leadId,status:'rejected'})).status,400);assert.equal((await post({action:'review',id:leadId,status:'cpa',note:'Confirmed'})).status,200);
assert.equal((await post({action:'calls',agentEmail:'agent@example.test',campaign:'Medicare',date:'2026-11-01',taken:5,transferred:6})).status,400);
assert.equal((await post({action:'calls',agentEmail:'agent@example.test',campaign:'Medicare',date:'2026-11-01',taken:50,transferred:6})).status,200);
assert.equal((await post({action:'importCalls',rows:[{agentEmail:'agent@example.test',campaign:'Medicare',date:'2026-11-01',taken:60,transferred:8}]})).status,200);
assert.equal((await post({action:'import',rows:[{agentName:'Agent One',campaign:'ACA',phone:'2025550101',customer:'Historical Test',createdAt:'2026-10-31',status:'cpl'}]})).status,200);
let result=await (await post({action:'import',rows:[{agentName:'Agent One',campaign:'ACA',phone:'2025550101',customer:'Historical Test',createdAt:'2026-10-31',status:'cpl'}]})).json();assert.equal(result.skipped,1);
as('agent@example.test');d=await (await api.GET()).json();assert.equal(d.leads.length,2);assert.equal(d.leads.find(l=>l.id===leadId).status,'cpa');assert.equal(d.calls[0].taken,60);

as('owner@example.test');d=await (await api.GET()).json();assert.equal(d.invitations.find(i=>i.email==='agent@example.test').status,'blocked');assert.equal(sent.length,0);assert.equal(d.emailConfigured,false);
mailEnv.RESEND_API_KEY='test-only-key';mailEnv.EMAIL_FROM='Markforth <team@example.test>';
let response=await post({action:'sendWelcome',email:'agent@example.test'});assert.equal(response.status,200);assert.equal(sent.length,1);let payload=JSON.parse(sent[0].body);assert.deepEqual(payload.to,['agent@example.test']);assert(payload.text.includes('There is no separate portal password.'));assert.equal(sent[0].url,'https://api.resend.com/emails');assert(sent[0].headers['Idempotency-Key'].startsWith('markforth-welcome/'));
await post({action:'sendWelcome',email:'agent@example.test'});assert.equal(sent.length,1);
await post({action:'member',email:'agent@example.test',name:'Agent One Renamed',role:'agent',active:true});assert.equal(sent.length,1);
await post({action:'member',email:'new@example.test',name:'New Agent',role:'agent',active:true});assert.equal(sent.length,2);assert.deepEqual(JSON.parse(sent[1].body).to,['new@example.test']);
await post({action:'calls',agentEmail:'agent@example.test',campaign:'Medicare',date:'2026-11-01',did:' d1 ',taken:10,transferred:3});
await post({action:'calls',agentEmail:'agent@example.test',campaign:'Medicare',date:'2026-11-01',did:'D2',taken:20,transferred:4});
as('agent@example.test');d=await (await api.GET()).json();assert.equal(d.calls.length,3);assert.equal(d.calls.find(c=>c.did==='D1').taken,10);assert.equal(d.calls.find(c=>c.did==='D2').taken,20);assert.equal(d.leads.find(l=>l.id===leadId).did,'D1');assert.equal(d.invitations.length,0);assert.equal((await post({action:'sendWelcome',email:'other@example.test'})).status,403);
as('owner@example.test');deliveryMode='unknown';await post({action:'sendWelcome',email:'other@example.test'});d=await (await api.GET()).json();assert.equal(d.invitations.find(i=>i.email==='other@example.test').status,'unknown');const originalBody=sent.at(-1).body,originalKey=sent.at(-1).headers['Idempotency-Key'];deliveryMode='ok';await post({action:'sendWelcome',email:'other@example.test'});assert.equal(sent.at(-1).body,originalBody);assert.equal(sent.at(-1).headers['Idempotency-Key'],originalKey);

as('agent@example.test');assert.equal((await post({action:'submit'},'https://other.test')).status,403);
as('stranger@example.test');assert.equal((await api.GET()).status,403);assert.equal((await post({action:'setup',name:'Stranger'})).status,403);

as('agent@example.test');assert.equal((await post({action:'submit',phone:'2025550122',customer:'Impersonation Test',campaign:'Medicare',did:'D1',agentEmail:'other@example.test'})).status,403);assert.equal((await post({action:'did',did:'D2',campaign:'Medicare'})).status,403);assert.equal((await post({action:'deleteMember',email:'other@example.test'})).status,403);
as('owner@example.test');assert.equal((await post({action:'review',id:leadId,outcome:'sale',approvalType:'cpl',note:'Buyer confirmed'})).status,200);d=await (await api.GET()).json();assert.equal(d.leads.find(l=>l.id===leadId).outcome,'sale');assert.equal(d.leads.find(l=>l.id===leadId).status,'cpl');
assert.equal((await post({action:'review',id:leadId,outcome:'not_sale',note:'Buyer rejected'})).status,200);assert.equal((await post({action:'review',id:leadId,outcome:'pending'})).status,200);
assert.equal((await post({action:'deleteMember',email:'owner@example.test'})).status,400);assert.equal((await post({action:'deleteMember',email:'agent@example.test'})).status,200);as('agent@example.test');assert.equal((await api.GET()).status,403);as('owner@example.test');assert.equal((await post({action:'restoreMember',email:'agent@example.test'})).status,200);as('agent@example.test');d=await (await api.GET()).json();assert.equal(d.leads.length,2);
as('owner@example.test');await post({action:'did',did:'D1',label:'Disabled D1',campaign:'Medicare',active:false});as('agent@example.test');assert.equal((await post({action:'submit',phone:'2025550123',customer:'Disabled DID',campaign:'Medicare',did:'D1'})).status,400);as('owner@example.test');await post({action:'did',did:'D1',label:'Medicare D1',campaign:'Medicare',active:true});assert.equal((await post({action:'submit',phone:'2025550124',customer:'Admin on behalf',campaign:'Medicare',did:'D1',agentEmail:'other@example.test'})).status,200);as('other@example.test');d=await (await api.GET()).json();assert(d.leads.some(l=>l.phone==='2025550124'));
const metricSource=ts.transpileModule(fs.readFileSync('lib/performance.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const metric={};new Function('exports',metricSource)(metric);
const sampleLeads=Array.from({length:6},(_,i)=>({createdAt:i<3?'2026-11-01T18:00:00Z':'2026-11-02T18:00:00Z',outcome:i<2?'sale':'pending'}));const sampleCalls=[{date:'2026-11-01',taken:100,transferred:20},{date:'2026-11-02',taken:50,transferred:10},{date:'2026-11-03',taken:25,transferred:0}];const score=metric.performance(sampleLeads,sampleCalls);assert.equal(score.lpd,2);assert.equal(score.days,3);assert.equal(score.callToTransfer,30/175*100);assert.equal(score.transferToSale,2/30*100);assert.equal(metric.outcomeOf({status:'cpl',outcome:null}),'pending');assert.equal(metric.performance([],[]).lpd,null);assert.equal(metric.performance([],[]).callToTransfer,null);assert.equal(metric.performance([],[]).transferToSale,null);


as('agent@example.test');assert.equal((await post({action:'bonus',title:'Unauthorized'})).status,403);assert.equal((await post({action:'agentPhoto',email:'owner@example.test',image:'fake'})).status,403);
as('owner@example.test');assert.equal((await post({action:'agentPhoto',email:'agent@example.test',image:'data:image/svg+xml;base64,PHN2Zz4='})).status,400);
assert.equal((await post({action:'agentPhoto',email:'agent@example.test',image:'data:image/jpeg;base64,/9j/AA=='})).status,200);
const compileRoute=p=>ts.transpileModule(fs.readFileSync(p,'utf8').replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const photoApi={};new Function('exports','portalIdentity','getDb','members','agentPhotos','eq',compileRoute('app/api/agent-photo/route.ts'))(photoApi,async()=>user,()=>db,exports.members,exports.agentPhotos,eq);
const powerApi={};new Function('exports','portalIdentity','getDb','members','eq','powerSnapshot','notificationReads','bonusChallenges','bonusAwards',compileRoute('app/api/power/route.ts'))(powerApi,async()=>user,()=>db,exports.members,eq,power.powerSnapshot,exports.notificationReads,exports.bonusChallenges,exports.bonusAwards);
const photoKey=(await db.select().from(exports.agentPhotos))[0].agentKey;const photoRequest=new Request('https://portal.test/api/agent-photo?key='+photoKey);
user=null;assert.equal((await photoApi.GET(photoRequest)).status,401);assert.equal((await powerApi.GET()).status,401);as('agent@example.test');assert.equal((await photoApi.GET(photoRequest)).headers.get('Content-Type'),'image/jpeg');assert.equal((await powerApi.GET()).status,200);as('owner@example.test');
let photoView=await(await api.GET()).json();assert.equal(photoView.leaderboard.photos.length,1);assert(!JSON.stringify(photoView.leaderboard.photos).includes('/9j/'));
assert.equal((await post({action:'agentPhoto',email:'agent@example.test',remove:true})).status,200);
const start=new Date(Date.now()-3600000).toISOString(),end=new Date(Date.now()+3600000).toISOString();
assert.equal((await post({action:'bonus',title:'Tonight',startsAt:start,endsAt:start,target:1,amount:3000,campaign:'Medicare'})).status,400);
assert.equal((await post({action:'bonus',title:'Tonight',startsAt:start,endsAt:end,target:1,amount:3000,campaign:'Medicare'})).status,200);
await post({action:'review',id:leadId,outcome:'sale',approvalType:'cpa'});let bonus=await power.powerSnapshot(db);assert.equal(bonus.awards.length,1);assert.equal(bonus.awards[0].amount,3000);assert(!JSON.stringify(bonus).includes('agent@example.test'));
await post({action:'review',id:leadId,outcome:'sale',approvalType:'cpa'});assert.equal((await power.powerSnapshot(db)).awards.length,1);
await post({action:'review',id:leadId,outcome:'not_sale',note:'Correction'});assert.equal((await power.powerSnapshot(db)).awards.length,0);
await post({action:'review',id:leadId,outcome:'sale',approvalType:'cpa'});assert.equal((await power.powerSnapshot(db)).awards.length,1);
assert.equal((await post({action:'cancelBonus',id:bonus.challenges[0].id})).status,200);

as('agent@example.test');assert.equal((await post({action:'editLead',id:leadId})).status,403);assert.equal((await post({action:'deleteLead',id:leadId})).status,403);
const noticeId='c:'+bonus.challenges[0].id;
const ack=()=>powerApi.POST(new Request('https://portal.test/api/power',{method:'POST',headers:{origin:'https://portal.test','Content-Type':'application/json'},body:JSON.stringify({notificationId:noticeId})}));
assert.equal((await ack()).status,200);assert.equal((await ack()).status,200);assert((await power.powerSnapshot(db,'agent@example.test')).seen.includes(noticeId));assert(!(await power.powerSnapshot(db,'other@example.test')).seen.includes(noticeId));
as('owner@example.test');const beforeEdit=(await(await api.GET()).json()).leads.find(l=>l.id===leadId);
assert.equal((await post({...beforeEdit,action:'editLead',customer:'Corrected Customer',phone:'2025550199',did:'D1'})).status,200);let corrected=(await(await api.GET()).json()).leads.find(l=>l.id===leadId);assert.equal(corrected.phone,'2025550199');assert.equal(corrected.outcome,'pending');assert.equal(corrected.createdAt,beforeEdit.createdAt);
assert.equal((await post({action:'deleteLead',id:leadId})).status,200);let trash=(await(await api.GET()).json());assert(!trash.leads.some(l=>l.id===leadId));assert(trash.deletedLeads.some(l=>l.id===leadId));assert.equal((await post({action:'review',id:leadId,status:'cpa'})).status,400);
as('agent@example.test');assert.equal((await(await api.GET()).json()).deletedLeads.length,0);as('owner@example.test');assert.equal((await post({action:'restoreLead',id:leadId})).status,200);assert((await(await api.GET()).json()).leads.some(l=>l.id===leadId));
as('agent@example.test');assert.equal((await post({action:'permanentDeleteMember',email:'other@example.test',confirmEmail:'other@example.test'})).status,403);
as('owner@example.test');assert.equal((await post({action:'permanentDeleteMember',email:'owner@example.test',confirmEmail:'owner@example.test'})).status,400);assert.equal((await post({action:'permanentDeleteMember',email:'other@example.test',confirmEmail:'other@example.test'})).status,400);
await post({action:'member',email:'erase@example.test',name:'Disposable local fixture',role:'agent',active:true});await post({action:'submit',phone:'2025550188',customer:'Retained history',campaign:'Medicare',did:'D1',agentEmail:'erase@example.test'});await post({action:'deleteMember',email:'erase@example.test'});assert.equal((await post({action:'permanentDeleteMember',email:'erase@example.test',confirmEmail:'wrong@example.test'})).status,400);assert.equal((await post({action:'permanentDeleteMember',email:'erase@example.test',confirmEmail:'erase@example.test'})).status,200);const erased=await(await api.GET()).json();assert(!erased.members.some(m=>m.email==='erase@example.test'));assert(!erased.invitations.some(m=>m.email==='erase@example.test'));assert(erased.leads.some(l=>l.agentEmail==='erase@example.test'));
// Bulk review validates the whole selection before writing, and stays admin-only.
as('owner@example.test');
for(const [phone,customer] of [['2025550171','Bulk One'],['2025550172','Bulk Two']])assert.equal((await post({action:'submit',phone,customer,campaign:'Medicare',did:'D1',agentEmail:'agent@example.test'})).status,200);
let bulkRows=(await(await api.GET()).json()).leads.filter(l=>l.customer.startsWith('Bulk '));const bulkIds=bulkRows.map(l=>l.id);assert.equal(bulkIds.length,2);
as('agent@example.test');assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'sale',approvalType:'cpa'})).status,403);
as('owner@example.test');assert.equal((await post({action:'bulkReview',ids:[],outcome:'sale',approvalType:'cpa'})).status,400);assert.equal((await post({action:'bulkReview',ids:Array(101).fill(bulkIds[0]),outcome:'pending'})).status,400);assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'sale',approvalType:'oops'})).status,400);assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'not_sale',note:''})).status,400);
assert.equal((await post({action:'bulkReview',ids:[bulkIds[0],'missing'],outcome:'sale',approvalType:'cpa'})).status,400);assert.equal((await(await api.GET()).json()).leads.find(l=>l.id===bulkIds[0]).outcome,'pending');
await post({action:'deleteLead',id:bulkIds[1]});assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'sale',approvalType:'cpa'})).status,400);assert.equal((await(await api.GET()).json()).leads.find(l=>l.id===bulkIds[0]).outcome,'pending');await post({action:'restoreLead',id:bulkIds[1]});
const nowBulk=Date.now();await post({action:'bonus',title:'Bulk award fixture',startsAt:new Date(nowBulk-60000).toISOString(),endsAt:new Date(nowBulk+60000).toISOString(),target:2,amount:3000,campaign:'Medicare'});
let bulkResult=await post({action:'bulkReview',ids:[...bulkIds,bulkIds[0]],outcome:'sale',approvalType:'cpl',note:'Confirmed together'});assert.equal(bulkResult.status,200);assert.equal((await bulkResult.json()).updated,2);let bulkData=await(await api.GET()).json();for(const id of bulkIds){const l=bulkData.leads.find(l=>l.id===id);assert.equal(l.outcome,'sale');assert.equal(l.status,'cpl');assert.equal(l.note,'Confirmed together');assert.equal(l.reviewedBy,'owner@example.test');assert(l.reviewedAt);}const challenge=bulkData.power.challenges.find(c=>c.title==='Bulk award fixture');assert(bulkData.power.awards.some(a=>a.challengeId===challenge.id));
assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'not_sale',note:'Buyer rejected these leads'})).status,200);bulkData=await(await api.GET()).json();assert(!bulkData.power.awards.some(a=>a.challengeId===challenge.id));for(const id of bulkIds){const l=bulkData.leads.find(l=>l.id===id);assert.equal(l.status,'rejected');assert.equal(l.outcome,'not_sale');}assert.equal((await post({action:'bulkReview',ids:bulkIds,outcome:'pending'})).status,200);assert((await(await api.GET()).json()).leads.filter(l=>bulkIds.includes(l.id)).every(l=>l.outcome==='pending'&&l.status==='pending'));assert((await db.select().from(exports.audit)).some(a=>a.action.startsWith('bulk review')&&a.target.includes(bulkIds[0])));
as('owner@example.test');await post({action:'member',email:'agent@example.test',name:'Agent One',role:'agent',active:false});as('agent@example.test');assert.equal((await api.GET()).status,403);

as('owner@example.test');user={...user,source:'supabase',accessToken:'MUST-NOT-LEAK'};let responseSafe=await(await api.GET()).json();assert(!JSON.stringify(responseSafe).includes('MUST-NOT-LEAK'));await db.update(exports.members).set({mustChangePassword:1}).where(eq(exports.members.email,'owner@example.test'));const forced=await(await api.GET()).json();assert.equal(forced.passwordChangeRequired,true);assert.equal(forced.leads,undefined);assert.equal((await post({action:'did',did:'FORBIDDEN',campaign:'Medicare'})).status,403);await db.update(exports.members).set({mustChangePassword:0}).where(eq(exports.members.email,'owner@example.test'));
// ---------- Self-service profile ----------
user=null;as('owner@example.test');
assert.equal((await post({action:'member',email:'profile@example.test',name:'Profile Agent',role:'agent',active:true})).status,200);
as('profile@example.test');
const tinyJpeg='data:image/jpeg;base64,/9j/'+'A'.repeat(400);
let pr=await post({action:'profile',name:'  Renamed Agent  ',dob:'1990-04-12',image:tinyJpeg});assert.equal(pr.status,200);
let me=await db.select().from(exports.members).where(eq(exports.members.email,'profile@example.test')).get();assert.equal(me.name,'Renamed Agent');assert.equal(me.dob,'1990-04-12');assert.equal(me.role,'agent','profile edits never change the role');
assert.equal((await db.select().from(exports.agentPhotos)).filter(x=>x.data===tinyJpeg).length,1);
assert.equal((await post({action:'profile',name:'Renamed Agent',dob:''})).status,200);me=await db.select().from(exports.members).where(eq(exports.members.email,'profile@example.test')).get();assert.equal(me.dob,null,'date of birth is optional');
for(const bad of [{name:''},{name:'X',dob:'2999-01-01'},{name:'X',dob:'1990-02-30'},{name:'X',dob:'yesterday'},{name:'X',image:'data:image/png;base64,AAAA'},{name:'X',image:'data:image/jpeg;base64,/9j/'+'A'.repeat(200000)}])assert.equal((await post({action:'profile',...bad})).status,400,JSON.stringify(bad).slice(0,60));
assert.equal((await post({action:'profile',name:'Renamed Agent',removePhoto:true})).status,200);assert.equal((await db.select().from(exports.agentPhotos)).filter(x=>x.data===tinyJpeg).length,0);
// a profile edit only ever touches the signed-in user, even if another email is sent
assert.equal((await post({action:'profile',name:'Hijack',email:'owner@example.test'})).status,200);
assert.notEqual((await db.select().from(exports.members).where(eq(exports.members.email,'owner@example.test')).get()).name,'Hijack');
assert.equal((await post({action:'profile',name:'Renamed Agent'},'https://evil.test')).status,403);
user=null;assert.notEqual((await post({action:'profile',name:'Nobody'})).status,200,'signed-out users cannot edit a profile');
console.log('PASS: sign-in, self-service profile (own record only, name/DOB/photo rules), setup lock, role checks, agent record isolation, lead submission, duplicates, single and bulk reviews, atomic selection validation, bulk bonus eligibility, call totals, bulk call import, historical import, leaderboard privacy, origin checks, DID isolation and normalization, automatic welcome emails, provider failure handling, retry deduplication, sale outcomes, user archive/restore, DID dropdown enforcement, submission ownership, conversion rates, LPD and deactivation.');

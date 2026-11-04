import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/sqlite-proxy';
import {eq,sql} from 'drizzle-orm';
import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const execute=(query,params,method)=>{const stmt=sqlite.prepare(query);if(method==='run'){stmt.run(...params);return {rows:[]};}stmt.setReturnArrays(true);const rows=stmt.all(...params);return {rows:method==='get'?rows[0]:rows};};const db=drizzle(async(...args)=>execute(...args),async qs=>qs.map(q=>execute(q.sql,q.params,q.method)));
function compile(file){return ts.transpileModule(fs.readFileSync(file,'utf8').replace(/^import .*;$/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;}
const schema={};new Function('exports','sqliteTable','text','integer',compile('db/schema.ts'))(schema,sqliteTable,text,integer);
const env={SUPABASE_URL:'https://provider.example.test',SUPABASE_PUBLISHABLE_KEY:'public-key',PORTAL_SESSION_KEY:'random-test-only-encryption-key-with-high-entropy',PORTAL_OWNER_EMAIL:'owner@example.test'};
const cookieValues=new Map();const jar={get:name=>cookieValues.has(name)?{value:cookieValues.get(name)}:undefined,set:(name,value,options)=>{assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.sameSite,'lax');if(options.maxAge===0)cookieValues.delete(name);else cookieValues.set(name,value);}};
let platform=null,fetchCount=0;const user={id:'auth-1',email:'agent@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',user_metadata:{full_name:'Agent'},app_metadata:{markforth_portal:true}};const tokens={access_token:'private-access-token',refresh_token:'private-refresh-token',expires_in:3600,user};
let forcedResponse=null;const fakeFetch=async(url,options={})=>{fetchCount++;if(forcedResponse)return forcedResponse;if(url.includes('/token')){const b=JSON.parse(options.body);if(b.password==='wrong')return Response.json({error:'invalid_credentials'},{status:400});return Response.json({...tokens,access_token:b.refresh_token?'refreshed-access-token':tokens.access_token});}if(url.includes('/functions/'))return Response.json({configured:true,host:'mail.markforthsol.com'});if(url.endsWith('/user'))return Response.json(user);return Response.json({ok:true});};
const sessionConfig={};new Function('exports',compile('lib/session-config.ts'))(sessionConfig);
const auth={};new Function('exports','env','cookies','eq','sql','getDb','authSessions','authAttempts','members','getChatGPTUser','fetch','IDLE_TIMEOUT_MS',compile('lib/portal-auth.ts'))(auth,env,async()=>jar,eq,sql,()=>db,schema.authSessions,schema.authAttempts,schema.members,async()=>platform,fakeFetch,sessionConfig.IDLE_TIMEOUT_MS);

// ---------- Idle timeout and heartbeat ----------
const {IDLE_TIMEOUT_MS,IDLE_WARNING_MS,HEARTBEAT_INTERVAL_MS}=sessionConfig;
assert.equal(IDLE_TIMEOUT_MS,10*60*1000,"the idle limit is 10 minutes");
assert.ok(IDLE_WARNING_MS<IDLE_TIMEOUT_MS&&HEARTBEAT_INTERVAL_MS<IDLE_TIMEOUT_MS-IDLE_WARNING_MS,"warning and heartbeat fit inside the limit");
const sessions=()=>db.select().from(schema.authSessions);
const row=async()=>(await sessions())[0];
const setActivity=at=>db.update(schema.authSessions).set({lastActivityAt:at});
async function fresh(){await db.delete(schema.authSessions);cookieValues.clear();await auth.createSession(tokens);}

// Signing in records activity.
await fresh();assert.ok(Math.abs((await row()).lastActivityAt-Date.now())<5000);assert.equal((await auth.session()).email,user.email);

// Ordinary authenticated requests (including background polling) never move lastActivityAt.
await setActivity(Date.now()-5*60000);const before=(await row()).lastActivityAt;
for(let i=0;i<3;i++)assert.ok(await auth.session());assert.equal((await row()).lastActivityAt,before);

// Just inside the limit the session is still valid.
await setActivity(Date.now()-IDLE_TIMEOUT_MS+5000);assert.ok(await auth.session());

// Past the limit the session is ended: row deleted, cookie cleared, identity gone.
await setActivity(Date.now()-IDLE_TIMEOUT_MS-1000);assert.equal(await auth.session(),null);
assert.equal((await sessions()).length,0);assert.equal(cookieValues.size,0);assert.equal(await auth.portalIdentity(),null);

// Sessions created before this feature (no timestamp) are treated as expired.
await fresh();await setActivity(null);assert.equal(await auth.session(),null);assert.equal((await sessions()).length,0);

// touchSession (used by the heartbeat) moves activity forward, but cannot revive an expired session.
await fresh();await setActivity(Date.now()-8*60000);assert.equal(await auth.touchSession(),true);assert.ok(Date.now()-(await row()).lastActivityAt<5000);
await setActivity(Date.now()-IDLE_TIMEOUT_MS-1000);assert.equal(await auth.touchSession(),false);assert.equal((await sessions()).length,0);

// The /api/auth heartbeat action, through the real route.
const route={};new Function("exports","getChatGPTUser","env","getDb","members","audit","eq","authConfigured","supabase","createSession","session","logout","revokeSessions","throttle","PORTAL","touchSession","portalIdentity",compile("app/api/auth/route.ts"))(route,async()=>platform,env,()=>db,schema.members,schema.audit,eq,auth.authConfigured,auth.supabase,auth.createSession,auth.session,auth.logout,auth.revokeSessions,auth.throttle,"https://agents.markforthsol.com",auth.touchSession,auth.portalIdentity);
const post=(body,origin="https://portal.test")=>route.POST(new Request("https://portal.test/api/auth",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)}));
await db.delete(schema.authSessions);cookieValues.clear();
await db.insert(schema.members).values({email:user.email,name:"Agent",role:"agent",active:1});
assert.equal((await post({action:"login",email:user.email,password:"correct-password"})).status,200);
assert.ok(Math.abs((await row()).lastActivityAt-Date.now())<5000,"login through the route stamps activity");
await setActivity(Date.now()-7*60000);
assert.equal((await post({action:"heartbeat"})).status,200);assert.ok(Date.now()-(await row()).lastActivityAt<5000,"heartbeat refreshes activity");
assert.equal((await post({action:"heartbeat"},"https://evil.test")).status,403,"heartbeat keeps the origin check");
await setActivity(Date.now()-IDLE_TIMEOUT_MS-1000);
const expired=await post({action:"heartbeat"});assert.equal(expired.status,401);assert.match((await expired.json()).error,/sign in/i);
assert.equal((await sessions()).length,0);assert.equal(cookieValues.size,0);
assert.equal((await post({action:"heartbeat"})).status,401,"no session, no heartbeat");

// Workspace-owner (ChatGPT) fallback: no portal session row, so idle time is tracked in the browser.
platform={email:env.PORTAL_OWNER_EMAIL,userId:"owner-1",displayName:"Owner",fullName:null};
const owner=await post({action:"heartbeat"});assert.equal(owner.status,200);assert.equal((await owner.json()).idleTrackedInBrowser,true);
platform={email:"stranger@example.test",userId:"stranger"};assert.equal((await post({action:"heartbeat"})).status,401);platform=null;

console.log("PASS: 10-minute idle limit, login stamps activity, polling does not extend sessions, expired and legacy sessions are deleted with cookie cleared, heartbeat refresh, origin check, expiry response and owner fallback.");

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

// ---------- Demo mode ----------
const cookieValues=new Map();const jar={get:n=>cookieValues.has(n)?{value:cookieValues.get(n)}:undefined,set:(n,v,o)=>{assert.equal(o.httpOnly,true);assert.equal(o.secure,true);if(o.maxAge===0)cookieValues.delete(n);else cookieValues.set(n,v);}};
const env={};
const demo={};new Function("exports","env","cookies",compile("lib/demo.ts"))(demo,env,async()=>jar);
const route={};new Function("exports","cookies","eq","getDb","settings","members","dids","leads","calls","bonusChallenges","demoEnabled","DEMO_COOKIE","DEMO_USERS",compile("app/api/demo/route.ts"))(route,async()=>jar,eq,()=>db,schema.settings,schema.members,schema.dids,schema.leads,schema.calls,schema.bonusChallenges,demo.demoEnabled,demo.DEMO_COOKIE,demo.DEMO_USERS);
const post=(body,origin="https://demo.test")=>route.POST(new Request("https://demo.test/api/demo",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)}));

// OFF unless DEMO_MODE is exactly "1": no sign-in, no seeding, a demo cookie is ignored.
for(const value of [undefined,"","0","true","yes"]){env.DEMO_MODE=value;
  assert.equal((await (await route.GET()).json()).enabled,false);
  assert.equal((await post({role:"admin"})).status,404);
  cookieValues.set(demo.DEMO_COOKIE,"admin");assert.equal(await demo.demoIdentity(),null);cookieValues.clear();}
assert.equal((await db.select().from(schema.members)).length,0,"nothing seeded while demo mode is off");

// ON: origin check, role check, seeding once, identity from the cookie.
env.DEMO_MODE="1";
assert.equal((await (await route.GET()).json()).enabled,true);
assert.equal((await post({role:"admin"},"https://evil.test")).status,403);
assert.equal((await post({role:"owner"})).status,400);
assert.equal((await post({role:"agent"})).status,200);
const seeded=(await db.select().from(schema.members)).length;assert.ok(seeded>=3);assert.ok((await db.select().from(schema.leads)).length>=10);
assert.equal((await demo.demoIdentity()).email,demo.DEMO_USERS.agent.email);assert.equal((await demo.demoIdentity()).source,"demo");
assert.equal((await post({role:"admin"})).status,200);assert.equal((await db.select().from(schema.members)).length,seeded,"seeding runs only once");
assert.equal((await demo.demoIdentity()).email,demo.DEMO_USERS.admin.email);
cookieValues.set(demo.DEMO_COOKIE,"superuser");assert.equal(await demo.demoIdentity(),null,"unknown roles are ignored");
cookieValues.set(demo.DEMO_COOKIE,"agent");await demo.clearDemoCookie();assert.equal(cookieValues.size,0,"logout clears the demo cookie");
console.log("PASS: demo mode is off unless DEMO_MODE=1, origin and role checks, one-time sample data, cookie identity and logout.");

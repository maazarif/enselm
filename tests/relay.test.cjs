const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/core.js');globalThis.PFCore=C;
let handleRelay,createSqliteDB,A,B,X;
test.before(async()=>{({handleRelay}=await import('../backend/relay.mjs'));({createSqliteDB}=await import('../backend/sqlite-adapter.mjs'));[A,B,X]=await Promise.all(['Alice','Bob','Other'].map(C.createIdentity));});
async function signed(identity,action,payload={},overrides={}){
 const body={invitation:C.invitation(identity),audience:'https://enselm.test',timestamp:Date.now(),nonce:crypto.randomUUID(),action,payload,...overrides};
 const key=await crypto.subtle.importKey('jwk',identity.private.sign,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 body.signature=C.b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(JSON.stringify({v:1,domain:'enselm-relay-v1',audience:body.audience,timestamp:body.timestamp,nonce:body.nonce,action:body.action,payload:body.payload}))));return body;
}
async function submit(db,body,headers={}){const response=await handleRelay(new Request('https://enselm.test/api/relay',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}),{DB:db});return {status:response.status,body:await response.json(),headers:response.headers};}
const call=async(db,who,action,payload={})=>submit(db,await signed(who,action,payload));
async function setup(t){const db=createSqliteDB();t.after(()=>db.close());await call(db,A,'enable');await call(db,B,'enable');return db;}
async function message(from=A,to=B,body='private words'){const payload={body,photo:null},recipient={...C.invitation(to),verified:true,blocked:false};return C.seal(from,recipient,payload,{recipientId:to.id,purpose:'test',scope:true,recipient:true,copies:true,snapshot:JSON.stringify(payload),readyAt:0});}

test('relay requires possession of signing key and rejects tampered action, stale timestamp, replay and origin',async t=>{
 const db=await setup(t),body=await signed(A,'status');
 assert.equal((await submit(db,{...body,action:'disable'})).status,401);
 assert.equal((await submit(db,body,{'origin':'https://evil.test'})).status,403);
 assert.equal((await submit(db,await signed(A,'status',{}, {timestamp:Date.now()-301000}))).status,401);
 const first=await submit(db,body);assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'no-store');assert.equal(first.headers.get('access-control-allow-origin'),null);
 assert.equal((await submit(db,body)).status,409);
});
test('real signed encrypted relay requires recipient permission and remains unopened until explicit local acceptance',async t=>{
 const db=await setup(t),envelope=await message();
 assert.equal((await call(db,A,'send',{envelope})).status,403);
 assert.equal((await call(db,B,'allow',{sender:A.id})).status,200);
 const sent=await call(db,A,'send',{envelope});assert.equal(sent.status,200);assert.equal(sent.body.queued,true);
 const inbox=await call(db,B,'inbox');assert.equal(inbox.body.messages.length,1);
 const stored=await db.prepare('SELECT envelope FROM relay_messages').first();assert.ok(!stored.envelope.includes('private words'));assert.ok(!stored.envelope.includes(A.private.sign.d));
 await assert.rejects(C.openEnvelope(inbox.body.messages[0],B,{...C.invitation(A),verified:true,blocked:false},false),/consent/);
 const opened=await C.openEnvelope(inbox.body.messages[0],B,{...C.invitation(A),verified:true,blocked:false},true);assert.equal(opened.body,'private words');
});
test('another identity cannot read or acknowledge a recipient queue',async t=>{
 const db=await setup(t);await call(db,X,'enable');await call(db,B,'allow',{sender:A.id});const envelope=await message();await call(db,A,'send',{envelope});
 assert.deepEqual((await call(db,X,'inbox')).body.messages,[]);await call(db,X,'ack',{ids:[envelope.id]});assert.equal((await call(db,B,'inbox')).body.messages.length,1);
});
test('idempotent retries retain one record and do not reveal acknowledgment or restore ciphertext',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});const envelope=await message();const first=await call(db,A,'send',{envelope});
 assert.deepEqual((await call(db,A,'send',{envelope})).body,first.body);await call(db,B,'ack',{ids:[envelope.id]});
 assert.deepEqual((await call(db,A,'send',{envelope})).body,first.body);assert.equal((await call(db,B,'inbox')).body.messages.length,0);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM relay_messages').first()).n,1);
});
test('revoke and disable remove queued ciphertext and prevent further delivery',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});await call(db,A,'send',{envelope:await message()});
 await call(db,B,'revoke',{sender:A.id});assert.equal((await call(db,B,'inbox')).body.messages.length,0);assert.equal((await call(db,A,'send',{envelope:await message()})).status,403);
 await call(db,B,'allow',{sender:A.id});await call(db,A,'send',{envelope:await message()});await call(db,B,'disable');
 assert.equal((await call(db,B,'inbox')).status,403);assert.equal((await call(db,B,'status')).body.enabled,false);assert.equal((await db.prepare('SELECT count(*) AS n FROM relay_messages WHERE envelope IS NOT NULL').first()).n,0);
 assert.equal((await call(db,A,'send',{envelope:await message()})).status,403);
});
test('expired ciphertext is excluded and cleaned, malformed or impersonated envelopes fail',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});const envelope=await message();await call(db,A,'send',{envelope});
 await db.prepare('UPDATE relay_messages SET expires=?').bind(Date.now()-1).run();assert.equal((await call(db,B,'inbox')).body.messages.length,0);assert.equal((await db.prepare('SELECT count(*) AS n FROM relay_messages').first()).n,0);
 const mutated={...envelope,cipher:envelope.cipher.slice(0,-4)+'AAAA'};assert.equal((await call(db,A,'send',{envelope:mutated})).status,400);
 assert.equal((await call(db,X,'send',{envelope})).status,403);await call(db,X,'enable');assert.equal((await call(db,X,'send',{envelope})).status,400);
});
test('queue quota is enforced atomically and acknowledged records free queue capacity',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});
 for(let i=0;i<30;i++)assert.equal((await call(db,A,'send',{envelope:await message(A,B,'message '+i)})).status,200);
 assert.equal((await call(db,A,'send',{envelope:await message()})).status,403);
 const inbox=await call(db,B,'inbox');assert.equal(inbox.body.messages.length,30);await call(db,B,'ack',{ids:[inbox.body.messages[0].id]});assert.equal((await call(db,A,'send',{envelope:await message()})).status,200);
});
test('API rate limit and daily send budget do not depend on client enforcement',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});const now=Date.now();
 for(let i=0;i<100;i++)await db.prepare('INSERT INTO relay_messages VALUES(?,?,?,?,?,?,?)').bind(A.id,'past-'+i,B.id,'digest',null,now-120000,now+86400000).run();
 assert.equal((await call(db,A,'send',{envelope:await message()})).status,403);
 for(let i=0;i<120;i++)await db.prepare('INSERT INTO relay_nonces VALUES(?,?,?)').bind(B.id,crypto.randomUUID(),now).run();
 assert.equal((await call(db,B,'status')).status,429);
});
test('unexpected private fields, unsupported content type, and oversized input are rejected',async t=>{
 const db=await setup(t),body=await signed(A,'status');body.invitation.private=A.private;assert.equal((await submit(db,body)).status,400);
 assert.equal((await submit(db,await signed(A,'status'),{'content-type':'text/plain'})).status,415);
 const response=await handleRelay(new Request('https://enselm.test/api/relay',{method:'POST',headers:{'content-type':'application/json'},body:' '.repeat(6*1024*1024+1)}),{DB:db});assert.equal(response.status,413);
 const get=await handleRelay(new Request('https://enselm.test/api/relay'),{DB:db});assert.equal(get.status,405);
});


test('signed requests are bound to the intended relay origin',async t=>{
 const db=await setup(t);
 assert.equal((await submit(db,await signed(A,'status',{}, {audience:'https://other.test'}))).status,401);
});
test('aggregate queue bytes and per-envelope size are enforced',async t=>{
 const db=await setup(t);await call(db,B,'allow',{sender:A.id});
 const now=Date.now();await db.prepare('INSERT INTO relay_messages VALUES(?,?,?,?,?,?,?)').bind(A.id,'full',B.id,'hash','x'.repeat(8*1024*1024),now,now+86400000).run();
 assert.equal((await call(db,A,'send',{envelope:await message()})).status,403);
 const envelope=await message();envelope.cipher='A'.repeat(512*1024);
 assert.equal((await call(db,A,'send',{envelope})).status,413);
});

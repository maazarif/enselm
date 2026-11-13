const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/core.js'),client=require('../dist/relay.js');
let identity;
test.before(async()=>{identity=await C.createIdentity('Synthetic client');});
const origin='https://relay.example';
test('relay client signs the exact origin-bound action and sends public identity only',async()=>{
 let captured;
 const result=await client.request(identity,'allow',{sender:'f'.repeat(64)},{audience:origin,fetch:async(url,options)=>{assert.equal(url,'/api/relay');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');captured=JSON.parse(options.body);return Response.json({allowed:true});}});
 assert.equal(result.allowed,true);assert.equal(captured.audience,origin);assert.equal(captured.invitation.public.sign.d,undefined);assert.equal(captured.invitation.public.box.d,undefined);assert.equal(captured.invitation.private,undefined);
 const {audience,timestamp,nonce,action,payload}=captured;
 const signed={v:1,domain:'enselm-relay-v1',audience,timestamp,nonce,action,payload};
 const key=await crypto.subtle.importKey('jwk',identity.public.sign,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,C.un64(captured.signature),new TextEncoder().encode(JSON.stringify(signed))),true);
 signed.audience='https://other.example';
 assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,C.un64(captured.signature),new TextEncoder().encode(JSON.stringify(signed))),false);
});
test('relay client snapshots payload before async signing',async()=>{
 const payload={sender:'f'.repeat(64)};let captured;
 const work=client.request(identity,'allow',payload,{audience:origin,fetch:async(_url,options)=>{captured=JSON.parse(options.body);return Response.json({allowed:true});}});
 payload.sender='a'.repeat(64);await work;assert.equal(captured.payload.sender,'f'.repeat(64));
});
test('cancelled preflight never dispatches a network request',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(client.request(identity,'status',{}, {audience:origin,signal:controller.signal,fetch:async()=>{calls++;}}),e=>e.cancelled===true);
 assert.equal(calls,0);
});
test('stale session after signing is rejected before dispatch',async()=>{
 let checks=0,calls=0;
 await assert.rejects(client.request(identity,'enable',{}, {audience:origin,check:()=>{if(++checks===3){const e=Error('Session changed');e.cancelled=true;throw e;}},fetch:async()=>{calls++;}}),e=>e.cancelled===true);
 assert.equal(calls,0);
});
test('lost response explicitly reports an ambiguous server result',async()=>{
 await assert.rejects(client.request(identity,'disable',{}, {audience:origin,fetch:async()=>{throw Error('offline');}}),/may already have completed/);
});
test('cancel after dispatch does not return a stale successful result',async()=>{
 const controller=new AbortController();
 await assert.rejects(client.request(identity,'enable',{}, {audience:origin,signal:controller.signal,fetch:async()=>{controller.abort();return Response.json({enabled:true});}}),e=>e.cancelled===true);
});

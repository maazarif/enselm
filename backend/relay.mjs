// Enselm relay: authenticated opaque envelopes only. No plaintext or private-key storage.
const MAX_REQUEST=6*1024*1024, MAX_ENVELOPE=512*1024, MINUTE=60000, DAY=86400000, TTL=7*DAY;
const encoder=new TextEncoder();
class RelayError extends Error { constructor(status,message){super(message);this.status=status;} }
const requireThat=(condition,status,message)=>{if(!condition)throw new RelayError(status,message);};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function exact(value,keys){requireThat(object(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k)),400,'Invalid request fields.');}
function invitationShape(inv){
  exact(inv,['type','v','name','id','public']);exact(inv.public,['box','sign']);
  exact(inv.public.box,['kty','n','e']);exact(inv.public.sign,['kty','crv','x','y']);
}
const fingerprint=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const messageId=value=>typeof value==='string'&&value.length>0&&value.length<=80;
async function readBody(request){
  const length=request.headers.get('content-length');
  if(length!==null)requireThat(/^\d+$/.test(length)&&Number(length)<=MAX_REQUEST,413,'Request is too large.');
  requireThat((request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()==='application/json',415,'Use application/json.');
  const reader=request.body?.getReader();requireThat(reader,400,'Request body required.');
  const chunks=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_REQUEST){await reader.cancel();throw new RelayError(413,'Request is too large.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new RelayError(400,'Invalid JSON request.');}
}
function statement(db,sql,...args){return db.prepare(sql).bind(...args);}
const changed=result=>(result.meta?.changes??0)>0;
async function authenticate(request,db,now){
  const body=await readBody(request);
  exact(body,['invitation','audience','timestamp','nonce','action','payload','signature']);
  requireThat(body.audience===new URL(request.url).origin,401,'Request belongs to another relay.');
  invitationShape(body.invitation);
  requireThat(Number.isSafeInteger(body.timestamp)&&Math.abs(now-body.timestamp)<=5*MINUTE,401,'Request expired. Try again.');
  requireThat(typeof body.nonce==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.nonce),400,'Invalid nonce.');
  requireThat(['enable','status','allow','revoke','send','inbox','ack','disable'].includes(body.action)&&object(body.payload),400,'Unsupported action.');
  let identity;
  try{
    const C=globalThis.PFCore;identity=await C.readInvitation(body.invitation);
    const key=await crypto.subtle.importKey('jwk',identity.public.sign,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const data={v:1,domain:'enselm-relay-v1',audience:body.audience,timestamp:body.timestamp,nonce:body.nonce,action:body.action,payload:body.payload};
    const signature=C.un64(body.signature);
    requireThat(signature.length===64&&await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,encoder.encode(JSON.stringify(data))),401,'Request signature invalid.');
  }catch(error){if(error instanceof RelayError)throw error;throw new RelayError(401,'Identity or signature invalid.');}
  // One conditional statement enforces the rate budget, and the PK prevents replay.
  await db.batch([statement(db,'DELETE FROM relay_nonces WHERE created < ?',now-10*MINUTE),statement(db,'DELETE FROM relay_messages WHERE expires <= ?',now)]);
  try{
    const used=await statement(db,'INSERT INTO relay_nonces(identity,nonce,created) SELECT ?,?,? WHERE (SELECT count(*) FROM relay_nonces WHERE identity=? AND created>?) < 120 AND (SELECT count(*) FROM relay_nonces) < 120000',identity.id,body.nonce,now,identity.id,now-MINUTE).run();
    requireThat(changed(used),429,'Too many requests. Wait a minute.');
  }catch(error){if(error instanceof RelayError)throw error;if(/unique|constraint/i.test(String(error.message)))throw new RelayError(409,'Request already used.');throw error;}
  return {...body,identity:identity.id};
}
async function enabled(db,id){return !!await statement(db,'SELECT identity FROM relay_mailboxes WHERE identity=?',id).first();}
async function runAction(db,body,now){
  const {identity:id,action,payload:p}=body;
  if(['enable','status','inbox','disable'].includes(action))exact(p,[]);
  if(action==='status')return {enabled:await enabled(db,id)};
  if(action==='enable'){
    await statement(db,'INSERT OR IGNORE INTO relay_mailboxes(identity,created) SELECT ?,? WHERE (SELECT count(*) FROM relay_mailboxes)<1000',id,now).run();
    requireThat(await enabled(db,id),503,'Mailbox capacity reached.');return {enabled:true};
  }
  requireThat(await enabled(db,id),403,'Enable your mailbox first.');
  if(action==='allow'||action==='revoke'){
    exact(p,['sender']);requireThat(fingerprint(p.sender)&&p.sender!==id,400,'Choose another identity.');
    if(action==='allow'){
      await statement(db,'INSERT OR IGNORE INTO relay_grants(recipient,sender) SELECT ?,? WHERE EXISTS(SELECT 1 FROM relay_mailboxes WHERE identity=?) AND (SELECT count(*) FROM relay_grants WHERE recipient=?)<100',id,p.sender,id,id).run();
      requireThat(await statement(db,'SELECT sender FROM relay_grants WHERE recipient=? AND sender=?',id,p.sender).first(),409,'Receiving permission limit reached or mailbox disabled.');return {allowed:true};
    }
    await db.batch([statement(db,'DELETE FROM relay_grants WHERE recipient=? AND sender=?',id,p.sender),statement(db,'UPDATE relay_messages SET envelope=NULL WHERE recipient=? AND sender=?',id,p.sender)]);return {allowed:false};
  }
  if(action==='disable'){
    await db.batch([statement(db,'DELETE FROM relay_grants WHERE recipient=?',id),statement(db,'UPDATE relay_messages SET envelope=NULL WHERE recipient=?',id),statement(db,'DELETE FROM relay_mailboxes WHERE identity=?',id)]);return {enabled:false};
  }
  if(action==='inbox'){
    const result=await statement(db,'SELECT envelope FROM relay_messages WHERE recipient=? AND envelope IS NOT NULL AND expires>? AND EXISTS(SELECT 1 FROM relay_mailboxes WHERE identity=?) ORDER BY created,id LIMIT 30',id,now,id).all();
    return {messages:result.results.map(row=>JSON.parse(row.envelope))};
  }
  if(action==='ack'){
    exact(p,['ids']);requireThat(Array.isArray(p.ids)&&p.ids.length<=30&&p.ids.every(messageId),400,'Invalid acknowledgment IDs.');
    if(p.ids.length)await statement(db,`UPDATE relay_messages SET envelope=NULL WHERE recipient=? AND id IN (${p.ids.map(()=>'?').join(',')})`,id,...p.ids).run();
    return {removed:true};
  }
  exact(p,['envelope']);const e=p.envelope;
  exact(e,['type','v','id','from','to','created','key','iv','cipher','signature']);invitationShape(e.from);
  requireThat(e.from.id===id&&fingerprint(e.to)&&e.to!==id,400,'Invalid message identities.');
  const serialized=JSON.stringify(e);requireThat(encoder.encode(serialized).length<=MAX_ENVELOPE,413,'Encrypted message exceeds the 512 KiB online limit. Use encrypted file exchange for larger content.');
  try{await globalThis.PFCore.inspectEnvelope(e,e.to);}catch{throw new RelayError(400,'Encrypted message validation failed.');}
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(serialized))),n=>n.toString(16).padStart(2,'0')).join('');
  // Atomic INSERT SELECT rechecks consent, enrollment, queue size, and daily budget at write time.
  await statement(db,`INSERT OR IGNORE INTO relay_messages(sender,id,recipient,digest,envelope,created,expires)
    SELECT ?,?,?,?,?,?,? WHERE
    EXISTS(SELECT 1 FROM relay_mailboxes WHERE identity=?) AND
    EXISTS(SELECT 1 FROM relay_mailboxes WHERE identity=?) AND
    EXISTS(SELECT 1 FROM relay_grants WHERE recipient=? AND sender=?) AND
    (SELECT count(*) FROM relay_messages WHERE recipient=? AND envelope IS NOT NULL AND expires>?)<30 AND
    (SELECT count(*) FROM relay_messages WHERE sender=? AND created>?)<100 AND
    (SELECT coalesce(sum(length(CAST(envelope AS BLOB))),0) FROM relay_messages WHERE recipient=? AND envelope IS NOT NULL AND expires>?)+?<=8388608`,id,e.id,e.to,digest,serialized,now,now+TTL,id,e.to,e.to,id,e.to,now,id,now-DAY,e.to,now,encoder.encode(serialized).length).run();
  const row=await statement(db,'SELECT digest,expires FROM relay_messages WHERE sender=? AND id=?',id,e.id).first();
  requireThat(row,403,'Message not queued. Receiving permission, mailbox availability, or quota prevented it.');
  requireThat(row.digest===digest,409,'Message ID already belongs to different content.');
  // Same response after ack or revoke: this endpoint does not disclose read/receipt state.
  return {queued:true,id:e.id,expiresAt:new Date(row.expires).toISOString()};
}
export async function handleRelay(request,env){
  try{
    requireThat(request.method==='POST',405,'Use POST.');
    const origin=request.headers.get('origin');requireThat(!origin||origin===new URL(request.url).origin,403,'Cross-origin requests are not allowed.');
    requireThat(env?.DB,503,'Relay storage is unavailable.');
    const now=Date.now(),body=await authenticate(request,env.DB,now);
    return reply(await runAction(env.DB,body,now));
  }catch(error){return reply({error:error instanceof RelayError?error.message:'Relay unavailable. Try again later.'},error instanceof RelayError?error.status:503);}
}

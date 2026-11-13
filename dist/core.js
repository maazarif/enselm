/* Private First 0.1 — browser/Node shared core. No network operations. */
(function(root) {
  'use strict';
  const te = new TextEncoder(), td = new TextDecoder();
  const VERSION = 1, MAX_FILE = 8 * 1024 * 1024, ITERATIONS = 600000;
  const subtle = () => globalThis.crypto.subtle;
  const uid = () => crypto.randomUUID();
  const b64 = a => { let s = ''; for (const n of new Uint8Array(a)) s += String.fromCharCode(n); return btoa(s); };
  const un64 = s => { if (typeof s !== 'string' || s.length > MAX_FILE * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw Error('Invalid encoded data.'); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  const random = n => crypto.getRandomValues(new Uint8Array(n));
  const bytes = o => te.encode(JSON.stringify(o));
  function assert(ok, msg) { if (!ok) throw Error(msg); }
  function text(v, max, label) { assert(typeof v === 'string' && v.length <= max, 'Invalid ' + label + '.'); return v; }
  function publicKeys(keys) {
    assert(keys && keys.box && keys.sign, 'Missing identity keys.');
    const b = keys.box, s = keys.sign;
    assert(b.kty === 'RSA' && b.e === 'AQAB' && typeof b.n === 'string' && un64url(b.n).length === 384, 'Unsupported encryption key.');
    assert(s.kty === 'EC' && s.crv === 'P-256' && typeof s.x === 'string' && typeof s.y === 'string' && un64url(s.x).length === 32 && un64url(s.y).length === 32, 'Unsupported signing key.');
    assert(!b.d && !s.d, 'Invitation must not contain private keys.');
    return {box:{kty:'RSA',n:b.n,e:b.e},sign:{kty:'EC',crv:'P-256',x:s.x,y:s.y}};
  }
  function un64url(s) { return un64(s.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-s.length%4)%4)); }
  async function fingerprint(keys) {
    const digest = new Uint8Array(await subtle().digest('SHA-256',bytes(publicKeys(keys))));
    return Array.from(digest, x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function createIdentity(name) {
    text(name, 60, 'name'); assert(name.trim(), 'Choose a name for this device.');
    const [box,sign] = await Promise.all([
      subtle().generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']),
      subtle().generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])
    ]);
    const pub = publicKeys({box:await subtle().exportKey('jwk',box.publicKey),sign:await subtle().exportKey('jwk',sign.publicKey)});
    return {name:name.trim(),id:await fingerprint(pub),public:pub,private:{box:await subtle().exportKey('jwk',box.privateKey),sign:await subtle().exportKey('jwk',sign.privateKey)}};
  }
  function invitation(identity) { return {type:'private-first-invitation',v:VERSION,name:identity.name,id:identity.id,public:identity.public}; }
  async function readInvitation(v) {
    assert(v && v.type === 'private-first-invitation' && v.v === VERSION,'This is not a supported invitation.');
    const pub = publicKeys(v.public), id = await fingerprint(pub);
    assert(v.id === id,'Invitation fingerprint does not match its keys.');
    const name = text(v.name,60,'contact name'); assert(name.trim(),'Missing contact name.');
    await subtle().importKey('jwk',pub.box,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    await subtle().importKey('jwk',pub.sign,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    return {id,name,public:pub};
  }
  function attachment(a) {
    if (a == null) return null;
    assert(['image/jpeg','image/png','image/webp'].includes(a.mime),'Only JPEG, PNG, and WebP photos are supported.');
    text(a.name,150,'photo name'); assert(un64(a.data).length <= 2*1024*1024,'Photo must be 2 MB or smaller.');
    return {name:a.name,mime:a.mime,data:a.data};
  }
  function content(v) {
    assert(v && typeof v === 'object','Invalid message.');
    const body = text(v.body,30000,'message'), photo = attachment(v.photo);
    assert(body.trim() || photo,'Write something or add a photo.');
    return {body,photo};
  }
  function validateConsent(c, recipient, payload, now=Date.now()) {
    assert(c && c.recipientId === recipient.id && recipient.verified && !recipient.blocked,'Choose a verified, unblocked recipient.');
    assert(c.purpose && c.purpose.length <= 500,'Choose why you are sharing.');
    assert(c.scope === true && c.recipient === true && c.copies === true,'Complete every consent check.');
    assert(c.snapshot === JSON.stringify(content(payload)),'The message changed. Review it again.');
    assert(Number.isFinite(c.readyAt) && now >= c.readyAt,'Your pause is not finished.');
    return true;
  }
  const signable = e => ({type:e.type,v:e.v,id:e.id,from:e.from,to:e.to,created:e.created,key:e.key,iv:e.iv,cipher:e.cipher});
  async function seal(identity, recipient, payload, consent) {
    const clean = content(payload); validateConsent(consent,recipient,clean);
    const to = await readInvitation({type:'private-first-invitation',v:1,...recipient});
    assert(to.id !== identity.id,'Choose another person, not your own identity.');
    const aes = await subtle().generateKey({name:'AES-GCM',length:256},true,['encrypt']);
    const iv = random(12), created = new Date().toISOString(), id = uid();
    const from = invitation(identity);
    const aad = bytes({v:1,id,from:identity.id,to:to.id,created});
    const cipher = await subtle().encrypt({name:'AES-GCM',iv,additionalData:aad},aes,bytes(clean));
    const pub = await subtle().importKey('jwk',to.public.box,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    const wrapped = await subtle().encrypt({name:'RSA-OAEP'},pub,await subtle().exportKey('raw',aes));
    const e = {type:'private-first-message',v:1,id,from,to:to.id,created,key:b64(wrapped),iv:b64(iv),cipher:b64(cipher)};
    const signing = await subtle().importKey('jwk',identity.private.sign,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
    e.signature = b64(await subtle().sign({name:'ECDSA',hash:'SHA-256'},signing,bytes(signable(e))));
    return e;
  }
  async function inspectEnvelope(e, identityId, seen=[]) {
    assert(e && e.type === 'private-first-message' && e.v === VERSION,'This is not a supported message file.');
    text(e.id,80,'message ID'); assert(e.id.length>0,'Missing message ID.');
    assert(e.to === identityId,'This message belongs to a different identity.');
    assert(!seen.includes(e.id),'This message was already imported.');
    assert(typeof e.created === 'string' && Number.isFinite(Date.parse(e.created)),'Invalid message date.');
    assert(un64(e.iv).length === 12 && un64(e.key).length === 384 && un64(e.cipher).length <= 4*1024*1024,'Invalid encrypted message.');
    const from = await readInvitation(e.from);
    const key = await subtle().importKey('jwk',from.public.sign,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    assert(await subtle().verify({name:'ECDSA',hash:'SHA-256'},key,un64(e.signature),bytes(signable(e))),'Message signature is invalid or the file was changed.');
    return from;
  }
  async function openEnvelope(e, identity, contact, accepted, seen=[]) {
    assert(accepted === true,'Opening a message requires your consent.');
    const from = await inspectEnvelope(e,identity.id,seen);
    assert(contact && contact.id === from.id && contact.verified && !contact.blocked,'Verify and allow the sender before opening.');
    const key = await subtle().importKey('jwk',identity.private.box,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
    const raw = await subtle().decrypt({name:'RSA-OAEP'},key,un64(e.key));
    const aes = await subtle().importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
    const aad = bytes({v:1,id:e.id,from:from.id,to:e.to,created:e.created});
    const plain = await subtle().decrypt({name:'AES-GCM',iv:un64(e.iv),additionalData:aad},aes,un64(e.cipher));
    return content(JSON.parse(td.decode(plain)));
  }
  async function vaultKey(password,salt) {
    assert(typeof password === 'string' && password.length >= 12 && password.length<=1024,'Use a passphrase of at least 12 characters.');
    const k = await subtle().importKey('raw',te.encode(password),'PBKDF2',false,['deriveKey']);
    return subtle().deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encryptVault(state,key,salt) {
    const iv = random(12);
    const envelope={type:'private-first-vault',v:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),cipher:b64(await subtle().encrypt({name:'AES-GCM',iv,additionalData:te.encode('private-first-vault/v1')},key,bytes(state)))};
    assert(bytes(envelope).length<=MAX_FILE,'This vault exceeds the 8 MB prototype limit. Remove large photos or older records before saving.');
    return envelope;
  }
  async function newVault(state,password) { const salt=random(16), key=await vaultKey(password,salt); return {key,salt,envelope:await encryptVault(state,key,salt)}; }
  async function unlockVault(e,password) {
    assert(e && e.type==='private-first-vault' && e.v===1 && e.kdf==='PBKDF2-SHA256' && e.iterations===ITERATIONS,'Unsupported vault format.');
    const salt=un64(e.salt); assert(salt.length===16 && un64(e.iv).length===12,'Invalid vault.');
    const key=await vaultKey(password,salt);
    let state;
    try { const plain=await subtle().decrypt({name:'AES-GCM',iv:un64(e.iv),additionalData:te.encode('private-first-vault/v1')},key,un64(e.cipher)); state=JSON.parse(td.decode(plain)); }
    catch { throw Error('Could not unlock. Check the passphrase and backup file.'); }
    validateState(state);
    for(const c of state.contacts) assert(c.id===await fingerprint(c.public),'Contact fingerprint mismatch in vault.');
    if(state.identity){const i=state.identity;assert(i.id===await fingerprint(i.public),'Identity fingerprint mismatch in vault.');assert(i.private.box.n===i.public.box.n&&i.private.sign.x===i.public.sign.x&&i.private.sign.y===i.public.sign.y,'Identity key mismatch in vault.');}
    return {state,key,salt};
  }
  function freshState() { return {v:1,identity:null,notes:[],contacts:[],messages:[],seen:[],settings:{publicEnabled:false,pauseSeconds:10},draft:{body:'',photo:null,recipientId:''}}; }
  function validateState(s) {
    assert(s && s.v===1 && ['notes','contacts','messages','seen'].every(k=>Array.isArray(s[k])) && s.settings && s.draft,'Invalid vault contents.');
    assert(s.notes.length<=1000 && s.contacts.length<=500 && s.messages.length<=1000 && s.seen.length<=10000,'Vault exceeds prototype limits.');
    assert([0,10,30,60].includes(s.settings.pauseSeconds) && typeof s.settings.publicEnabled==='boolean','Invalid settings.');
    s.notes.forEach(n=>{text(n.id,80,'note ID');text(n.title,150,'note title');text(n.body,30000,'note');attachment(n.photo);text(n.updated,60,'note date');});
    s.contacts.forEach(c=>{assert(typeof c.id==='string'&&/^[a-f0-9]{64}$/.test(c.id),'Invalid contact ID.');text(c.name,60,'contact name');publicKeys(c.public);assert(typeof c.verified==='boolean'&&typeof c.blocked==='boolean','Invalid contact permissions.');});
    s.messages.forEach(m=>{text(m.id,80,'message ID');text(m.name,60,'sender name');content(m);});
    s.seen.forEach(id=>text(id,80,'seen message ID'));text(s.draft.body,30000,'draft');text(s.draft.recipientId,64,'draft recipient');attachment(s.draft.photo);
    if(s.editorDraft){text(s.editorDraft.id,80,'unfinished note ID');text(s.editorDraft.title,150,'unfinished title');text(s.editorDraft.body,30000,'unfinished note');attachment(s.editorDraft.photo);}
    if(s.requests){assert(Array.isArray(s.requests)&&s.requests.length<=30,'Invalid message requests.');s.requests.forEach(e=>assert(e&&e.type==='private-first-message'&&e.from&&typeof e.from.name==='string','Invalid message request.'));}
    if(s.identity) { text(s.identity.name,60,'identity name');publicKeys(s.identity.public);assert(s.identity.private?.box?.d && s.identity.private?.sign?.d,'Missing private identity keys.'); }
    return s;
  }
  function parseFile(raw) { assert(typeof raw === 'string' && te.encode(raw).length <= MAX_FILE,'File is too large (maximum 8 MB).'); try {return JSON.parse(raw);}catch{throw Error('This is not a valid Private First file.');} }
  const api={VERSION,MAX_FILE,ITERATIONS,uid,b64,un64,fingerprint,createIdentity,invitation,readInvitation,content,validateConsent,seal,inspectEnvelope,openEnvelope,newVault,encryptVault,unlockVault,freshState,validateState,parseFile};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.PFCore=api;
})(globalThis);

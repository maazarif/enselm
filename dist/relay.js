/* Explicit signed same-origin requests. Loading performs no I/O. */
(function(root){
  'use strict';
  const actions=new Set(['enable','status','allow','revoke','send','inbox','ack','disable']);
  async function request(identity,action,payload={},options={}){
    const C=root.PFCore||(typeof require==='function'?require('./core.js'):null);
    if(!actions.has(action)||!identity?.private?.sign)throw Error('A local signing identity is required.');
    const check=()=>{options.check?.();if(options.signal?.aborted){const e=Error('Request cancelled.');e.cancelled=true;throw e;}};
    check();const clean=JSON.parse(JSON.stringify(payload)),timestamp=Date.now(),nonce=crypto.randomUUID();
    const audience=options.audience||root.location?.origin;if(!audience||!/^https?:\/\//.test(audience))throw Error('Relay origin is unavailable.');
    const signed={v:1,domain:'enselm-relay-v1',audience,timestamp,nonce,action,payload:clean};
    const key=await crypto.subtle.importKey('jwk',identity.private.sign,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);check();
    const signature=C.b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(JSON.stringify(signed))));check();
    let response;
    try{response=await (options.fetch||root.fetch)('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',signal:options.signal,body:JSON.stringify({invitation:C.invitation(identity),audience,timestamp,nonce,action,payload:clean,signature})});}
    catch(e){if(options.signal?.aborted){e.cancelled=true;throw e;}throw Error('The server response was not received. A submitted change may already have completed. Check its status before retrying.');}
    check();const result=await response.json().catch(()=>{throw Error('The relay returned an unreadable response. A submitted change may already have completed.');});check();
    if(!response.ok)throw Error(result.error||'The relay could not complete this request.');return result;
  }
  const api={request};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RelayClient=api;
})(globalThis);

const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync,spawn}=require('node:child_process');
const {mkdtempSync,rmSync,readFileSync,readdirSync}=require('node:fs');
const {tmpdir}=require('node:os');const {join}=require('node:path');
const C=require('../dist/core.js'),R=require('../dist/relay.js');
const root=join(__dirname,'..');
test('built Worker serves the app and signed relay survives local server restart',async t=>{
 execFileSync(process.execPath,['scripts/build-backend.mjs'],{cwd:root});
 const directory=mkdtempSync(join(tmpdir(),'enselm-test-'));let server;
 t.after(()=>{server?.kill();rmSync(directory,{recursive:true,force:true});});
 async function start(){server=spawn(process.execPath,['backend/local-server.mjs'],{cwd:root,env:{...process.env,ENSELM_DATA_DIR:directory,ENSELM_PORT:'0'},stdio:['ignore','pipe','pipe']});return await new Promise((resolve,reject)=>{let out='',err='';const timer=setTimeout(()=>{server.kill();reject(Error('Local server start timed out: '+err));},10000);server.stderr.on('data',c=>err+=c);server.stdout.on('data',c=>{out+=c;const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+err));});});}
 let origin=await start();
 const page=await fetch(origin);assert.equal(page.status,200);assert.match(await page.text(),/relay\.js/);assert.equal(page.headers.get('cache-control'),'no-store');
 assert.equal((await fetch(origin+'/api/health')).status,200);assert.equal((await fetch(origin+'/backend/schema.sql')).status,404);
 const [a,b]=await Promise.all(['Smoke A','Smoke B'].map(C.createIdentity));
 const call=(identity,action,payload={})=>R.request(identity,action,payload,{audience:origin,fetch:(path,opts)=>fetch(origin+path,opts)});
 await call(a,'enable');await call(b,'enable');await call(b,'allow',{sender:a.id});
 const payload={body:'integration test',photo:null};const envelope=await C.seal(a,{...C.invitation(b),verified:true,blocked:false},payload,{recipientId:b.id,purpose:'test',scope:true,recipient:true,copies:true,snapshot:JSON.stringify(payload),readyAt:0});
 await call(a,'send',{envelope});
 await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGINT');});origin=await start();
 const inbox=await call(b,'inbox');assert.equal(inbox.messages.length,1);
 assert.equal((await C.openEnvelope(inbox.messages[0],b,{...C.invitation(a),verified:true,blocked:false},true)).body,payload.body);
 await call(b,'ack',{ids:[envelope.id]});assert.equal((await call(b,'inbox')).messages.length,0);
 await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGINT');});server=null;
});
test('generated hosted migration matches local relay table columns and indexes',()=>{
 const {DatabaseSync}=require('node:sqlite');const a=new DatabaseSync(':memory:'),b=new DatabaseSync(':memory:');
 try{a.exec(readFileSync(join(root,'backend/schema.sql'),'utf8'));for(const f of readdirSync(join(root,'drizzle')).filter(x=>x.endsWith('.sql')).sort())b.exec(readFileSync(join(root,'drizzle',f),'utf8'));
 for(const {name} of a.prepare("SELECT name FROM sqlite_master WHERE type='table'").all())assert.deepEqual(b.prepare('PRAGMA table_info('+name+')').all(),a.prepare('PRAGMA table_info('+name+')').all());
 assert.deepEqual(b.prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name").all(),a.prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name").all());
 }finally{a.close();b.close();}
});

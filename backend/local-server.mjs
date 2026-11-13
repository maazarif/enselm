// Development host: loopback only. Node 24+, no third-party runtime dependencies.
import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSqliteDB} from './sqlite-adapter.mjs';
const root=resolve(import.meta.dirname,'..');
const directory=process.env.ENSELM_DATA_DIR||join(root,'.local-data');
mkdirSync(directory,{recursive:true});
const DB=createSqliteDB(join(directory,'relay.sqlite'));
// Local adapter initializes the schema once; hosted schema uses versioned migrations.
const worker=(await import(pathToFileURL(join(root,'dist/server/index.js')))).default;
const port=Number(process.env.ENSELM_PORT||8000);
const server=createServer(async(req,res)=>{
  try{
    const init={method:req.method,headers:req.headers};
    if(!['GET','HEAD'].includes(req.method)){init.body=req;init.duplex='half';}
    const address=server.address();
    const origin='http://127.0.0.1:'+address.port;
    if(req.headers.host!=='127.0.0.1:'+address.port){res.writeHead(400);res.end('Use the displayed loopback URL.');return;}
    const request=new Request(origin+req.url,init);
    const result=await worker.fetch(request,{DB});
    res.writeHead(result.status,Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Request failed."}');}
});
server.listen(port,'127.0.0.1',()=>console.log('Enselm development server: http://127.0.0.1:'+server.address().port));
process.on('SIGINT',()=>server.close(()=>{DB.close();process.exit(0);}));

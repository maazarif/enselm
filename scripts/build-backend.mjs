import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {join,relative,extname} from 'node:path';
const root=process.cwd(),dist=join(root,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.zip':'application/zip'};
const assets={};
function add(dir){for(const file of readdirSync(dir)){if(file==='server'||file==='.openai')continue;const path=join(dir,file);if(statSync(path).isDirectory())add(path);else{const key='/'+relative(dist,path).replaceAll('\\','/');assets[key]={type:types[extname(file)]||'application/octet-stream',data:readFileSync(path).toString('base64')};}}}
add(dist);
const core=readFileSync(join(dist,'core.js'),'utf8');
const relay=readFileSync(join(root,'backend/relay.mjs'),'utf8');
const handler=readFileSync(join(root,'backend/worker-handler.mjs'),'utf8');
mkdirSync(join(dist,'server'),{recursive:true});
mkdirSync(join(dist,'.openai'),{recursive:true});
writeFileSync(join(dist,'server/index.js'),core+'\n'+relay+'\nconst bundledAssets='+JSON.stringify(assets)+';\n'+handler);
writeFileSync(join(dist,'.openai/hosting.json'),readFileSync(join(root,'.openai/hosting.json')));
console.log('Built Worker with '+Object.keys(assets).length+' same-origin assets.');

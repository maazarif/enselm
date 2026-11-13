// Concatenated with PFCore, handleRelay and the static asset map by build-backend.
const securityHeaders={
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/relay') return handleRelay(request,env);
    if(url.pathname==='/api/health'){
      if(request.method!=='GET')return new Response(null,{status:405,headers:securityHeaders});
      try{await env.DB.prepare('SELECT identity FROM relay_mailboxes LIMIT 1').first();return Response.json({service:'enselm-relay',version:'0.6.0',available:true},{headers:securityHeaders});}
      catch{return Response.json({service:'enselm-relay',available:false},{status:503,headers:securityHeaders});}
    }
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:securityHeaders});
    const asset=bundledAssets[url.pathname==='/'?'/index.html':url.pathname];
    if(!asset)return new Response('Not found',{status:404,headers:securityHeaders});
    return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{...securityHeaders,'Content-Type':asset.type}});
  }
};

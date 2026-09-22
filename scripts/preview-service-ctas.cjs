// Local-only review: submissions never leave this server or persist customer data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type','application/json');
    if(req.method==='POST'){res.statusCode=503;return res.end(JSON.stringify({error:'Review preview only. No enquiry was sent.'}));}
    return res.end(JSON.stringify({preview:true,travelBand:'within50',distanceKm:10,travelFeeIncGst:0,entryCount:0}));
  }
  const parts=decodeURIComponent(url.pathname).split('/');
  if(parts.some(p=>['..','.git','node_modules','backend','output'].includes(p))){res.statusCode=404;return res.end();}
  let file=path.join(root,...parts);if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end('Not found');}
  let body=fs.readFileSync(file);
  if(path.extname(file)==='.html'){
    body=body.toString().replace('<head>','<head><script>window.__API_BASE__=location.origin;</script>');
    res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'");
  }
  res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');res.end(body);
}).listen(4190,'127.0.0.1',()=>console.log('Local CTA preview: http://127.0.0.1:4190 — enquiries disabled.'));

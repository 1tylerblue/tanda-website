const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../pricing-engine');
const S=require('../subscription-pricing');
const root=path.resolve(__dirname,'..');
const receipts=new Map();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url,'http://127.0.0.1');
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/')) {
  if(req.method==='GET') return json(200,url.pathname.includes('travel')?{travelBand:'within50',distanceKm:10,travelFeeIncGst:0,feeApplied:false,thresholdKm:50}:{entryCount:0,entryTarget:50,unlocked:false,pendingReview:0,preview:true});
  if(req.method!=='POST') return json(405,{error:'Method not allowed'});
  try {
   let raw=''; for await(const chunk of req){raw+=chunk;if(raw.length>30000000) return json(413,{error:'Too large'});}
   const body=JSON.parse(raw); const key=url.pathname+':'+body.idempotencyKey;
   if(receipts.has(key)) return json(200,receipts.get(key));
   let result;
   if(url.pathname==='/api/leads'){
    const errors=P.validateInput(body);if(errors.length) return json(400,{error:errors.join(' ')});
    const estimate=P.calculateEstimate({...body,travelBand:'within50'});
    result={...estimate,lead:{id:'preview-'+body.idempotencyKey,...estimate},aiSummary:P.generateSummary(body,estimate),customerScope:P.buildServiceScope(body),deliveryStatus:{email:'Sent to local preview sink (simulated only)'}};
   } else if(url.pathname==='/api/subscriptions') result={subscription:{id:'preview-'+body.idempotencyKey,pricing:S.calculatePricing(body.pricingInput)},deliveryStatus:{email:'Simulated only'}};
   else return json(404,{error:'Unknown preview endpoint'});
   receipts.set(key,result);return json(201,result);
  } catch(error){return json(400,{error:error.message});}
 }
 let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
 if(relative.endsWith('/')) relative+='index.html';
 if(relative.split('/').some(part=>['backend','node_modules','.git','output'].includes(part))) {res.writeHead(404);return res.end();}
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 let content=fs.readFileSync(file);
 if(path.extname(file)==='.html'){
  content=content.toString().replace('<head>','<head><script>window.__API_BASE__=location.origin;</script>').replace(/(<body[^>]*>)/,'$1<div style="padding:8px;background:#17343d;color:white;text-align:center;font:14px sans-serif">Review preview — submissions simulated; no payment or email sent.</div>');
  res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'");
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);
});
server.listen(4180,'127.0.0.1',()=>console.log('Review preview: http://127.0.0.1:4180 — simulated submissions only'));

const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pages=fs.readdirSync(root).filter(n=>n.endsWith('.html')).concat(...['areas','services','reviews'].map(dir=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.html')).map(n=>dir+'/'+n)));
test('all local page links and assets resolve',()=>{
 const failures=[];
 for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8').replace(/'/g, '"');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const link=match[1];if(/^(https?:|data:|tel:|sms:|mailto:|javascript:)/.test(link)) continue;
   const [file,hash]=link.split('#');const plain=file.split('?')[0];
   let target=plain?path.resolve(path.dirname(path.join(root,page)),decodeURIComponent(plain)):path.join(root,page);
   if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
   if(!fs.existsSync(target)){failures.push(page+' → '+link);continue;}
   if(hash&&target.endsWith('.html')&&!fs.readFileSync(target,'utf8').replace(/'/g, '"').includes('id="'+hash+'"'))failures.push(page+' → missing #'+hash);
  }
 }
 assert.deepEqual(failures,[]);
});
test('canonical metadata, structured data, robots and sitemap',()=>{
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 assert.match(fs.readFileSync(path.join(root,'robots.txt'),'utf8'),/Sitemap: https:\/\/www.tandaprocleaning.com.au\/sitemap.xml/);
 for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8').replace(/'/g, '"');
  const canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.ok(canonical.startsWith('https://www.tandaprocleaning.com.au/'),page);assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),page);
  assert.match(html,/<title>[^<]+<\/title>/);assert.match(html,/<meta\s+name="description"/);
  if(page!=='reviews.html')assert.match(html,/<meta\s+property="og:url"/);
  for(const [,json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const data=JSON.parse(json);assert.ok(data['@context']);assert.doesNotMatch(json,/localhost|127\.0\.0\.1|staging/);}
 }
});
test('analytics IDs retained and unsupported payments not offered',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(app.includes('G-GDWFQH85WN'));assert.ok(app.includes('AW-11132030271/8PYfCNyuw9QcEL-albwp'));
 for(const page of ['index.html','subscription-builder.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8').replace(/'/g, '"');assert.ok(html.includes('GTM-58HPXR72'));
  assert.doesNotMatch(html,/<option[^>]*>[^<]*(?:Afterpay|Zip)/i);
  assert.match(html,/Afterpay is currently unavailable/);
 }
});

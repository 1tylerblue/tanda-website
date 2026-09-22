const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const config=require('../scripts/service-ctas.json');
test.beforeEach(async({page})=>{await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});
async function dismiss(page){const deny=page.getByRole('button',{name:'Deny Analytics',exact:true});if(await deny.isVisible())await deny.click();}
for(const item of config) test(item.page+' CTAs and service preselection',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,375,390,768,1440]){
    await page.setViewportSize({width,height:900});
    const response=await page.goto('/services/'+item.page);expect(response.status()).toBe(200);await dismiss(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const links=page.locator('main a[href$="#quote"]');expect(await links.count()).toBeGreaterThanOrEqual(4);
    for(const link of await links.all()){
      await expect(link).toHaveAttribute('href','../index.html?service='+item.service+'#quote');
      await link.scrollIntoViewIfNeeded();
      const box=await link.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
      expect(await link.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    }
    const hero=page.locator('[data-service-cta="hero"] a').first();
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    expect((await hero.boundingBox()).y).toBeLessThan(900);
    await expect(page.locator('a[href="tel:0466224927"]').first()).toBeVisible();
    await expect(page.locator('#tandaMessengerButton')).toBeVisible();
    if(width===390||width===1440){fs.mkdirSync('output/screenshots',{recursive:true});await page.screenshot({path:`output/screenshots/${item.service}-${width}.png`});}
    await hero.click();await expect(page).toHaveURL(new RegExp('service='+item.service+'#quote$'));
    await expect(page.locator('#quoteForm')).toBeVisible();await expect(page.locator('#service')).toHaveValue(item.service);
    await expect(page.locator('#pricingItemCode')).toBeEnabled();
  }
  expect(errors).toEqual([]);
});
test('protected files and tracking blocks match production',()=>{
  const original=f=>cp.execFileSync('git',['show','07e8e60:'+f],{encoding:'utf8',maxBuffer:4e6}).replaceAll('\r\n','\n');
  for(const f of ['app.js','index.html','pricing-engine.js','subscription-builder.js','subscription-builder.html','giveaway.html','styles.css','messenger-button.js'])expect(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).toBe(original(f));
  for(const {page} of config){const f='services/'+page,s=fs.readFileSync(f,'utf8'),before=original(f);expect(s.split('</head>')[0]).toBe(before.split('</head>')[0]);expect(s.match(/<script[\s\S]*?<\/script>/g)).toEqual(before.match(/<script[\s\S]*?<\/script>/g));expect(s.match(/<noscript>[\s\S]*?<\/noscript>/g)).toEqual(before.match(/<noscript>[\s\S]*?<\/noscript>/g));
    for(const [,href] of s.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^(?:https?:|tel:|mailto:|data:|#)/.test(href))continue;const local=decodeURIComponent(href.split(/[?#]/)[0]);let file=path.resolve('services',local);if(local.endsWith('/'))file=path.join(file,'index.html');expect(fs.existsSync(file),f+': '+href).toBe(true);}
  }
});

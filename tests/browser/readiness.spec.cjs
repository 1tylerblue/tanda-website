const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve('output/playwright');
fs.mkdirSync(output,{recursive:true});
test.beforeEach(async({page})=>{
 page.on('pageerror',error=>console.log('Browser error:',error.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
});
async function consent(page,accept=false){const button=page.getByRole('button',{name:accept?'Accept Analytics':'Deny Analytics',exact:true});if(await button.isVisible()) await button.click();}
async function quote(page,code='window_package_double'){
 await page.goto('/index.html#quote'); await consent(page,true);
 await page.locator('#firstName').fill('Synthetic Test');await page.locator('#phone').fill('0400000000');await page.locator('#email').fill('test@example.invalid');await page.locator('#address').fill('Synthetic test address');
 await page.locator('#propertyType').selectOption('Residential');await page.locator('#storeys').selectOption('2');
 if(page.viewportSize().width<=760){await page.locator('[data-mobile-quote-next="2"]').click();await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step','2',{timeout:1500});}
 await page.getByRole('button',{name:'Choose one or more services',exact:true}).click();
 await page.getByLabel('Window Cleaning',{exact:true}).check();
 await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
 await page.getByRole('button',{name:'Choose one or more job types',exact:true}).click();
 await page.getByLabel('Double-storey complete window package',{exact:true}).check();
 await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
 await page.locator('#serviceArea').selectOption('Both');
 if(page.viewportSize().width<=760)await page.locator('[data-mobile-quote-next="3"]').click();
 await page.getByText('Optional details: access, condition and timing',{exact:true}).click();
 await page.locator('#accessDifficulty').selectOption('double');
 await page.locator('#paymentPreference').selectOption('Card');
 await page.locator('[name="agree"]').check();
}
for(const width of [320,375,390,768,1440]) test('responsive homepage and subscription '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const file of ['index.html','subscription-builder.html']){
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/'+file);await consent(page);
  await expect(page.locator('.promotion-panel')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  if(width===390||width===1440) await page.screenshot({path:path.join(output,`${file.replace('.html','')}-${width}.png`),fullPage:false});
  if(file==='subscription-builder.html') await expect(page.locator('#liveFirstClean')).toContainText('$593.01');
 }
});
test('mobile quote succeeds through all three steps',async({page})=>{
 await page.setViewportSize({width:390,height:844});await quote(page);
 await page.locator('form').getByRole('button',{name:'Get a Free Quote',exact:true}).click();
 await expect(page.locator('#formMessage')).toContainText('has been sent');
 await expect(page.locator('[data-result-range]')).toContainText('$536.25');
 await page.locator('[data-result-panel]').screenshot({path:path.join(output,'quote-mobile-success.png')});
});
test('denied analytics stay silent and phone/Messenger track only after consent',async({page})=>{
 await page.goto('/index.html');
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event').length)).toBe(0);
 await page.evaluate(()=>document.querySelectorAll('a[href^="tel:"],a[href*="m.me/"]').forEach(a=>a.addEventListener('click',e=>e.preventDefault())));
 await page.locator('a[href^="tel:"]').first().click();
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event').length)).toBe(0);
 await consent(page,true);
 await page.locator('a[href^="tel:"]').first().click();
 await page.getByRole('link',{name:'Chat with T&A Pro Cleaning on Messenger'}).click();
 const events=await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event').map(e=>e[1]));
 expect(events.some(name=>name.startsWith('phone_click_'))).toBe(true);expect(events).toContain('messenger_button_clicked');
});
test('subscription prices survive refresh and back navigation',async({page})=>{
 await page.goto('/subscription-builder.html?plan=gold');await consent(page);
 await expect(page.locator('#liveFirstClean')).toContainText('$1,088.01');
 await page.reload();await expect(page.locator('#liveRecurring')).toContainText('$741.51');
 await page.goto('/services/carpet-cleaning-gold-coast.html');await page.goBack();
 await expect(page.locator('#liveFirstClean')).toContainText('$1,088.01');
});
test('subscription timeout is bounded and concurrent sends are prevented',async({page})=>{
 await page.goto('/subscription-builder.html');await consent(page);
 let calls=0;let release;
 await page.route('**/api/subscriptions',async route=>{calls++;await new Promise(resolve=>{release=resolve;});await route.abort().catch(()=>{});});
 const outcomes=await page.evaluate(async()=>{
  const payload={pricingInput:{planKey:'bronze',propertyType:'house'}};
  return Promise.allSettled([TASubmissions.submit('/api/subscriptions',payload,200),TASubmissions.submit('/api/subscriptions',payload,200)]).then(results=>results.map(r=>r.reason?.message));
 });
 expect(calls).toBe(1);expect(outcomes[0]).toContain('timed out');expect(outcomes[1]).toContain('already being sent');release();
});
test('carpet uses room pricing without window coverage fields',async({page})=>{
 await page.goto('/index.html#quote');await consent(page);
 await page.locator('#propertyType').selectOption('Residential');await page.locator('#storeys').selectOption('1');
 await page.getByRole('button',{name:'Choose one or more services',exact:true}).click();await page.getByLabel('Carpet Cleaning',{exact:true}).check();
 await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
 await page.getByRole('button',{name:'Choose one or more job types',exact:true}).click();await page.getByLabel('Standard bedroom up to 14 m2',{exact:true}).check();
 await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
 await page.locator('#scopeQuantity').fill('3');await page.locator('#scopeQuantity').press('Tab');
 await expect(page.locator('#serviceArea')).toBeDisabled();await expect(page.locator('[data-estimate-preview]')).toContainText('$74.25');
 await page.locator('#scopeQuantity').fill('3.5');await page.locator('#scopeQuantity').press('Tab');
 expect(await page.locator('#scopeQuantity').evaluate(node=>node.checkValidity())).toBe(false);
});
test('quote success, consent conversion, double submit and refresh',async({page})=>{
 await quote(page);
 await expect(page.locator('[data-estimate-preview]')).toContainText('$536.25');
 await page.locator('[data-estimate-preview]').screenshot({path:path.join(output,'quote-25-percent.png')});
 await page.locator('.payment-instructions').screenshot({path:path.join(output,'payment-wording.png')});
 let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/leads')&&r.method()==='POST')posts++;});
 await page.locator('form').getByRole('button',{name:'Get a Free Quote',exact:true}).click();
 await expect(page.locator('#formMessage')).toContainText('has been sent');
 await page.locator('#quote').screenshot({path:path.join(output,'quote-success-simulated.png')});
 expect(posts).toBe(1);
 await page.locator('form').getByRole('button',{name:'Get a Free Quote',exact:true}).click();
 await expect(page.locator('#formMessage')).toContainText('has been sent');
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='quote_submit_success').length)).toBe(1);
 await page.reload();
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='quote_submit_success').length)).toBe(0);
});
test('quote timeout preserves fields; retry succeeds once',async({page})=>{
 await quote(page);
 let release;
 await page.route('**/api/leads',async route=>{await new Promise(resolve=>{release=resolve;});await route.abort().catch(()=>{});});
 await page.evaluate(()=>{const submit=TASubmissions.submit;TASubmissions.submit=(url,payload)=>submit(url,payload,150);});
 await page.locator('form').getByRole('button',{name:'Get a Free Quote',exact:true}).click();
 await expect(page.locator('#formMessage')).toContainText('timed out');
 await expect(page.locator('#firstName')).toHaveValue('Synthetic Test');
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='quote_submit_success').length)).toBe(0);
 await page.locator('#formMessage').screenshot({path:path.join(output,'quote-timeout.png')});
 release();await page.unroute('**/api/leads');
 await page.evaluate(()=>{delete window.__unused;});
 await page.locator('form').getByRole('button',{name:'Get a Free Quote',exact:true}).click();
 await expect(page.locator('#formMessage')).toContainText('has been sent');
});
test('subscription pricing and recoverable server error',async({page})=>{
 await page.goto('/subscription-builder.html');await consent(page,true);
 await expect(page.locator('#liveFirstClean')).toContainText('$593.01');
 await expect(page.locator('#liveRecurring')).toContainText('$395.01');
 await page.locator('#liveFirstClean').screenshot({path:path.join(output,'subscription-10-percent.png')});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('#fullName').fill('Synthetic Test');await page.locator('#phone').fill('0400000000');await page.locator('#email').fill('test@example.invalid');
 await page.locator('#streetAddress').fill('Synthetic test address');await page.locator('#suburb').fill('Test');await page.locator('#postcode').fill('4216');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.route('**/api/subscriptions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary test outage. Please retry; your details are preserved.'})}));
 await page.getByRole('button',{name:'Submit Subscription Request',exact:true}).click();
 await expect(page.locator('#builderMessage')).toContainText('Temporary test outage');
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='subscription_submit_success').length)).toBe(0);
 await page.locator('#builderMessage').screenshot({path:path.join(output,'subscription-error.png')});
 await page.unroute('**/api/subscriptions');
 await page.getByRole('button',{name:'Submit Subscription Request',exact:true}).click();
 await expect(page.locator('#builderMessage')).toContainText('request sent');
 await expect(page.locator('#resultFirstClean')).toContainText('$593.01');
 expect(await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='subscription_submit_success').length)).toBe(1);
 await page.locator('#builderResult').screenshot({path:path.join(output,'subscription-success-simulated.png')});
});
test('keyboard navigation, accessibility, links and performance',async({page})=>{
 const reports=[];
 for(const file of ['index.html','subscription-builder.html','giveaway.html','services/carpet-cleaning-gold-coast.html']){
  await page.goto('/'+file);await consent(page);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  reports.push({file,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),navigation:await page.evaluate(()=>performance.getEntriesByType('navigation')[0].toJSON())});
 }
 fs.writeFileSync(path.join(output,'accessibility-performance.json'),JSON.stringify(reports,null,2));
 expect(reports.flatMap(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>r.file+': '+v.id))).toEqual([]);
 await page.goto('/index.html');await consent(page);await page.keyboard.press('Tab');
 expect(await page.evaluate(()=>document.activeElement.tagName)).not.toBe('BODY');
 await expect(page.locator('a[href="https://m.me/tandaprocleaningservices"]')).toBeVisible();
 await expect(page.locator('a[href^="tel:"]').first()).toHaveAttribute('href',/0466224927/);
});

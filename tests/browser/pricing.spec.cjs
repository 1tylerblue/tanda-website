const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const pricing=require('../../pricing-engine');
const serviceLabel=code=>pricing.getItem(code).label;
test.beforeEach(async({page})=>{
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/api/travel-distance?**',r=>r.fulfill({json:{addressVerified:false,distanceKm:null,travelBand:'unverified',travelFeeIncGst:0,travelStatus:'requires address confirmation'}}));
});
async function start(page,width=1440,group='window-cleaning'){
  await page.setViewportSize({width,height:900});
  await page.goto('/index.html?service='+group+'#quote');
  await page.getByRole('button',{name:'Accept Analytics',exact:true}).click();
  await page.locator('#firstName').fill('Synthetic Pricing QA');
  await page.locator('#phone').fill('0400000000');
  await page.locator('#email').fill('pricing@example.invalid');
  await page.locator('#address').fill('test');
  await page.locator('#propertyType').selectOption('Residential');
  await page.locator('#storeys').selectOption('1');
  if(width<760){await page.locator('[data-mobile-quote-next="2"]').click();await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step','2');}
}
async function choose(page,codes){
  await page.getByRole('button',{name:'Choose one or more job types',exact:true}).click();
  for(const code of codes)await page.getByLabel(serviceLabel(code),{exact:true}).check();
  await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
}
for(const width of [320,375,390,768,1440])test('40-window quote, invalid travel, scope and submission '+width,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let payload;
  await page.route('**/api/leads',async r=>{
    payload=r.request().postDataJSON();
    const calculated=pricing.calculateEstimate({...payload,addressVerified:false});
    await r.fulfill({status:201,json:{...calculated,customerScope:pricing.buildServiceScope(payload),deliveryStatus:{email:'Sent to in-memory test only'}}});
  });
  await start(page,width);await choose(page,['window_standard_both']);
  await page.locator('#scopeQuantity').fill('40');await page.locator('#scopeQuantity').blur();
  if(width<760)await page.locator('[data-mobile-quote-next="3"]').click();
  await expect(page.locator('[data-preview-range]')).toContainText('$627');
  await expect(page.locator('[data-preview-accuracy]')).not.toContainText('High');
  await expect(page.locator('[data-preview-breakdown]')).toContainText('25% off');
  await expect(page.locator('[data-preview-breakdown]')).toBeVisible();
  await expect(page.locator('[data-preview-reasons]')).toBeVisible();
  await expect(page.locator('[data-quote-inclusions-list]')).toContainText('Interior and exterior window glass cleaned');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  fs.mkdirSync('output/playwright',{recursive:true});await page.locator('[data-estimate-preview]').screenshot({path:`output/playwright/windows40-${width}.png`});
  await page.locator('[name="agree"]').check();await page.locator('#quoteForm button[type="submit"]').click();
  await expect(page.locator('#formMessage')).toContainText('has been sent');
  await expect(page.locator('[data-result-range]')).toContainText('$627');
  expect(payload.lineItems).toEqual([{code:'window_standard_both',quantity:40,selected:true}]);
  expect(payload.travelFeeIncGst).toBe(0);expect(payload.addressVerified).toBe(false);
  expect(await page.evaluate(()=>dataLayer.some(e=>e[0]==='event'&&e[1]==='conversion'&&e[2]?.send_to==='AW-11132030271/8PYfCNyuw9QcEL-albwp'))).toBe(true);
  expect(errors).toEqual([]);
});
test('zero optional pressure surfaces remain zero and disappear from scope/minimum',async({page})=>{
  await start(page,1440,'pressure-cleaning');await choose(page,['pressure_concrete','pressure_exterior_walls','pressure_retaining_walls']);
  await page.locator('#scopeQuantity').fill('20');await page.locator('#serviceArea').selectOption('Exterior');
  for(const input of await page.locator('.additional-service-quantity').all()){await input.fill('0');await input.blur();await expect(input).toHaveValue('0');}
  await expect(page.locator('[data-preview-range]')).toContainText('$206.25');
  await expect(page.locator('[data-quote-inclusions-list]')).not.toContainText('Exterior walls');
  await expect(page.locator('[data-quote-inclusions-list]')).not.toContainText('Retaining walls');
  await expect(page.locator('[data-preview-breakdown]')).not.toContainText('Exterior walls');
});
test('window side, counting helpers and explicit high-storey confirmation',async({page})=>{
  await start(page);await page.locator('#storeys').selectOption('3');await page.locator('#propertyType').selectOption('Commercial');
  await choose(page,['window_standard_exterior']);await page.locator('#scopeQuantity').fill('30');
  await expect(page.locator('[data-quantity-help]')).toContainText('complete window unit');
  await expect(page.locator('#serviceArea')).toHaveValue('Exterior');
  await expect(page.locator('[data-quote-inclusions-list]')).toContainText('Exterior window glass cleaned');
  await expect(page.locator('[data-quote-inclusions-list]')).not.toContainText('Interior and exterior');
  await expect(page.locator('[data-preview-reasons]')).toContainText('safely accessible');
  await page.locator('.quote-advanced > summary').click();await page.locator('#allGlassGroundAccessible').check();
  await expect(page.locator('[data-preview-reasons]')).not.toContainText('Confirm whether all requested glass');
});
test('measured manual builders jobs still require a real quantity',async({page})=>{
  await start(page,390,'builders-cleaning');await choose(page,['builders_final']);
  await expect(page.locator('#scopeQuantity')).toBeVisible();await expect(page.locator('#scopeQuantity')).toHaveValue('');
  await page.locator('#scopeQuantity').fill('150');await page.locator('#serviceArea').selectOption('Interior');
  await page.locator('[data-mobile-quote-next="3"]').click();
  await expect(page.locator('[data-quote-inclusions-list]')).toContainText('150 m2');
});
test('late address result cannot charge a newly edited invalid address',async({page})=>{
  let release;const held=new Promise(r=>release=r);
  await page.route('**/api/travel-distance?**',async r=>{await held;await r.fulfill({json:{addressVerified:true,distanceSource:'driving-route',distanceKm:100,feeApplied:true,travelBand:'beyond50',travelFeeIncGst:50}});});
  await start(page);await choose(page,['window_standard_both']);await page.locator('#scopeQuantity').fill('40');
  await page.locator('#address').fill('Brisbane QLD 4000');
  const requested=page.waitForRequest(r=>r.url().includes('travel-distance?')&&r.url().includes('Brisbane'));
  await page.locator('#address').blur();await requested;
  await page.locator('#address').fill('');release();
  await expect(page.locator('#travelBand')).toHaveValue('unverified');
  await expect(page.locator('#travelFeeIncGst')).toHaveValue('0');
  await expect(page.locator('[data-preview-range]')).toContainText('$627');
});
test('missing master engine cannot expose retired per-pane prices',async({page})=>{
  await start(page);await choose(page,['window_standard_both']);
  await page.evaluate(()=>window.TAPricing=undefined);
  await page.locator('#scopeQuantity').fill('40');
  await expect(page.locator('[data-preview-range]')).toContainText('Price requires team confirmation');
});

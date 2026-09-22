const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const engine=require('../../pricing-engine');
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.route('**/api/travel-distance?**',route=>route.fulfill({json:new URL(route.request().url()).searchParams.get('address')==='Brisbane QLD 4000'
    ? {addressVerified:true,distanceSource:'driving-route',distanceKm:78.2,feeApplied:true,travelBand:'beyond50',travelFeeIncGst:50}
    : {addressVerified:false,distanceKm:null,travelBand:'unverified',travelFeeIncGst:0,travelStatus:'requires address confirmation'}}));
});
async function start(page,width,address,group='window-cleaning'){
  await page.setViewportSize({width,height:900});
  await page.goto('/index.html?service='+group+'#quote');
  await page.getByRole('button',{name:'Deny Analytics',exact:true}).click();
  for(const [id,value] of Object.entries({firstName:'Synthetic Review QA',phone:'0400000000',email:'review@example.invalid',address}))await page.locator('#'+id).fill(value);
  await page.locator('#address').blur();
  await page.locator('#propertyType').selectOption('Residential');
  await page.locator('#storeys').selectOption('1');
  if(width<760)await page.locator('[data-mobile-quote-next="2"]').click();
}
async function choose(page,code,quantity){
  await page.getByRole('button',{name:'Choose one or more job types',exact:true}).click();
  await page.getByLabel(engine.getItem(code).label,{exact:true}).check();
  await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
  await page.locator('#scopeQuantity').fill(String(quantity));
  await page.locator('#scopeQuantity').blur();
}
test('verified travel adds $50 once and clearing address immediately removes it',async({page})=>{
  await start(page,1440,'Brisbane QLD 4000');
  await expect(page.locator('#travelFeeIncGst')).toHaveValue('50');
  await choose(page,'window_standard_both',40);
  await expect(page.locator('[data-preview-range]')).toContainText('$677');
  const breakdown=page.locator('[data-preview-breakdown]');
  await expect(breakdown).toContainText('Travel incl. GST (not discounted)');
  const text=await breakdown.innerText();
  expect(text.indexOf('Normal service price')).toBeLessThan(text.indexOf('25% off'));
  await expect(breakdown.locator('.estimate-calc-row').filter({hasText:'GST (10%)'})).toContainText('$61.55');
  await page.locator('#address').fill('');
  // Verify before blur: the old verified location must no longer contribute any price or confidence.
  await expect(page.locator('#travelFeeIncGst')).toHaveValue('0');
  await expect(page.locator('#quoteForm')).toHaveAttribute('data-address-verified','false');
  await expect(page.locator('[data-preview-range]')).toContainText('$627');
  await expect(page.locator('[data-preview-accuracy]')).not.toContainText('High');
});
test('30 large panels on mobile use panel wording and $693 incl GST',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,390,'test');
  await choose(page,'window_large_both',30);
  await expect(page.locator('[data-quantity-help]')).toContainText('priced per glass panel');
  await expect(page.locator('[data-quantity-help]')).toContainText('do not count both sides separately');
  await expect(page.locator('#serviceArea')).toHaveValue('Both');
  await page.locator('[data-mobile-quote-next="3"]').click();
  await expect(page.locator('[data-preview-range]')).toContainText('$693');
  const breakdown=page.locator('[data-preview-breakdown]');
  await expect(breakdown).toBeVisible();
  await expect(breakdown).toContainText('30 glass panels x $28 ex GST');
  await expect(breakdown.locator('.estimate-calc-row').filter({hasText:'25% off'})).toContainText('-$210');
  await expect(breakdown.locator('.estimate-calc-row').filter({hasText:'GST (10%)'})).toContainText('$63');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  fs.mkdirSync('output/playwright',{recursive:true});
  await page.locator('[data-estimate-preview]').screenshot({path:'output/playwright/review-large-panels-390.png'});
  expect(errors).toEqual([]);
});

test('measured decimal pressure area remains 20.5 square metres after blur',async({page})=>{
  await start(page,390,'test','pressure-cleaning');
  await choose(page,'pressure_concrete',20.5);
  await page.locator('#serviceArea').selectOption('Exterior');
  await expect(page.locator('#scopeQuantity')).toHaveValue('20.5');
  await expect(page.locator('#scopeQuantity')).toHaveAttribute('step','0.1');
  await page.locator('[data-mobile-quote-next="3"]').click();
  await expect(page.locator('[data-preview-range]')).toContainText('$206.25');
  await expect(page.locator('[data-preview-breakdown]')).toContainText('20.5 m2 x $7 ex GST');
  await expect(page.locator('[data-quote-inclusions-list]')).toContainText('20.5 m2');
});
test('fractional complete window count is invalid and never rounded into one billable unit',async({page})=>{
  await start(page,1440,'test');
  await choose(page,'window_standard_both',0.6);
  await expect(page.locator('#scopeQuantity')).toHaveValue('0.6');
  await expect(page.locator('#scopeQuantity')).toHaveAttribute('step','1');
  expect(await page.locator('#scopeQuantity').evaluate(node=>node.checkValidity())).toBe(false);
});

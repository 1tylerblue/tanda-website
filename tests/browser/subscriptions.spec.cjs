const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const Pricing=require('../../subscription-pricing.js');
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
});
for(const width of [390,1440]) test('subscription plans, 10% breakdown and mocked submission '+width,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let submitted;
  await page.route('**/api/subscriptions', async route=>{
    submitted=route.request().postDataJSON();
    const pricing=Pricing.calculatePricing(submitted.pricingInput);
    await route.fulfill({status:201,json:{ok:true,pricing,deliveryStatus:'in-memory test only'}});
  });
  await page.setViewportSize({width,height:900});
  await page.goto('/subscription-builder.html');
  for(const [plan,first,monthly] of [['bronze','$593.01','$395.01'],['gold','$1,088.01','$741.51'],['platinum','$1,583.01','$1,187.01']]) {
    await page.locator('input[name="plan"][value="'+plan+'"]').check();
    await expect(page.locator('#liveFirstClean')).toContainText(first+' incl GST');
    await expect(page.locator('#liveRecurring')).toContainText(monthly+'/month incl GST');
    await expect(page.locator('#livePriceBreakdown')).toContainText('10% subscription discount');
    await expect(page.locator('#livePriceBreakdown')).toContainText('GST (10%)');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.locator('input[name="plan"][value="gold"]').check();
  await page.locator('[data-builder-next]').click();
  for(const [id,value] of Object.entries({fullName:'Synthetic Subscription QA',phone:'0400000000',email:'subscription@example.invalid',streetAddress:'Synthetic test address',suburb:'Biggera Waters',postcode:'4216'}))await page.locator('#'+id).fill(value);
  await page.locator('#houseBedrooms').fill('5');
  await page.locator('#houseStoreys').fill('2');
  await expect(page.locator('#liveRecurring')).toContainText('$939.51/month incl GST');
  await page.locator('[data-builder-next]').click();
  await expect(page.locator('[data-role="service-checkbox"]:checked')).toHaveCount(5);
  await page.locator('[data-builder-next]').click();
  await page.locator('#conditionLevel').selectOption('standard');
  await page.locator('[data-builder-next]').click();
  const expected=Pricing.calculatePricing({planKey:'gold',propertyType:'house',fields:{conditionLevel:'standard',houseBedrooms:5,houseStoreys:2}});
  await expect(page.locator('#resultFirstClean')).toContainText('$1,434.51 incl GST');
  await expect(page.locator('#resultRecurring')).toContainText('$939.51/month incl GST');
  await expect(page.locator('#resultAnnual')).toContainText('$11,274.12/year incl GST');
  await page.locator('#resultPriceBreakdown summary').click();
  await expect(page.locator('#resultPriceBreakdown')).toContainText('First-clean condition: standard: $75.00');
  fs.mkdirSync('output/playwright',{recursive:true});
  await page.locator('#builderResult').screenshot({path:'output/playwright/subscription-summary-'+width+'.png'});
  await page.getByRole('button',{name:'Submit Subscription Request',exact:true}).click();
  await expect(page.locator('#builderMessage')).toContainText('Subscription request sent');
  expect(submitted.plan.firstCleanPrice).toBe(expected.firstBreakdown.totalIncGst);
  expect(submitted.plan.recurringMonthlyPrice).toBe(expected.recurringBreakdown.totalIncGst);
  expect(submitted.plan.annualRecurringPrice).toBe(expected.annualRecurringIncGst);
  expect(submitted.plan.firstBreakdown).toEqual(expected.firstBreakdown);
  expect(errors).toEqual([]);
});
test('subscription balcony zero quantity and unsafe access require review without extra amount',async({page})=>{
  await page.goto('/subscription-builder.html?plan=gold');
  await page.locator('input[name="propertyType"][value="apartment"]').check();
  await page.locator('[data-builder-next]').click();
  for(const [id,value] of Object.entries({fullName:'Synthetic Subscription QA',phone:'0400000000',email:'subscription@example.invalid',streetAddress:'Synthetic test address',suburb:'Biggera Waters',postcode:'4216'}))await page.locator('#'+id).fill(value);
  await page.locator('#accessibleBalconyGlass').selectOption('yes');
  await page.locator('#balconyPanels').fill('0');await page.locator('#glassDoors').fill('0');
  await expect(page.locator('#liveFirstClean')).toContainText('$1,013.76 incl GST');
  await expect(page.locator('#livePriceBreakdown')).toContainText('No balcony quantity charge');
  await page.locator('[data-builder-next]').click();
  await page.locator('#safeEquipmentAccess').selectOption('no');
  await expect(page.locator('#liveFirstClean')).toContainText('$1,013.76 incl GST');
  await expect(page.locator('#livePriceBreakdown')).toContainText('No speculative access surcharge');
});

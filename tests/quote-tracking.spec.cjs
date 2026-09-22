const {test,expect}=require('@playwright/test');
const pricing=require('../pricing-engine');
test.beforeEach(async({page})=>{await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});
test('existing quote, phone and Messenger tracking still fires after consent',async({page})=>{
  await page.goto('/services/window-cleaning-gold-coast.html');
  await page.getByRole('button',{name:'Accept Analytics',exact:true}).click();
  await page.evaluate(()=>document.querySelectorAll('a[href$="#quote"],a[href^="tel:"],a[href*="m.me/"]').forEach(a=>a.addEventListener('click',e=>e.preventDefault())));
  await page.locator('[data-service-cta="hero"] a').first().focus();
  await expect(page.locator('[data-service-cta="hero"] a').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('[data-service-cta="hero"] a[href^="tel:"]').click();
  await page.locator('#tandaMessengerButton').click();
  const events=await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event').map(e=>({name:e[1],to:e[2]?.send_to})));
  expect(events.some(e=>e.name.startsWith('quote_cta_'))).toBe(true);
  expect(events.some(e=>e.name.startsWith('phone_click_'))).toBe(true);
  expect(events.some(e=>e.name==='conversion'&&e.to==='AW-11132030271/RBdMCMS3w9QcEL-albwp')).toBe(true);
  expect(events.some(e=>e.name==='messenger_button_clicked')).toBe(true);
});
for(const width of [390,1440])test('service landing CTA to successful simulated quote '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  let submitted;
  await page.route('**/api/leads',async route=>{submitted=route.request().postDataJSON();const result=pricing.calculateEstimate(submitted);await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({...result,lead:{id:'synthetic-cta-check',...result},deliveryStatus:{email:'Sent to in-memory test sink only'}})});});
  await page.goto('/services/window-cleaning-gold-coast.html');await page.getByRole('button',{name:'Accept Analytics',exact:true}).click();
  await page.locator('[data-service-cta="hero"] a').first().click();
  await page.locator('#firstName').fill('Synthetic CTA Test');await page.locator('#phone').fill('0400000000');await page.locator('#email').fill('cta@example.invalid');await page.locator('#address').fill('Synthetic test address');
  await page.locator('#propertyType').selectOption('Residential');await page.locator('#storeys').selectOption('1');
  if(width<760){await page.locator('[data-mobile-quote-next="2"]').click();await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step','2');}
  await page.getByRole('button',{name:'Choose one or more job types',exact:true}).click();await page.getByLabel('Single-storey complete window package',{exact:true}).check();await page.getByRole('button',{name:/Done/}).filter({visible:true}).click();
  await page.locator('#serviceArea').selectOption('Both');if(width<760)await page.locator('[data-mobile-quote-next="3"]').click();await page.locator('[name="agree"]').check();
  await page.locator('#quoteForm button[type="submit"]').click();await expect(page.locator('#formMessage')).toContainText('has been sent');
  expect(submitted.lineItems[0].code).toBe('window_package_single');
  const conversions=await page.evaluate(()=>dataLayer.filter(e=>e[0]==='event'&&e[1]==='conversion').map(e=>e[2].send_to));
  expect(conversions).toContain('AW-11132030271/8PYfCNyuw9QcEL-albwp');
});

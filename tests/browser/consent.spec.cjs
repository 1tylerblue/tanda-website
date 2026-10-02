const { test, expect } = require('@playwright/test');
const pricing = require('../../pricing-engine');

// All external tag requests are blocked; lead requests below are intercepted.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
  await page.route('**/api/travel-distance?**', route => route.fulfill({ json: {
    addressVerified: false, distanceKm: null, travelBand: 'unverified',
    travelFeeIncGst: 0, travelStatus: 'requires address confirmation',
  } }));
});

const consentCalls = page => page.evaluate(() => dataLayer
  .filter(item => item[0] === 'consent').map(item => ({ type: item[1], state: item[2] })));
const adConversions = page => page.evaluate(() => dataLayer.filter(item =>
  item[0] === 'event' && item[1] === 'conversion' && item[2]?.send_to ===
  'AW-11132030271/8PYfCNyuw9QcEL-albwp').length);
const states = state => ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']
  .map(key => state[key]);

for (const width of [390, 1440]) {
  test(`fresh visitor, all choices and withdrawal at ${width}px`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('#cookie-consent')).toBeVisible();
    let calls = await consentCalls(page);
    expect(calls.map(call => call.type)).toEqual(['default']);
    expect(states(calls[0].state)).toEqual(Array(4).fill('denied'));
    expect(await adConversions(page)).toBe(0);

    await page.getByRole('button', { name: 'Accept all', exact: true }).click();
    calls = await consentCalls(page);
    expect(states(calls.at(-1).state)).toEqual(Array(4).fill('granted'));
    expect(await page.evaluate(() => TandaConsent.getChoice())).toMatchObject({ analytics: true, advertising: true });
    await expect(page.locator('#cookie-consent')).toBeHidden();

    await page.reload();
    calls = await consentCalls(page);
    expect(calls.map(call => call.type)).toEqual(['default', 'update']);
    expect(states(calls[1].state)).toEqual(Array(4).fill('granted'));
    expect(await page.evaluate(() => dataLayer.findIndex(item => item[0] === 'consent' && item[1] === 'update') <
      dataLayer.findIndex(item => item.event === 'gtm.js'))).toBe(true);

    await page.getByRole('button', { name: 'Cookie settings' }).click();
    await page.getByRole('button', { name: 'Reject all' }).click();
    calls = await consentCalls(page);
    expect(states(calls.at(-1).state)).toEqual(Array(4).fill('denied'));
    await page.goto('/services/window-cleaning-gold-coast.html');
    calls = await consentCalls(page);
    expect(states(calls.at(-1).state)).toEqual(Array(4).fill('denied'));
    await expect(page.locator('#cookie-consent')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('custom analytics-only, separate advertising choice and legacy migration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByLabel('Analytics', { exact: true }).check();
  await page.getByRole('button', { name: 'Save choices' }).click();
  let calls = await consentCalls(page);
  expect(states(calls.at(-1).state)).toEqual(['granted', 'denied', 'denied', 'denied']);
  await page.reload();
  calls = await consentCalls(page);
  expect(states(calls.at(-1).state)).toEqual(['granted', 'denied', 'denied', 'denied']);
  await page.getByRole('button', { name: 'Cookie settings' }).click();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByLabel('Google Ads measurement & personalised ads', { exact: true }).check();
  await page.getByRole('button', { name: 'Save choices' }).click();
  calls = await consentCalls(page);
  expect(states(calls.at(-1).state)).toEqual(Array(4).fill('granted'));
  await page.getByRole('button', { name: 'Cookie settings' }).click();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByLabel('Analytics', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save choices' }).click();
  calls = await consentCalls(page);
  expect(states(calls.at(-1).state)).toEqual(['denied', 'granted', 'granted', 'granted']);

  await page.evaluate(() => {
    localStorage.removeItem('tac_cookie_consent_v2');
    localStorage.setItem('tac_cookie_consent_v1', JSON.stringify({ state: 'accepted', timestamp: Date.now() }));
  });
  await page.reload();
  calls = await consentCalls(page);
  expect(states(calls.at(-1).state)).toEqual(['granted', 'denied', 'denied', 'denied']);
});

test('corrupt, expired and unavailable storage fail closed while settings still work', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('tac_cookie_consent_v2')) localStorage.setItem('tac_cookie_consent_v2', '{bad');
  });
  await page.goto('/');
  await expect(page.locator('#cookie-consent')).toBeVisible();
  expect((await consentCalls(page)).map(call => call.type)).toEqual(['default']);
  await page.evaluate(() => localStorage.setItem('tac_cookie_consent_v2', JSON.stringify({
    version: 2, analytics: true, advertising: true, timestamp: Date.now() - 181 * 86400000,
  })));
  await page.reload();
  await expect(page.locator('#cookie-consent')).toBeVisible();
  expect((await consentCalls(page)).map(call => call.type)).toEqual(['default']);

  const blocked = await page.context().newPage();
  await blocked.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new Error('Storage unavailable'); },
  }));
  const errors = []; blocked.on('pageerror', error => errors.push(error.message));
  await blocked.goto('/');
  await blocked.getByRole('button', { name: 'Accept all' }).click();
  expect(states((await consentCalls(blocked)).at(-1).state)).toEqual(Array(4).fill('granted'));
  expect(errors).toEqual([]);
  await blocked.close();
});

test('blocked tracking does not stop contact links or count clicks as confirmed calls', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Reject all' }).click();
  await page.evaluate(() => { window.gtag = () => { throw new Error('blocked'); }; });
  const tel = page.locator('a[href="tel:0466224927"]').first();
  await expect(tel).toHaveAttribute('href', 'tel:0466224927');
  await expect(page.locator('#tandaMessengerButton')).toHaveAttribute('href', 'https://m.me/tandaprocleaningservices');
  expect(await page.evaluate(() => dataLayer.some(item => item[1] === 'conversion'))).toBe(false);
  await page.locator('#tandaMessengerButton').dispatchEvent('click');
  expect(await page.evaluate(() => dataLayer.some(item => item[1] === 'messenger_button_clicked'))).toBe(false);
  await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute('href', /mailto:/);
  await tel.dispatchEvent('click');
  expect(errors).toEqual([]);
});

test('quote conversion follows accepted backend lead exactly once', async ({ page }) => {
  let accepted = false;
  let postCount = 0;
  await page.route('**/api/leads', async route => {
    postCount += 1;
    if (!accepted) return route.fulfill({ status: 503, json: { error: 'Isolated test failure.' } });
    const payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: {
      ...pricing.calculateEstimate({ ...payload, addressVerified: false }),
      customerScope: pricing.buildServiceScope(payload),
      deliveryStatus: { email: 'Sent to in-memory test only' },
    } });
  });
  await page.goto('/index.html?service=window-cleaning#quote');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.locator('#quoteForm button[type="submit"]').click();
  expect(postCount).toBe(0);
  expect(await adConversions(page)).toBe(0);
  await page.locator('#firstName').fill('Synthetic QA');
  await page.locator('#phone').fill('0400000000');
  await page.locator('#email').fill('qa@example.invalid');
  await page.locator('#address').fill('test');
  await page.locator('#propertyType').selectOption('Residential');
  await page.locator('#storeys').selectOption('1');
  await page.getByRole('button', { name: 'Choose one or more job types', exact: true }).click();
  await page.getByLabel(pricing.getItem('window_standard_both').label, { exact: true }).check();
  await page.getByRole('button', { name: /Done/ }).filter({ visible: true }).click();
  await page.locator('#scopeQuantity').fill('10');
  await page.locator('[name="agree"]').check();
  await page.locator('#quoteForm button[type="submit"]').click();
  await expect(page.locator('#formMessage')).toContainText('Isolated test failure');
  expect(await adConversions(page)).toBe(0);
  accepted = true;
  await page.locator('#quoteForm button[type="submit"]').click();
  await expect(page.locator('#formMessage')).toContainText('has been sent');
  expect(await adConversions(page)).toBe(1);
  await page.locator('#quoteForm button[type="submit"]').click();
  await expect.poll(() => postCount).toBe(3);
  expect(await adConversions(page)).toBe(1);
});

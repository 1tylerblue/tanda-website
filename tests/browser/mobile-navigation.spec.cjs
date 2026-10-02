const { test, expect } = require('@playwright/test');

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const request = route.request();
    return request.method() === 'GET' && new URL(request.url()).hostname === '127.0.0.1'
      ? route.continue() : route.abort();
  });
});

async function visit(page, { width = 390, height = 844, path = '/', consent = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.goto(path);
  if (consent) {
    const deny = page.getByRole('button', { name: 'Deny Analytics', exact: true });
    if (await deny.isVisible()) await deny.click();
  }
}

async function openMenu(page) {
  const toggle = page.locator('[data-nav-toggle]');
  await clickVisibleControl(page, toggle);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-nav-panel]')).toBeVisible();
  await expect(page.locator('[data-nav-panel]')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('[data-nav-panel]')).toHaveAttribute('aria-modal', 'true');
}

// A pointer on the already-visible sticky header must not invoke the browser
// automation's scrollIntoView step, which changes the page position first.
async function clickVisibleControl(page, locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(await locator.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), point)).toBe(true);
  await page.mouse.click(point.x, point.y);
}

async function settleLayout(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
}

async function expectClosed(page) {
  await expect(page.locator('[data-nav-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-nav-panel]')).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(/site-menu-open/);
}

for (const width of [320, 390, 768, 1024]) {
  test(`mobile navigation fits, groups destinations and contains keyboard focus at ${width}`, async ({ page }) => {
    await visit(page, { width });
    const header = await page.locator('.site-header').boundingBox();
    const toggle = await page.locator('[data-nav-toggle]').boundingBox();
    expect(header.height).toBeLessThanOrEqual(76);
    expect(toggle.width).toBeGreaterThanOrEqual(44);
    expect(toggle.height).toBeGreaterThanOrEqual(44);
    const mainTop = await page.locator('main').evaluate(element => element.getBoundingClientRect().top);
    await openMenu(page);
    expect(await page.locator('main').evaluate(element => element.getBoundingClientRect().top)).toBeCloseTo(mainTop, 0);
    const navigation = page.locator('[data-nav]');
    for (const label of ['Home', 'Services', 'Gallery', 'Reviews', 'About', 'Contact', 'Property Care Plans', 'Giveaway', 'Referral Rewards', 'Get a Quote', 'Call Now']) {
      const link = label === 'Call Now' ? navigation.locator('a.nav-call') : navigation.getByRole('link', { name: label, exact: true });
      await expect(link).toHaveCount(1);
      const box = await link.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
    await expect(navigation.getByRole('link', { name: 'Quote', exact: true })).toHaveCount(0);
    await expect(navigation.locator('a.nav-call')).toHaveText('Call Now');
    await expect(navigation.locator('a.nav-call')).toHaveAttribute('href', 'tel:0466224927');
    for (let index = 0; index < 30; index++) {
      expect(await page.evaluate(() => document.querySelector('[data-nav-panel]').contains(document.activeElement))).toBe(true);
      await page.keyboard.press(index < 15 ? 'Tab' : 'Shift+Tab');
    }
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(page.locator('[data-nav-toggle]')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('[data-nav-panel]').contains(document.activeElement))).toBe(false);
  });
}

test('dismissal restores scroll, backdrop works and Messenger returns', async ({ page }) => {
  await visit(page, { height: 1000 });
  await settleLayout(page);
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  const originalScroll = await page.evaluate(() => scrollY);
  await openMenu(page);
  await expect(page.locator('#tandaMessengerButton')).toBeHidden();
  const lockedScroll = await page.evaluate(() => scrollY);
  await page.mouse.move(2, 998);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => scrollY)).toBe(lockedScroll);
  await clickVisibleControl(page, page.locator('[data-nav-close]'));
  await expectClosed(page);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(originalScroll, 0);
  await expect(page.locator('[data-nav-toggle]')).toBeFocused();
  await expect(page.locator('#tandaMessengerButton')).toBeVisible();
  await openMenu(page);
  const backdrop = page.locator('[data-nav-backdrop]');
  const box = await backdrop.boundingBox();
  await backdrop.click({ position: { x: 1, y: box.height - 1 } });
  await expectClosed(page);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(originalScroll, 0);
});

test('section selection unlocks before navigation and does not restore the old position', async ({ page }) => {
  await visit(page);
  await settleLayout(page);
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await openMenu(page);
  await page.locator('[data-nav]').getByRole('link', { name: 'Services', exact: true }).click();
  await expectClosed(page);
  await expect(page).toHaveURL(/#services$/);
  await page.waitForTimeout(250);
  const location = await page.evaluate(() => {
    const target = document.querySelector('#services');
    return { top: target.getBoundingClientRect().top, headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom, focused: target.contains(document.activeElement) };
  });
  expect(location.top).toBeGreaterThanOrEqual(location.headerBottom - 2);
  expect(location.top).toBeLessThan(location.headerBottom + 100);
  expect(location.focused).toBe(true);
});

test('nested-page navigation resolves to the home section and subscription builder', async ({ page }) => {
  await visit(page, { path: '/services/window-cleaning-gold-coast.html' });
  await openMenu(page);
  const navigation = page.locator('[data-nav]');
  const destinations = await navigation.evaluate(element => [...element.querySelectorAll('a')].map(link => ({ text: link.textContent.trim(), href: link.href })));
  expect(destinations.find(link => link.text === 'Property Care Plans').href).toMatch(/\/subscription-builder\.html(?:#.*)?$/);
  expect(destinations.find(link => link.text === 'Services').href).toMatch(/\/index\.html#services$/);
  await navigation.getByRole('link', { name: 'Services', exact: true }).click();
  await expect(page).toHaveURL(/\/index\.html#services$/);
  await expectClosed(page);
  expect(await page.locator('#services').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
});

for (const scenario of [
  { name: 'short phone', width: 390, height: 420 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'enlarged text', width: 390, height: 844, enlarged: true },
]) {
  test(`menu stays usable on ${scenario.name}`, async ({ page }) => {
    await visit(page, scenario);
    if (scenario.enlarged) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await openMenu(page);
    const panel = await page.locator('[data-nav-panel]').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(scenario.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('[data-nav-panel]').evaluate(panel => {
      for (const element of [panel, ...panel.querySelectorAll('*')]) {
        if (/auto|scroll/.test(getComputedStyle(element).overflowY)) element.scrollTop = element.scrollHeight;
      }
    });
    const close = await page.locator('[data-nav-close]').boundingBox();
    expect(close.y).toBeGreaterThanOrEqual(0);
    expect(close.y + close.height).toBeLessThanOrEqual(scenario.height + 1);
    await page.locator('[data-nav-close]').click();
    await expectClosed(page);
  });
}

test('desktop resize clears overlay locks and focus restrictions', async ({ page }) => {
  await visit(page);
  await settleLayout(page);
  await page.evaluate(() => scrollTo({ top: 800, behavior: 'instant' }));
  await openMenu(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('html')).not.toHaveClass(/site-menu-open/);
  await expect(page.locator('[data-nav]')).toBeVisible();
  await expect(page.locator('[data-nav-toggle]')).toBeHidden();
  expect(await page.evaluate(() => {
    const focused = document.activeElement;
    const rect = focused.getBoundingClientRect();
    return document.querySelector('[data-nav]').contains(focused) && rect.width > 0 && rect.height > 0 && getComputedStyle(focused).visibility !== 'hidden';
  })).toBe(true);
  expect(await page.locator('main').evaluate(element => element.inert)).toBe(false);
  expect(await page.locator('[data-nav-panel]').evaluate(element => element.inert)).toBe(false);
  await page.evaluate(() => scrollTo({ top: 1200, behavior: 'instant' }));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1100);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectClosed(page);
});

test('menu temporarily suspends cookie controls without recording a consent choice', async ({ page }) => {
  await visit(page, { consent: false });
  const cookies = page.locator('#cookie-consent');
  await expect(cookies).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tac_cookie_consent_v1'))).toBeNull();
  await openMenu(page);
  await expect(cookies).toBeHidden();
  await page.keyboard.press('Escape');
  await expectClosed(page);
  await expect(cookies).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tac_cookie_consent_v1'))).toBeNull();
  await page.getByRole('button', { name: 'Deny Analytics', exact: true }).click();
  await expect(cookies).toBeHidden();
});

test('all twelve service-card quote links preselect their own current service group', async ({ page }) => {
  test.setTimeout(180000);
  await visit(page);
  const expected = ['window-cleaning', 'pressure-cleaning', 'house-building-washing', 'roof-cleaning', 'gutter-cleaning', 'solar-panel-cleaning', 'tile-grout-cleaning', 'carpet-cleaning', 'upholstery-cleaning', 'pressure-cleaning', 'builders-cleaning', 'commercial-additions'];
  const links = await page.locator('#services .service-card a').evaluateAll(elements => elements.map(link => link.href));
  expect(links).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index++) {
    const url = new URL(links[index]);
    expect(url.searchParams.get('service')).toBe(expected[index]);
    expect(url.hash).toBe('#quote');
    await page.goto(links[index], { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#service')).toHaveValue(expected[index]);
    await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '1');
  }
});

test('mobile disclosures preserve user choice on keyboard-height changes and reset across layout breakpoints', async ({ page }) => {
  await visit(page);
  const details = page.locator('[data-mobile-disclosure]');
  await expect.poll(() => details.evaluateAll(elements => elements.every(element => !element.open))).toBe(true);
  const plan = page.locator('.package-inclusions').first();
  await plan.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(plan).toHaveAttribute('open', '');
  await page.setViewportSize({ width: 390, height: 450 });
  await expect(plan).toHaveAttribute('open', '');
  await page.setViewportSize({ width: 1440, height: 844 });
  await expect.poll(() => details.evaluateAll(elements => elements.every(element => element.open))).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => details.evaluateAll(elements => elements.every(element => !element.open))).toBe(true);
  const counter = page.locator('[data-before-after-counter]');
  await expect(counter).toHaveText('1 / 6');
  await page.locator('[data-before-after-next]').focus(); await page.keyboard.press('Enter');
  await expect(counter).toHaveText('2 / 6');
  await page.locator('[data-before-after-prev]').focus(); await page.keyboard.press('Enter');
  await expect(counter).toHaveText('1 / 6');
});

test('a first tap on Continue works while the address field starts a delayed lookup', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/api/travel-distance?**', async route => {
    await held;
    await route.fulfill({ json: { addressVerified: false, distanceKm: null, travelBand: 'unverified', travelFeeIncGst: 0, travelStatus: 'requires address confirmation' } });
  });
  try {
    await visit(page, { path: '/index.html?service=window-cleaning#quote' });
    await settleLayout(page);
    for (const [id, value] of Object.entries({ firstName: 'Synthetic Mobile QA', phone: '0400000000', email: 'mobile@example.invalid' })) await page.locator('#' + id).fill(value);
    await page.locator('#propertyType').selectOption('Residential');
    await page.locator('#storeys').selectOption('1');
    const next = page.locator('[data-mobile-quote-next="2"]');
    await next.scrollIntoViewIfNeeded();
    await page.locator('#address').fill('Brisbane QLD 4000');
    await next.scrollIntoViewIfNeeded();
    const box = await next.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    release();
    await expect(page.locator('[data-travel-status]')).toHaveAttribute('data-state', 'error');
    await page.mouse.up();
    await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '2');
    await expect(page.locator('#travelFeeIncGst')).toHaveValue('0');
  } finally { release(); }
});

test('keyboard Continue keeps validation and advances once required details are present', async ({ page }) => {
  await page.route('**/api/travel-distance?**', route => route.fulfill({ json: { addressVerified: false, distanceKm: null, travelBand: 'unverified', travelFeeIncGst: 0 } }));
  await visit(page, { path: '/index.html?service=window-cleaning#quote' });
  const next = page.locator('[data-mobile-quote-next="2"]');
  await next.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '1');
  for (const [id, value] of Object.entries({ firstName: 'Synthetic Keyboard QA', phone: '0400000000', email: 'keyboard@example.invalid', address: 'Brisbane QLD 4000' })) await page.locator('#' + id).fill(value);
  await page.locator('#propertyType').selectOption('Residential');
  await page.locator('#storeys').selectOption('1');
  await next.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '2');
});

test('dragging away from Continue cancels activation and a later deliberate tap still works', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/api/travel-distance?**', async route => {
    await held;
    await route.fulfill({ json: { addressVerified: false, distanceKm: null, travelBand: 'unverified', travelFeeIncGst: 0 } });
  });
  try {
    await visit(page, { path: '/index.html?service=window-cleaning#quote' });
    await settleLayout(page);
    for (const [id, value] of Object.entries({ firstName: 'Synthetic Drag QA', phone: '0400000000', email: 'drag@example.invalid' })) await page.locator('#' + id).fill(value);
    await page.locator('#propertyType').selectOption('Residential');
    await page.locator('#storeys').selectOption('1');
    await page.locator('#address').fill('Brisbane QLD 4000');
    const next = page.locator('[data-mobile-quote-next="2"]');
    await next.scrollIntoViewIfNeeded();
    const box = await next.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(2, 90, { steps: 5 }); await page.mouse.up();
    await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '1');
    await next.scrollIntoViewIfNeeded();
    await clickVisibleControl(page, next);
    await expect(page.locator('#quoteForm')).toHaveAttribute('data-mobile-step', '2');
  } finally { release(); }
});

test('Call Now closes the mobile menu and leaves focus visible without launching a phone action', async ({ page }) => {
  await visit(page);
  await page.evaluate(() => {
    document.addEventListener('click', event => {
      if (event.target.closest('a[href^="tel:"]')) event.preventDefault();
    }, true);
  });
  await openMenu(page);
  const call = page.locator('[data-nav] a.nav-call');
  await expect(call).toHaveAttribute('href', 'tel:0466224927');
  await clickVisibleControl(page, call);
  await expectClosed(page);
  await expect(page.locator('[data-nav-toggle]')).toBeFocused();
});

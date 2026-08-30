async (page) => {
  const baseUrl = 'http://127.0.0.1:4180';
  const messengerUrl = 'https://m.me/tandaprocleaningservices';
  const accessibleLabel = 'Chat with T&A Pro Cleaning on Messenger';
  const pages = [
    'areas/brisbane.html',
    'areas/gold-coast.html',
    'areas/ipswich.html',
    'areas/logan.html',
    'cleaning-tips.html',
    'gallery.html',
    'giveaway.html',
    'index.html',
    'privacy.html',
    'referrals.html',
    'reviews.html',
    'reviews/index.html',
    'services/carpet-cleaning-gold-coast.html',
    'services/commercial-cleaning-gold-coast.html',
    'services/gutter-cleaning-gold-coast.html',
    'services/house-washing-gold-coast.html',
    'services/pressure-cleaning-gold-coast.html',
    'services/roof-cleaning-gold-coast.html',
    'services/solar-panel-cleaning-gold-coast.html',
    'services/tile-grout-cleaning-gold-coast.html',
    'services/upholstery-cleaning-gold-coast.html',
    'services/window-cleaning-gold-coast.html',
    'subscription-builder.html',
    'terms.html',
  ];

  function intersects(a, b) {
    if (!a || !b || !a.width || !a.height || !b.width || !b.height) return false;
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  let currentCheck = null;
  page.on('console', (message) => {
    if (currentCheck && message.type() === 'error') currentCheck.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!currentCheck || !url.startsWith(baseUrl) || url.includes('/api/analytics-config')) return;
    if (response.status() >= 400) currentCheck.siteFailures.push(`${response.status()} ${url}`);
  });
  await page.route('https://m.me/**', (route) => route.abort());

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');

  async function pageCheck(relative, viewport) {
    currentCheck = { consoleErrors: [], siteFailures: [] };
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/${relative}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(550);

    const data = await page.evaluate(() => {
      const button = document.querySelector('#tandaMessengerButton');
      const label = button?.querySelector('.tanda-messenger-contact__label');
      const cookie = document.querySelector('#cookie-consent');
      const sticky = document.querySelector('.service-quote-sticky:not([hidden])');
      const importantControls = Array.from(document.querySelectorAll(
        'input, select, textarea, button, a.btn, a[href^="tel:"], a[href^="mailto:"], a[href*="#quote"], a[data-service-quote-link], .inner-meta-pill, .service-chip, .service-scope-inline span'
      ));

      function rect(element) {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      }

      function visible(element) {
        if (!element || element.hidden) return false;
        let current = element;
        while (current instanceof HTMLElement) {
          if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
          const style = getComputedStyle(current);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
          current = current.parentElement;
        }
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }

      const buttonRect = rect(button);
      const labelStyle = label ? getComputedStyle(label) : null;
      return {
        finalPath: location.pathname,
        exists: Boolean(button),
        href: button?.href || '',
        target: button?.target || '',
      rel: button?.rel || '',
      aria: button?.getAttribute('aria-label') || '',
      compactPlacement: button?.classList.contains('is-compact-placement') || false,
      touchTarget: buttonRect ? buttonRect.width >= 44 && buttonRect.height >= 44 : false,
      labelVisible: labelStyle ? labelStyle.clip === 'auto' && labelStyle.position !== 'absolute' : false,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        buttonRect,
        cookieRect: rect(cookie),
        stickyRect: rect(sticky),
        visibleControlRects: importantControls
          .filter((element) => element.id !== 'tandaMessengerButton' && !element.closest('#tandaMessengerButton'))
          .filter(visible)
          .map(rect),
      };
    });

    const violations = [];
    if (!data.exists) violations.push('missing button');
    if (data.href !== messengerUrl) violations.push(`bad href ${data.href}`);
    if (data.target !== '_blank') violations.push('target is not _blank');
    if (!/noopener/.test(data.rel) || !/noreferrer/.test(data.rel)) violations.push(`bad rel ${data.rel}`);
    if (data.aria !== accessibleLabel) violations.push(`bad aria ${data.aria}`);
    if (!data.touchTarget) violations.push('touch target under 44px');
    if (viewport.width > 620 && !data.labelVisible && !data.compactPlacement) violations.push('desktop label is not visible');
    if (viewport.width <= 620 && data.labelVisible) violations.push('mobile label is still visible');
    if (data.overflow > 1) violations.push(`horizontal overflow ${data.overflow}px`);
    if (intersects(data.buttonRect, data.cookieRect)) violations.push('overlaps cookie banner');
    if (intersects(data.buttonRect, data.stickyRect)) violations.push('overlaps service sticky quote button');

    const visibleControls = data.visibleControlRects.filter((rect) => rect && rect.bottom > 0 && rect.top < viewport.height);
    if (visibleControls.some((rect) => intersects(data.buttonRect, rect))) {
      violations.push('overlaps a visible form or button control');
    }

    const result = { relative, viewport, finalPath: data.finalPath, ...currentCheck, violations };
    currentCheck = null;
    return result;
  }

  const results = [];
  for (const relative of pages) {
    results.push(await pageCheck(relative, { width: 1280, height: 900 }));
    results.push(await pageCheck(relative, { width: 390, height: 844 }));
  }

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('tac_cookie_consent_v1', JSON.stringify({ state: 'accepted', timestamp: Date.now() }));
  });
  for (const relative of [
    'services/house-washing-gold-coast.html',
    'services/pressure-cleaning-gold-coast.html',
    'services/roof-cleaning-gold-coast.html',
    'services/window-cleaning-gold-coast.html',
  ]) {
    results.push(await pageCheck(`${relative}?accepted-consent`, { width: 1280, height: 900 }));
    results.push(await pageCheck(`${relative}?accepted-consent`, { width: 390, height: 844 }));
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'output/playwright/messenger-home-desktop.png', fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/services/window-cleaning-gold-coast.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'output/playwright/messenger-service-mobile.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'output/playwright/messenger-service-mobile-scrolled.png', fullPage: false });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('tac_cookie_consent_v1', JSON.stringify({ state: 'accepted', timestamp: Date.now() }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(550);
  await page.evaluate(() => {
    window.__messengerEvents = [];
    window.gtag = (command, eventName, properties) => {
      if (command === 'event') window.__messengerEvents.push({ eventName, properties });
    };
  });

  const popupPromise = page.waitForEvent('popup');
  await page.click('#tandaMessengerButton');
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  const popupUrl = popup.url();
  await popup.close().catch(() => {});
  const events = await page.evaluate(() => window.__messengerEvents || []);

  const failures = results.filter((result) => result.violations.length || result.consoleErrors.length || result.siteFailures.length);
  const acceptedMessengerPopup =
    popupUrl === messengerUrl ||
    popupUrl.startsWith('chrome-error://') ||
    /^https:\/\/www\.messenger\.com\//i.test(popupUrl);
  if (!acceptedMessengerPopup) {
    failures.push({
      relative: 'click-check',
      viewport: { width: 1280, height: 900 },
      violations: [`unexpected popup URL ${popupUrl}`],
      consoleErrors: [],
      siteFailures: [],
    });
  }

  const clickEvent = events.find((event) => event.eventName === 'messenger_button_clicked');
  if (!clickEvent) {
    failures.push({
      relative: 'click-check',
      viewport: { width: 1280, height: 900 },
      violations: ['messenger_button_clicked not captured'],
      consoleErrors: [],
      siteFailures: [],
    });
  }

  if (clickEvent && JSON.stringify(clickEvent).match(/@|0400|street|message content/i)) {
    failures.push({
      relative: 'click-check',
      viewport: { width: 1280, height: 900 },
      violations: ['messenger event included sensitive-looking data'],
      consoleErrors: [],
      siteFailures: [],
    });
  }

  const summary = {
    checkedPages: pages.length,
    checks: results.length,
    click: { popupUrl, event: clickEvent },
    screenshots: [
      'output/playwright/messenger-home-desktop.png',
      'output/playwright/messenger-service-mobile.png',
      'output/playwright/messenger-service-mobile-scrolled.png',
    ],
    failures,
  };

  if (failures.length) throw new Error(JSON.stringify(summary, null, 2));
  return summary;
}

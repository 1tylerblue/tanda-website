async (page) => {
  const context = page.context();
  const consoleErrors = [];
  const pageErrors = [];
  let subscriptionRequests = 0;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error && error.message ? error.message : error)));

  const analyticsConfig = {
    enabled: true,
    projectKey: 'phc_secondary_browser_test',
    host: 'http://127.0.0.1:4175',
    uiHost: 'http://127.0.0.1:4175',
    environment: 'test',
    release: 'secondary-browser-qa',
    sessionRecordingEnabled: false,
    heatmapsEnabled: false,
    performanceSampleRate: 0,
    captureInternalTraffic: false,
  };

  await context.route('**/api/analytics-config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(analyticsConfig),
  }));
  await context.route('**/static/1/array.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `(() => {
      const ph = window.posthog;
      const init = ph && ph._i && ph._i[0];
      if (!ph || !init) return;
      window.__qaPostHogEvents = [];
      ph.capture = (event, properties) => window.__qaPostHogEvents.push({ event, properties });
      ph.opt_in_capturing = () => {};
      ph.opt_out_capturing = () => {};
      ph.startSessionRecording = () => {};
      if (init[1] && typeof init[1].loaded === 'function') init[1].loaded(ph);
    })();`,
  }));
  await context.route('**/api/giveaway/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entryCount: 0, entryTarget: 50, unlocked: false, campaignOpen: false }),
  }));
  await context.route('**/api/subscriptions', (route) => {
    subscriptionRequests += 1;
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ analyticsLeadId: '215ad659-c0d8-4419-984f-e8d5fe06fb0e' }),
    });
  });
  for (const pattern of [
    '**://*.google-analytics.com/**',
    '**://*.googlesyndication.com/**',
    '**://*.googletagmanager.com/**',
    '**://googleads.g.doubleclick.net/**',
  ]) {
    await context.route(pattern, (route) => route.fulfill({ status: 204, body: '' }));
  }

  await page.goto('http://127.0.0.1:4175/subscription-builder.html?email=leak@example.com&utm_source=google&utm_campaign=subscription-test');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('tac_cookie_consent_v1', JSON.stringify({ state: 'accepted', timestamp: Date.now() }));
  });
  await page.reload();
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const setValue = (id, value) => {
      const field = document.getElementById(id);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('fullName', 'Subscription Privacy Test');
    setValue('phone', '0499 111 222');
    setValue('email', 'subscription.private@example.com');
    setValue('streetAddress', '99 Private Avenue');
    setValue('suburb', 'Testville');
    setValue('postcode', '4000');
    const gold = document.querySelector('input[name="plan"][value="gold"]');
    gold.checked = true;
    gold.dispatchEvent(new Event('change', { bubbles: true }));
    const optionalService = document.querySelector('[data-role="service-checkbox"]:not(:checked)');
    if (optionalService) {
      optionalService.checked = true;
      optionalService.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.getElementById('subscriptionBuilderForm').requestSubmit();
  });
  await page.waitForTimeout(900);

  const subscriptionResult = await page.evaluate(() => {
    const events = Array.isArray(window.__qaPostHogEvents) ? window.__qaPostHogEvents : [];
    const serializedEvents = JSON.stringify(events).toLowerCase();
    const serializedStorage = JSON.stringify({ ...localStorage, ...sessionStorage }).toLowerCase();
    const probes = [
      'subscription privacy test',
      '0499 111 222',
      'subscription.private@example.com',
      '99 private avenue',
      'leak@example.com',
    ];
    return {
      status: window.TandaAnalytics.getStatus(),
      eventNames: events.map((entry) => entry.event),
      piiEventLeaks: probes.filter((probe) => serializedEvents.includes(probe)),
      piiStorageLeaks: probes.filter((probe) => serializedStorage.includes(probe)),
      message: document.getElementById('builderMessage').textContent,
    };
  });

  const pagePaths = [
    '/index.html',
    '/cleaning-tips.html',
    '/gallery.html',
    '/giveaway.html',
    '/privacy.html',
    '/referrals.html',
    '/subscription-builder.html',
    '/terms.html',
    '/reviews/index.html',
    '/areas/brisbane.html',
    '/areas/gold-coast.html',
    '/areas/ipswich.html',
    '/areas/logan.html',
    '/services/carpet-cleaning-gold-coast.html',
    '/services/commercial-cleaning-gold-coast.html',
    '/services/gutter-cleaning-gold-coast.html',
    '/services/house-washing-gold-coast.html',
    '/services/pressure-cleaning-gold-coast.html',
    '/services/roof-cleaning-gold-coast.html',
    '/services/solar-panel-cleaning-gold-coast.html',
    '/services/tile-grout-cleaning-gold-coast.html',
    '/services/upholstery-cleaning-gold-coast.html',
    '/services/window-cleaning-gold-coast.html',
  ];
  const pages = [];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const pagePath of pagePaths) {
    await page.goto(`http://127.0.0.1:4175${pagePath}`);
    await page.waitForTimeout(220);
    pages.push(await page.evaluate((path) => {
      const events = Array.isArray(window.__qaPostHogEvents) ? window.__qaPostHogEvents : [];
      return {
        path,
        analyticsLoaded: Boolean(window.TandaAnalytics),
        captureStarted: Boolean(window.TandaAnalytics && window.TandaAnalytics.getStatus().captureStarted),
        pageViewCount: events.filter((entry) => entry.event === 'page_viewed').length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    }, pagePath));
  }

  return {
    subscriptionRequests,
    subscriptionResult,
    pagesChecked: pages.length,
    pageFailures: pages.filter((item) => !item.analyticsLoaded || !item.captureStarted || item.pageViewCount !== 1 || item.horizontalOverflow),
    consoleErrors,
    pageErrors,
  };
}

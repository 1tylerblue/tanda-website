'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const BASE = '07e8e60d8b2b748c5a71fd87fe6104b995f84be2';
const normalize = source => source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const read = file => normalize(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const original = file => normalize(execFileSync('git', ['show', BASE + ':' + file], { cwd: ROOT, encoding: 'utf8' }));
const htmlFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', BASE], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(file => file.endsWith('.html'));
const functionBlock = (source, name) => {
  const match = source.match(new RegExp('^  function ' + name + '\\([^\\n]*\\)[^\\n]*\\{[\\s\\S]*?^  }', 'm'));
  assert.ok(match, 'Expected named function: ' + name);
  return match[0];
};
const trackingScripts = html => [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)]
  .map(match => match[0]).filter(block => /googletagmanager|window\.gtag|dataLayer|posthog/i.test(block));
const trackingNoScript = html => [...html.matchAll(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi)]
  .map(match => match[0]).filter(block => /googletagmanager/.test(block));
const attrValues = (html, attribute) => [...html.matchAll(new RegExp('\\b' + attribute + '=["\\\']([^"\\\']*)["\\\']', 'gi'))].map(match => match[1]);

for (const file of htmlFiles) {
  test(file + ': existing GTM/default consent/noscript blocks preserved exactly', () => {
    assert.deepEqual(trackingScripts(read(file)), trackingScripts(original(file)));
    assert.deepEqual(trackingNoScript(read(file)), trackingNoScript(original(file)));
  });
}

test('Google Ads, GA4 and privacy-safe analytics helpers are unchanged', () => {
  const before = original('app.js'), after = read('app.js');
  const names = [
    'ensureGtagFunction', 'getGaMeasurementId', 'applyDefaultConsent', 'ensureGoogleTagScript',
    'loadGoogleAdsTag', 'loadAnalyticsScript', 'setCookieConsentState', 'getCookieConsent',
    'storeCookieConsent', 'trackEvent', 'getTrackingLocation', 'trackFunnelPageView',
    'captureFunnelScrollDepth', 'setupFunnelTracking', 'trackGoogleAdsConversion',
    'trackQuoteSubmittedConversion', 'setupPhoneClickConversionTracking', 'initCookieConsent',
  ];
  for (const name of names) assert.equal(functionBlock(after, name), functionBlock(before, name), name);
  for (const name of ['GA_MEASUREMENT_ID', 'GOOGLE_ADS_CONVERSION_ID', 'GOOGLE_ADS_QUOTE_SEND_TO', 'GOOGLE_ADS_PHONE_CLICK_SEND_TO', 'COOKIE_CONSENT_KEY']) {
    const expression = new RegExp('const ' + name + ' = [^;]+;');
    assert.equal(after.match(expression)?.[0], before.match(expression)?.[0], name);
  }
});

test('all existing telephone links and Messenger destinations/consent/events are preserved', () => {
  assert.equal(read('messenger-button.js'), original('messenger-button.js'));
  for (const file of htmlFiles) {
    const phones = text => attrValues(text, 'href').filter(value => /^tel:/i.test(value));
    assert.deepEqual(phones(read(file)), phones(original(file)), file);
    const messenger = text => attrValues(text, 'src').filter(value => /messenger-button\.js/.test(value));
    assert.deepEqual(messenger(read(file)), messenger(original(file)), file);
  }
});

test('giveaway campaign dates, unlock target and campaign timing logic remain unchanged', () => {
  const before = original('app.js'), after = read('app.js');
  for (const key of ['startsAt', 'endsAt', 'startsLabel', 'endsLabel', 'campaignPeriodLabel', 'entriesCloseLabel', 'unlockEntryTarget']) {
    const expression = new RegExp('\\b' + key + ': [^\\n]+');
    assert.ok(before.match(expression), key);
    assert.equal(after.match(expression)?.[0], before.match(expression)?.[0], key);
  }
  for (const name of ['getGiveawayCampaignPhase', 'isGiveawayCampaignOpen']) assert.equal(functionBlock(after, name), functionBlock(before, name), name);
  const backendBefore = original('backend/src/server.js'), backendAfter = read('backend/src/server.js');
  for (const key of ['GIVEAWAY_THRESHOLD', 'GIVEAWAY_STARTS_AT', 'GIVEAWAY_ENDS_AT']) {
    const expression = new RegExp('const ' + key + ' = [^;]+;');
    assert.equal(backendAfter.match(expression)?.[0], backendBefore.match(expression)?.[0], key);
  }
});

test('all master item numbers, modes, units and explicit flags are identical to production baseline', () => {
  const context = { module: { exports: {} } };
  vm.runInNewContext(original('pricing-engine.js'), context);
  const baseline = JSON.parse(JSON.stringify(context.module.exports.PRICING_CONFIG));
  const current = JSON.parse(JSON.stringify(require('../pricing-engine.js').PRICING_CONFIG));
  const withoutLabels = value => Array.isArray(value) ? value.map(withoutLabels) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'label').map(([key, inner]) => [key, withoutLabels(inner)])) : value;
  assert.deepEqual(withoutLabels(current), withoutLabels(baseline));
});

test('money and shared pricing load before dependent quote/subscription scripts', () => {
  for (const [file, expected] of [
    ['index.html', ['money.js', 'pricing-engine.js', 'app.js']],
    ['subscription-builder.html', ['money.js', 'subscription-pricing.js', 'subscription-builder.js']],
  ]) {
    const scripts = [...read(file).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => ({ source: match[1].split('?')[0], tag: match[0] }));
    const indexes = expected.map(source => scripts.findIndex(script => script.source === source));
    indexes.forEach((position, index) => {
      assert.ok(position >= 0, file + ': missing ' + expected[index]);
      assert.match(scripts[position].tag, /\bdefer\b/);
      if (index > 0) assert.ok(position > indexes[index - 1], file + ': dependency order');
    });
  }
});

test('all local HTML src/href references resolve to repository files', () => {
  const missing = [];
  for (const file of htmlFiles) {
    for (const target of [...attrValues(read(file), 'src'), ...attrValues(read(file), 'href')]) {
      if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
      const pathname = decodeURIComponent(target.split(/[?#]/)[0]);
      if (!pathname) continue;
      const resolved = pathname.startsWith('/') ? path.join(ROOT, pathname.slice(1)) : path.resolve(ROOT, path.dirname(file), pathname);
      if (!fs.existsSync(resolved)) missing.push(file + ' -> ' + target);
    }
  }
  assert.deepEqual(missing, []);
});

test('production API endpoint and unrelated review/gallery integrations retain their source', () => {
  const before = original('app.js'), after = read('app.js');
  assert.equal(functionBlock(after, 'getApiBase'), functionBlock(before, 'getApiBase'));
  for (const file of ['gallery.js', 'reviews.js']) assert.equal(read(file), original(file), file);
  for (const file of ['index.html', 'subscription-builder.html']) {
    const endpoint = /window\.__API_BASE__\s*=\s*[^;]+;/;
    assert.equal(read(file).match(endpoint)?.[0], original(file).match(endpoint)?.[0], file);
  }
});


test('email transport, webhook fallback, recipients, attachments and dispatch functions remain unchanged', () => {
  const withoutQuoteText = source => source.replace(/^(?:export )?function buildLeadText\([^\n]*\)[^\n]*\{[\s\S]*?^}/m, '/* Pricing email text is validated by backend regression tests. */');
  assert.equal(withoutQuoteText(read('backend/src/mailer.js')), withoutQuoteText(original('backend/src/mailer.js')));
});

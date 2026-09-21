import { createHash } from 'node:crypto';
import subscriptionPricing from '../../subscription-pricing.js';
import giveawayPolicy from '../../giveaway-policy.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import pricingEngine from '../../pricing-engine.js';
import { estimateLead, generateAISummary, generateServiceScope, scoreLeadQuality } from '../src/ai.js';
import { buildLeadText } from '../src/mailer.js';
import { determineTravelPricing } from '../src/travel.js';

test('master price list contains all configured service groups', () => {
  assert.equal(pricingEngine.PRICING_CONFIG.groups.length, 19);
});

test('standard service estimate includes GST once', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'pressure_concrete', quantity: 50 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.recommendedEstimate, 262.5);
  assert.equal(estimate.recommendedEstimateIncGst, 288.75);
});

test('two-service estimates receive the configured bundle discount', () => {
  const estimate = estimateLead({
    lineItems: [
      { code: 'window_package_single', quantity: 1 },
      { code: 'gutter_package_single', quantity: 1 },
    ],
    travelBand: 'within50',
  });
  assert.equal(estimate.recommendedEstimate, 534.37);
});

test('travel above 50 kilometres adds exactly 50 dollars including GST', () => {
  assert.deepEqual(determineTravelPricing(50.1), {
    distanceKm: 50.1,
    travelBand: 'beyond50',
    travelFeeIncGst: 50,
    feeApplied: true,
    thresholdKm: 50,
  });
});

test('manual access conditions require team review', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'window_package_complex', quantity: 1 }],
    accessDifficulty: 'specialist',
    conditionLevel: 'unclear',
  });
  assert.equal(estimate.manualReviewRequired, true);
  assert.equal(estimate.recommendedEstimateLabel, 'Inspection required');
});

test('window scope itemises glass, frames, sills, screens and tracks', () => {
  const scope = generateServiceScope({
    lineItems: [{ code: 'window_package_single', quantity: 1 }],
    serviceArea: 'Both',
  }).join(' ');
  assert.match(scope, /Interior and exterior window glass cleaned/);
  assert.match(scope, /frames and sills detailed/);
  assert.match(scope, /fly screens and screen doors cleaned/);
  assert.match(scope, /window and door tracks cleaned/);
});

test('pool-fence glass is named when selected', () => {
  const scope = generateServiceScope({
    lineItems: [
      { code: 'window_standard_exterior', quantity: 8 },
      { code: 'window_balustrade', quantity: 6 },
    ],
    serviceArea: 'Exterior',
  }).join(' ');
  assert.match(scope, /pool-fence and glass-balustrade panels cleaned/);
});

test('service scope is regenerated from priced selections', () => {
  const scope = generateServiceScope({
    customerScope: ['Untrusted browser wording'],
    lineItems: [{ code: 'pressure_concrete', quantity: 40 }],
    serviceArea: 'Exterior',
  });
  assert.equal(scope.some((item) => item.includes('Untrusted browser wording')), false);
  assert.equal(scope.some((item) => item.includes('Concrete pressure cleaning')), true);
});

const inspectionLabel = 'Large roof — inspection required';
const priceKeys = ['estimateMin', 'estimateMax', 'estimateMinIncGst', 'estimateMaxIncGst', 'recommendedEstimate', 'recommendedEstimateIncGst'];
const clone = (value) => JSON.parse(JSON.stringify(value));
class CampaignDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-09-11T00:00:00+10:00'])); }
  static now() { return new CampaignDate().getTime(); }
}

// Run the actual browser functions without starting analytics, forms or network requests.
function browserFunctions() {
  const context = vm.createContext({
    window: { TAPricing: pricingEngine, location: { protocol: 'https:', hostname: 'example.invalid', port: '' } }, Date: CampaignDate,
    document: { documentElement: { classList: { add() {} } }, readyState: 'loading', addEventListener() {} },
  });
  const source = fs.readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `globalThis.subject = { buildBasePayload, collectPricingLineItems, estimateLeadSmart, normalizeApiResult, normalizePricingQuantity, isGiveawayValueEligible, getGiveawayCampaignPhase, renderCalculationBreakdown }; })();`), context);
  return { context, ...context.subject };
}

// Exercise the real server route with storage and delivery replaced by in-memory sinks.
// No listener, filesystem write, email transport, notification or network call is started.
function isolatedLeadRoute() {
  const routes = new Map();
  const files = new Map();
  const state = { leads: [], emails: [] };
  const app = { set() {}, use() {}, get(url, ...handlers) { routes.set(url, handlers.at(-1)); }, listen() {}, post(url, ...handlers) { routes.set(url, handlers.at(-1)); } };
  const express = Object.assign(() => app, { json() {} });
  const context = vm.createContext({
    express, cors() {}, path, Date: CampaignDate, console, createHash, pricingEngine, subscriptionPricing, giveawayPolicy,
    process: { env: {}, cwd: () => '/isolated-test' },
    fs: { existsSync: (file) => files.has(file), mkdirSync() {}, writeFileSync: (file, data) => files.set(file, data), readFileSync: (file) => files.get(file) },
    readLeads: () => clone(state.leads), writeLeads: (leads) => { state.leads = clone(leads); },
    estimateLead, generateAISummary, generateServiceScope, scoreLeadQuality,
    getCachedTravelPricing: () => ({ travelBand: 'within50', distanceKm: 1, travelFeeIncGst: 0 }),
    sendSubscriptionEmail: async (lead) => { state.emails.push(JSON.stringify(lead)); return { sent: true }; },
    sendLeadEmail: async (lead) => { state.emails.push(buildLeadText(lead)); return { sent: true, message: 'In-memory test sink' }; },
  });
  const source = fs.readFileSync(new URL('../src/server.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(source, context);
  return {
    state,
    async submit(body, expectedStatus = 201, endpoint = '/api/leads') {
      let result;
      const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { result = clone(value); } };
      await routes.get(endpoint)({ body }, response);
      assert.equal(response.statusCode, expectedStatus, JSON.stringify(result));
      return result;
    },
  };
}

function leadInput(code, quantity) {
  return {
    firstName: 'Regression', phone: '0400000000', email: 'regression@example.invalid', address: 'Synthetic test address',
    service: code.startsWith('roof_') ? 'Roof Cleaning' : 'Pressure Washing',
    serviceGroup: code.startsWith('roof_') ? 'roof-cleaning' : 'pressure-cleaning',
    pricingItemCode: code, lineItems: [{ code, quantity }], scopeQuantity: quantity, scopeUnit: 'square-metres',
    propertyType: 'house', storeys: '1', serviceArea: 'Exterior', conditionLevel: 'standard', accessDifficulty: 'ground',
    travelBand: 'within50', agree: true, formElapsedMs: 5000,
  };
}

for (const [exGst, incGst, eligible] of [[449.99, 494.99, false], [450, 495, true], [450.01, 495.01, true]]) {
  test(`giveaway uses ${incGst.toFixed(2)} including GST across browser, server, saved lead and email`, async () => {
    const input = leadInput('pressure_pavers', (exGst === 449.99 ? 599.99 : exGst === 450 ? 600 : 600.01) / 7.5);
    const browser = browserFunctions();
    const front = browser.estimateLeadSmart(input);
    assert.equal(front.recommendedEstimateIncGst, incGst);
    assert.equal(front.eligibleForGiveaway, eligible);
    assert.equal(pricingEngine.isGiveawayValueEligible(incGst), eligible);
    assert.equal(browser.isGiveawayValueEligible(incGst), eligible);
    assert.equal(estimateLead(input).recommendedEstimate, exGst);
    const route = isolatedLeadRoute();
    const response = await route.submit({ ...input, eligibleForGiveaway: !eligible });
    assert.equal(response.eligibleForGiveaway, eligible);
    assert.equal(route.state.leads[0].eligibleForGiveaway, eligible);
    assert.equal(route.state.leads[0].recommendedEstimateIncGst, incGst);
    assert.match(route.state.emails[0], new RegExp(`Giveaway eligible: ${eligible ? 'Yes' : 'No'}`));
    assert.match(route.state.emails[0], /Minimum eligible job value: \$495 including GST, subject to review\./);
  });
}

for (const area of [149, 150, 150.1, 151, 400]) {
  test(`${area} m² roof retains its full quantity through browser, backend, storage and email`, async () => {
    const input = leadInput('roof_concrete_single', area);
    const browser = browserFunctions();
    assert.equal(browser.normalizePricingQuantity(input.pricingItemCode, String(area)), area);
    const form = { querySelector(selector) { return { value: selector === '#pricingItemCode' ? input.pricingItemCode : String(area) }; }, querySelectorAll() { return []; } };
    assert.equal(browser.collectPricingLineItems(form)[0].quantity, area);
    const estimate = browser.estimateLeadSmart(input);
    assert.deepEqual(clone(estimate), clone(estimateLead(input)));
    assert.equal(estimate.calculationBreakdown.lines[0].quantity, area);
    const route = isolatedLeadRoute();
    const response = await route.submit({ ...input, recommendedEstimate: 1, eligibleForGiveaway: true });
    const saved = route.state.leads[0];
    assert.equal(saved.scopeQuantity, area);
    assert.equal(saved.lineItems[0].quantity, area);
    assert.match(saved.customerScope.join(' '), new RegExp(`${area} m2`));
    assert.match(route.state.emails[0], new RegExp(`${area} m2`));
    if (area <= 150) {
      assert.equal(estimate.calculationBreakdown.normalExGst, area * 10.5);
      assert.equal(estimate.manualReviewRequired, false);
    } else {
      for (const result of [estimate, response, saved, browser.normalizeApiResult(response, estimate), browser.normalizeApiResult({ recommendedEstimate: 1575, recommendedEstimateLabel: '$1,732.50 incl. GST' }, estimate)]) {
        for (const key of priceKeys) assert.equal(result[key], null, key);
        assert.equal(result.automaticPricingUnavailable, true);
        assert.equal(result.manualReviewRequired, true);
        assert.equal(result.recommendedEstimateLabel, inspectionLabel);
        assert.equal(result.eligibleForGiveaway, false);
        for (const key of ['subtotalExGst', 'gst', 'totalIncGst']) assert.equal(result.calculationBreakdown[key], null);
      }
      assert.doesNotMatch(route.state.emails[0], /Subtotal ex GST:|Total incl\. GST:|\- GST:|@ .* ex GST/);
      assert.match(route.state.emails[0], /Large roof — inspection required/);
      assert.match(saved.aiSummary, new RegExp(`${area} m2`));
    }
  });
}

test('all area-based roof jobs and additional roof selections require inspection above 150 m²', () => {
  const roofItems = pricingEngine.getItemsForGroup('roof-cleaning').filter((item) => item.unit === 'square-metres');
  for (const item of roofItems) {
    for (const area of [151, 400]) {
      const estimate = estimateLead({ lineItems: [{ code: 'window_package_single', quantity: 1 }, { code: item.code, quantity: area }] });
      assert.equal(estimate.recommendedEstimate, null);
      assert.equal(estimate.calculationBreakdown.lines[1].quantity, area);
    }
  }
});

test('single-item payload fallback preserves a 400 m² roof and requires inspection', () => {
  const input = { ...leadInput('roof_concrete_single', 400), lineItems: [] };
  assert.equal(estimateLead(input).recommendedEstimate, null);
  assert.match(generateServiceScope(input).join(' '), /400 m2/);
});

test('invalid server quantities rejected before storage or email', async () => {
  for (const quantity of [-1, 0, 2.5, 10001]) {
    const route = isolatedLeadRoute();
    await route.submit(leadInput('carpet_standard_bedroom', quantity), 400);
    assert.equal(route.state.leads.length, 0); assert.equal(route.state.emails.length, 0);
  }
});
test('quote retry reuses saved lead and sends one email', async () => {
  const route = isolatedLeadRoute();
  const body = { ...leadInput('window_package_single', 1), idempotencyKey: 'synthetic-submission-1234' };
  const first = await route.submit(body);
  const retry = await route.submit({...body, formElapsedMs: 8000, clientSubmittedAt: 'later'}, 200);
  assert.equal(retry.lead.id, first.lead.id);
  assert.equal(route.state.leads.length, 1); assert.equal(route.state.emails.length, 1);
  await route.submit({...body, notes:'changed'}, 409);
});
test('subscription server recalculates altered client totals and retries safely', async () => {
  const route=isolatedLeadRoute();
  const body={ idempotencyKey:'synthetic-subscription-1234', pricingInput:{planKey:'bronze',propertyType:'house'},
    customer:{fullName:'Synthetic Test',phone:'0400000000',email:'test@example.invalid'}, property:{address:'Synthetic',suburb:'Test',postcode:'4216'},
    plan:{selectedPlan:'Platinum',firstCleanPrice:1,recurringMonthlyPrice:1}, giveaway:{eligibilityStatus:'paid'} };
  const response=await route.submit(body,201,'/api/subscriptions');
  assert.equal(response.subscription.plan.firstCleanPrice,539.1);
  assert.equal(response.subscription.plan.recurringMonthlyPrice,359.1);
  assert.equal(response.subscription.giveaway.eligibilityStatus,'pending_payment_and_review');
  const retry=await route.submit(body,200,'/api/subscriptions');
  assert.equal(retry.subscription.id,response.subscription.id);assert.equal(route.state.emails.length,1);
  await route.submit({...body,idempotencyKey:'synthetic-subscription-other',pricingInput:{planKey:'bogus',propertyType:'house'}},400,'/api/subscriptions');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import pricingEngine from '../../pricing-engine.js';
import { estimateLead, generateServiceScope } from '../src/ai.js';
import { determineTravelPricing } from '../src/travel.js';

test('master price list contains all configured service groups', () => {
  assert.equal(pricingEngine.PRICING_CONFIG.groups.length, 19);
});

test('standard service estimate includes GST once', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'pressure_concrete', quantity: 50 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.recommendedEstimate, 350);
  assert.equal(estimate.recommendedEstimateIncGst, 385);
});

test('two-service estimates receive the configured bundle discount', () => {
  const estimate = estimateLead({
    lineItems: [
      { code: 'window_package_single', quantity: 1 },
      { code: 'gutter_package_single', quantity: 1 },
    ],
    travelBand: 'within50',
  });
  assert.equal(estimate.recommendedEstimate, 760);
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

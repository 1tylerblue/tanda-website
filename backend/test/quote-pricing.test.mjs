import assert from 'node:assert/strict';
import test from 'node:test';
import pricingEngine from '../../pricing-engine.js';
import { estimateLead, generateServiceScope } from '../src/ai.js';
import { getGiveawayEligibility } from '../src/giveaway.js';
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

test('$494.99 including GST is below the giveaway minimum', () => {
  const eligibility = getGiveawayEligibility(494.99, true);
  assert.equal(eligibility.totalIncludingGstCents, 49499);
  assert.equal(eligibility.eligible, false);
});

test('$495.00 including GST is giveaway eligible', () => {
  const eligibility = getGiveawayEligibility(495, true);
  assert.equal(eligibility.totalIncludingGstCents, 49500);
  assert.equal(eligibility.eligible, true);
});

test('$495.01 including GST is giveaway eligible', () => {
  const eligibility = getGiveawayEligibility(495.01, true);
  assert.equal(eligibility.totalIncludingGstCents, 49501);
  assert.equal(eligibility.eligible, true);
});

test('$495 window package regression is eligible using the including-GST total', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'window_package_single', quantity: 1 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.recommendedEstimate, 450);
  assert.equal(estimate.recommendedEstimateIncGst, 495);
  assert.equal(estimate.eligibleForGiveaway, true);
});

test('149 m2 roof is priced using the full submitted area', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'roof_concrete_single', quantity: 149 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.largeRoofInspectionRequired, undefined);
  assert.equal(estimate.calculationBreakdown.lines[0].quantity, 149);
  assert.equal(estimate.calculationBreakdown.lines[0].subtotalExGst, 1564.5);
  assert.equal(estimate.recommendedEstimate, 1564.5);
});

test('150 m2 roof is priced using the full supported maximum', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'roof_concrete_single', quantity: 150 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.largeRoofInspectionRequired, undefined);
  assert.equal(estimate.calculationBreakdown.lines[0].quantity, 150);
  assert.equal(estimate.calculationBreakdown.lines[0].subtotalExGst, 1575);
  assert.equal(estimate.recommendedEstimate, 1575);
});

test('151 m2 roof preserves the full area and requires inspection without a partial price', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'roof_concrete_single', quantity: 151 }],
    travelBand: 'within50',
  });
  assert.equal(estimate.largeRoofInspectionRequired, true);
  assert.equal(estimate.submittedRoofArea, 151);
  assert.equal(estimate.recommendedEstimate, null);
  assert.equal(estimate.recommendedEstimateIncGst, null);
  assert.equal(estimate.calculationBreakdown.lines[0].quantity, 151);
  assert.equal(estimate.calculationBreakdown.lines[0].pricedQuantity, null);
  assert.equal(estimate.calculationBreakdown.lines[0].subtotalExGst, null);
});

test('400 m2 roof cannot be replaced with or priced as 150 m2', () => {
  const estimate = estimateLead({
    lineItems: [{ code: 'roof_concrete_single', quantity: 400 }],
    scopeQuantity: 400,
    scopeUnit: 'square-metres',
    travelBand: 'within50',
  });
  const scope = generateServiceScope({
    lineItems: [{ code: 'roof_concrete_single', quantity: 400 }],
    scopeQuantity: 400,
    scopeUnit: 'square-metres',
  }).join(' ');

  assert.equal(estimate.largeRoofInspectionRequired, true);
  assert.equal(estimate.submittedRoofArea, 400);
  assert.equal(estimate.maximumAutomatedRoofArea, 150);
  assert.equal(estimate.recommendedEstimate, null);
  assert.equal(estimate.calculationBreakdown.totalIncGst, null);
  assert.equal(estimate.calculationBreakdown.lines[0].quantity, 400);
  assert.equal(estimate.calculationBreakdown.lines[0].submittedQuantity, 400);
  assert.equal(estimate.calculationBreakdown.lines[0].pricedQuantity, null);
  assert.notEqual(estimate.calculationBreakdown.lines[0].quantity, 150);
  assert.match(scope, /400 m2 roof area received/);
});

test('owner email preserves a 400 m2 roof and does not present partial pricing', () => {
  const input = {
    lineItems: [{ code: 'roof_concrete_single', quantity: 400 }],
    scopeQuantity: 400,
    scopeUnit: 'square-metres',
    travelBand: 'within50',
  };
  const estimate = estimateLead(input);
  const emailText = buildLeadText({
    ...input,
    ...estimate,
    customerScope: generateServiceScope(input),
    giveawayEligibility: getGiveawayEligibility(estimate.recommendedEstimateIncGst, true),
    eligibleForGiveaway: false,
  });

  assert.match(emailText, /Measured quantity: 400 square-metres/);
  assert.match(emailText, /Full submitted roof area: 400 m2/);
  assert.match(emailText, /not automatically priced; inspection required/);
  assert.match(emailText, /No automated price issued - large roof inspection required/);
  assert.match(emailText, /Minimum eligible job value: \$495 including GST, subject to review\./);
  assert.doesNotMatch(emailText, /Priced line items: 150 /);
});

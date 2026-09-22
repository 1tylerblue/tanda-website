'use strict';
// Offline business regressions: no network, browser, customer submission or analytics.
const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../pricing-engine.js');
const { calculateEstimate, buildServiceScope, getGroups, getItem } = pricing;
const local = {
  address: 'Biggera Waters QLD 4216', addressVerified: true, travelBand: 'within50',
  travelDistanceKm: 2, distanceSource: 'driving-route', propertyType: 'Residential',
  storeys: '1', rooms: '3-4', conditionLevel: 'standard', accessDifficulty: 'ground',
  recurringFrequency: 'one_off', timingLoading: 'standard', serviceArea: 'Both',
};
const line = (code, quantity) => ({ code, quantity });
const input = (lines, overrides = {}) => ({ ...local, lineItems: lines, ...overrides });
const estimate = (lines, overrides = {}) => calculateEstimate(input(lines, overrides));
const total = (result) => result.recommendedEstimateIncGst;
const assertMoney = (result, expected) => {
  assert.equal(total(result), expected);
  assert.equal(result.calculationBreakdown.totalIncGst, expected);
  assert.match(result.recommendedEstimateLabel, /incl\.\s*GST/i);
  assert.equal(Math.round((result.calculationBreakdown.subtotalExGst + result.calculationBreakdown.gst) * 100), Math.round(expected * 100));
};
const assertReview = (result) => {
  assert.equal(result.manualReviewRequired, true);
  assert.notEqual(result.accuracyLevel, 'High');
};
const travelFee = (result) => result.calculationBreakdown.travelFeeIncGst;

test('production master: 19 categories, 161 codes; per-window and package rates retained', () => {
  assert.equal(getGroups().length, 19);
  const entries = getGroups().flatMap(g => g.items);
  assert.equal(entries.length, 161);
  assert.equal(new Set(entries.map(i => i.code)).size, 161);
  const rates = {
    window_standard_exterior: 11, window_standard_interior: 11, window_standard_both: 19,
    window_large_both: 28, window_double_hung: 26, window_skylight_exterior: 30,
    window_package_single: 450, window_package_double: 650,
    house_wash_single: 550, house_wash_double: 880,
  };
  for (const [code, rate] of Object.entries(rates)) assert.equal(getItem(code).rate, rate, code);
  assert.equal(getItem('window_standard_both').unit, 'windows');
  assert.equal(getItem('window_large_both').unit, 'glass-panels');
});

for (const [description, code, quantity, expected] of [
  ['10 standard exterior, legitimate minimum', 'window_standard_exterior', 10, 148.50],
  ['10 standard both, legitimate minimum', 'window_standard_both', 10, 181.50],
  ['20 standard both', 'window_standard_both', 20, 313.50],
  ['30 standard both — YourDigital regression', 'window_standard_both', 30, 470.25],
  ['40 standard both — YourDigital Test A', 'window_standard_both', 40, 627],
  ['30 large glass panels — YourDigital Test C', 'window_large_both', 30, 693],
]) {
  test(description + ': 25% before one GST application', () => assertMoney(estimate([line(code, quantity)]), expected));
}

test('15 double-hung windows plus two exterior skylights: no duplicate minimum', () => {
  const result = estimate([line('window_double_hung', 15), line('window_skylight_exterior', 2)]);
  assertMoney(result, 371.25);
  assert.equal(result.calculationBreakdown.groups.length, 1);
  assert.equal(result.internalCalculation.eligibleServiceCount, 1);
});

for (const propertyType of ['Residential', 'Apartment / Unit', 'Commercial']) {
  for (const storeys of ['1', '2']) {
    test(propertyType + ' ' + storeys + ' storey: confirmed ground-access scope adds no hidden property/storey multiplier', () => {
      const result = estimate([line('window_standard_both', 20)], { propertyType, storeys, allGlassGroundAccessible: true });
      assertMoney(result, 313.50);
    });
  }
}

test('YourDigital Test B: small apartment and 40 complete windows warns without changing arithmetic', () => {
  const result = estimate([line('window_standard_both', 40)], { propertyType: 'Apartment / Unit', rooms: '1-2' });
  assertMoney(result, 627);
  assertReview(result);
  assert.match(result.estimateReasons.join(' '), /count|quantity|confirm|unusual/i);
});

test('YourDigital Test D: three-storey commercial with default ground access requires review and photos', () => {
  const result = estimate([line('window_standard_both', 30)], { propertyType: 'Commercial', storeys: '3' });
  assertMoney(result, 470.25);
  assertReview(result);
  assert.equal(result.photoRequired, true);
});

test('three-storey commercial explicitly confirms all requested glass is ground-accessible', () => {
  const result = estimate([line('window_standard_both', 30)], { propertyType: 'Commercial', storeys: '3', allGlassGroundAccessible: true });
  assertMoney(result, 470.25);
  assert.equal(result.manualReviewRequired, false);
});

test('very large window count requires confirmation/photos without an arbitrary price increase', () => {
  const result = estimate([line('window_large_both', 100)], { propertyType: 'Commercial', rooms: '7+' });
  assertMoney(result, 2310);
  assertReview(result);
});

for (const [description, address, verified, band, source] of [
  ['invalid test address', 'test', false, 'beyond50', 'driving-route'],
  ['invalid asdf address', 'asdf', false, 'beyond50', 'driving-route'],
  ['blank address', '', false, 'within50', 'driving-route'],
  ['failed geocoder', 'Unresolved address', false, 'unverified', ''],
  ['unreliable estimated route', 'Brisbane QLD 4000', true, 'beyond50', 'estimated-route'],
]) {
  test(description + ': never invent travel charge or high accuracy', () => {
    const result = estimate([line('window_standard_both', 40)], {
      address, addressVerified: verified, travelBand: band, distanceSource: source, travelDistanceKm: 238.9,
    });
    assertMoney(result, 627);
    assert.equal(travelFee(result), 0);
    assertReview(result);
  });
}

for (const [address, distance, expected] of [
  ['Biggera Waters QLD 4216', 2, 627],
  ['Brisbane QLD 4000', 80, 677],
  ['Logan Central QLD 4114', 55, 677],
  ['Ipswich QLD 4305', 115, 677],
]) {
  test('verified route: ' + address + ' keeps legitimate service-area travel policy', () => {
    const beyond = distance > 50;
    const result = estimate([line('window_standard_both', 40)], {
      address, travelDistanceKm: distance, travelBand: beyond ? 'beyond50' : 'within50',
    });
    assertMoney(result, expected);
    assert.equal(travelFee(result), beyond ? 50 : 0);
  });
}

test('verified travel threshold is free at exactly 50 kilometres', () => {
  assertMoney(estimate([line('window_standard_both', 40)], { travelDistanceKm: 50 }), 627);
});

test('YourDigital Test E: optional zero pavers/walls do not add scope, minima, discounts or confidence flags', () => {
  const active = [line('window_standard_exterior', 30)];
  const optional = [...active, line('pressure_pavers', 0), line('pressure_exterior_walls', 0)];
  const base = estimate(active, { propertyType: 'Commercial', storeys: '2', allGlassGroundAccessible: true });
  const result = estimate(optional, { propertyType: 'Commercial', storeys: '2', allGlassGroundAccessible: true });
  assertMoney(result, 272.25);
  assert.equal(result.internalCalculation.eligibleServiceCount, 1);
  assert.equal(result.internalCalculation.bundleRate, 0);
  assert.deepEqual(result.calculationBreakdown.lines, base.calculationBreakdown.lines);
  assert.deepEqual(result.calculationBreakdown.groups, base.calculationBreakdown.groups);
  assert.equal(result.manualReviewRequired, base.manualReviewRequired);
  assert.equal(result.photoRequired, base.photoRequired);
  assert.equal(result.accuracyLevel, base.accuracyLevel);
  const scope = buildServiceScope(input(optional)).join(' ');
  assert.doesNotMatch(scope, /Pavers|Exterior walls|interior and exterior/i);
  assert.match(scope, /Exterior window glass cleaned/);
});

test('all 161 optional service codes with zero/negative quantity remain completely absent', () => {
  const active = [line('window_standard_both', 20)];
  const base = estimate(active);
  const scope = buildServiceScope(input(active));
  for (const item of getGroups().flatMap(g => g.items)) {
    for (const quantity of [0, -1]) {
      const lines = [...active, line(item.code, quantity)];
      const result = estimate(lines);
      assert.equal(total(result), total(base), item.code + ':' + quantity);
      assert.deepEqual(result.calculationBreakdown.lines, base.calculationBreakdown.lines, item.code);
      assert.deepEqual(result.calculationBreakdown.groups, base.calculationBreakdown.groups, item.code);
      assert.equal(result.internalCalculation.eligibleServiceCount, 1, item.code);
      assert.equal(result.manualReviewRequired, base.manualReviewRequired, item.code);
      assert.equal(result.photoRequired, base.photoRequired, item.code);
      assert.equal(result.accuracyLevel, base.accuracyLevel, item.code);
      assert.deepEqual(buildServiceScope(input(lines)), scope, item.code);
    }
  }
});

test('all 137 measured items omit missing/blank/NaN quantity rather than inventing one', () => {
  for (const item of getGroups().flatMap(g => g.items).filter(i => i.mode !== 'fixed')) {
    for (const quantity of [undefined, '', 'not-a-number', null]) {
      const result = estimate([line(item.code, quantity)]);
      assert.equal(total(result), 0, item.code);
      assert.equal(result.calculationBreakdown.lines.length, 0, item.code);
      assert.equal(result.calculationBreakdown.groups.length, 0, item.code);
      assert.equal(buildServiceScope(input([line(item.code, quantity)])).length, 0, item.code);
      assertReview(result);
    }
  }
});

test('all 24 fixed jobs keep legitimate missing-quantity one-property defaults, but explicit zero disappears', () => {
  for (const item of getGroups().flatMap(g => g.items).filter(i => i.mode === 'fixed')) {
    const defaultResult = estimate([{ code: item.code }]);
    const explicit = estimate([line(item.code, 1)]);
    assert.equal(total(defaultResult), total(explicit), item.code);
    assert.deepEqual(defaultResult.calculationBreakdown.lines, explicit.calculationBreakdown.lines, item.code);
    const zero = estimate([line(item.code, 0)]);
    assert.equal(zero.calculationBreakdown.lines.length, 0, item.code);
    assert.equal(total(zero), 0, item.code);
  }
});

test('legacy single-item interface does not turn scopeQuantity 0 into one', () => {
  for (const code of ['window_standard_both', 'solar_residential', 'house_wash_single']) {
    const result = calculateEstimate({ ...local, pricingItemCode: code, scopeQuantity: 0 });
    assert.equal(total(result), 0, code);
    assert.equal(result.calculationBreakdown.lines.length, 0, code);
  }
});

test('deliberately selected measured job with missing quantity requests review without billing it', () => {
  const result = estimate([line('window_standard_both', 20), { code: 'pressure_concrete', selected: true }]);
  assertMoney(result, 313.5);
  assertReview(result);
  assert.equal(result.calculationBreakdown.lines.length, 1);
});

for (const [code, side, excluded] of [
  ['window_standard_exterior', 'Exterior', 'Interior'],
  ['window_standard_interior', 'Interior', 'Exterior'],
  ['window_standard_both', 'Interior and exterior', null],
]) {
  test('purchased ' + code + ' defines scope even when generic side field conflicts', () => {
    const lines = [line(code, 20)];
    const scope = buildServiceScope(input(lines, { serviceArea: excluded || 'Exterior' })).join(' ');
    assert.ok(scope.includes(side + ' window glass cleaned'), scope);
    if (excluded) assert.doesNotMatch(scope, new RegExp(excluded + ' window (glass|frames)', 'i'));
    if (excluded) assert.doesNotMatch(scope, /Interior and exterior window/i);
  });
}

test('20m² concrete alone applies the actual $250 ex-GST minimum once', () => {
  const result = estimate([line('pressure_concrete', 20)]);
  assertMoney(result, 206.25);
  assert.equal(result.calculationBreakdown.lines[0].subtotalExGst, 140);
  assert.equal(result.calculationBreakdown.groups[0].minimumAdjustmentExGst, 110);
});

test('YourDigital pressure regression: zero exterior/retaining walls cannot raise the concrete minimum', () => {
  const lines = [line('pressure_concrete', 20), line('pressure_exterior_walls', 0), line('pressure_retaining_walls', 0)];
  const result = estimate(lines);
  assertMoney(result, 206.25);
  assert.equal(result.calculationBreakdown.groups.length, 1);
  assert.doesNotMatch(buildServiceScope(input(lines)).join(' '), /Exterior walls|Retaining walls/);
});

test('positive concrete+pavers+wall surfaces apply greatest legitimate category minimum once', () => {
  const result = estimate([line('pressure_concrete', 20), line('pressure_pavers', 10), line('pressure_exterior_walls', 2)]);
  assertMoney(result, 247.5);
  assert.equal(result.calculationBreakdown.groups[0].minimumAdjustmentExGst, 67);
  assert.equal(result.internalCalculation.eligibleServiceCount, 1);
});

test('measured area preserves legitimate fractions instead of silently rounding upwards', () => {
  const result = estimate([line('pressure_exterior_walls', 40.5)]);
  assertMoney(result, 300.71);
  assert.equal(result.calculationBreakdown.lines[0].quantity, 40.5);
});

for (const [code, storeys, expected] of [['house_wash_single', '1', 453.75], ['house_wash_double', '2', 726]]) {
  for (const verified of [true, false]) {
    test(code + ': 25% promotion, ' + (verified ? 'valid local address' : 'invalid address'), () => {
      const result = estimate([line(code, 1)], { storeys, addressVerified: verified, address: verified ? local.address : 'test', travelBand: verified ? 'within50' : 'unverified' });
      assertMoney(result, expected);
      if (!verified) assertReview(result);
    });
  }
}

test('apartment + double-storey whole-house wash gets compatibility review without changing the price', () => {
  const result = estimate([line('house_wash_double', 1)], { propertyType: 'Apartment / Unit', storeys: '2' });
  assertMoney(result, 726);
  assertReview(result);
});

test('two legitimate services get 25% once and no legacy bundle stacking', () => {
  const result = estimate([line('window_package_single', 1), line('gutter_package_single', 1)]);
  assertMoney(result, 660);
  assert.equal(result.internalCalculation.eligibleServiceCount, 2);
  assert.equal(result.internalCalculation.bundleRate, 0);
  assertReview(result);
});

test('three legitimate services get 25% once and no legacy bundle stacking', () => {
  const result = estimate([line('window_package_single', 1), line('gutter_package_single', 1), line('house_wash_single', 1)]);
  assertMoney(result, 1113.75);
  assert.equal(result.internalCalculation.eligibleServiceCount, 3);
  assert.equal(result.internalCalculation.bundleRate, 0);
});

test('legacy monthly service discount cannot silently stack with the campaign', () => {
  const result = estimate([line('window_standard_both', 40)], { recurringFrequency: 'monthly' });
  assertMoney(result, 627);
  assertReview(result);
});

test('valid negative mattress one-side reduction remains a legitimate adjustment', () => {
  assertMoney(estimate([line('mattress_queen', 1), line('mattress_one_side', 1)]), 99);
});

test('invalid item code cannot produce a confident price or service minimum', () => {
  const result = estimate([line('unknown_billable_item', 10)]);
  assert.equal(total(result), 0);
  assertReview(result);
});

test('package plus separately counted standard windows requires review of possible duplicate scope', () => {
  assertReview(estimate([line('window_package_single', 1), line('window_standard_both', 40)]));
});

test('giveaway threshold uses post-promotion qualifying service total including GST', () => {
  const below = estimate([line('window_standard_both', 30)]);
  assertMoney(below, 470.25);
  assert.equal(below.eligibleForGiveaway, false);
  const exact = estimate([line('mattress_queen', 4)]);
  assertMoney(exact, 495);
  assert.equal(exact.eligibleForGiveaway, true);
  const above = estimate([line('window_standard_both', 40)]);
  assert.equal(above.eligibleForGiveaway, true);
});

test('legitimate travel remains part of final job spend under the existing giveaway rule', () => {
  const result = estimate([line('window_standard_both', 30)], {
    address: 'Brisbane QLD 4000', travelBand: 'beyond50', travelDistanceKm: 80,
  });
  assertMoney(result, 520.25);
  assert.equal(result.eligibleForGiveaway, true);
});

test('50% normal deposit and Afterpay full amount use exactly the displayed inclusive total', () => {
  const result = estimate([line('window_standard_both', 30)]);
  assertMoney(result, 470.25);
  assert.equal(result.depositIncGst, 235.13);
  assert.equal(result.afterpayFullPaymentIncGst, 470.25);
  assert.equal(result.afterpayFullPaymentIncGst, result.calculationBreakdown.totalIncGst);
});


test('invalid travel never makes a below-$495 promotional estimate giveaway eligible', () => {
  const result = estimate([line('window_standard_both', 30)], {
    address: 'test', addressVerified: false, travelBand: 'beyond50', travelDistanceKm: 238.9,
  });
  assertMoney(result, 470.25);
  assert.equal(result.eligibleForGiveaway, false);
});

test('travel stays exactly $50 including GST across cent-rounding boundaries, and is not discounted', () => {
  for (const quantity of [40.01, 40.05, 40.1, 40.25, 40.5, 40.75, 41, 44.44, 55.55, 77.77]) {
    const lines = [line('pressure_exterior_walls', quantity)];
    const localResult = estimate(lines);
    const remote = estimate(lines, { address: 'Brisbane QLD 4000', travelBand: 'beyond50', travelDistanceKm: 80 });
    assert.equal(Math.round(total(remote) * 100) - Math.round(total(localResult) * 100), 5000, String(quantity));
    assert.equal(travelFee(remote), 50);
    assert.equal(remote.calculationBreakdown.discount, localResult.calculationBreakdown.discount);
    assert.equal(Math.round(remote.calculationBreakdown.subtotalExGst * 100) + Math.round(remote.calculationBreakdown.gst * 100), Math.round(total(remote) * 100));
  }
});

test('zero services cannot produce a standalone travel bill', () => {
  const result = estimate([line('pressure_concrete', 0)], { address: 'Brisbane QLD 4000', travelBand: 'beyond50', travelDistanceKm: 80 });
  assert.equal(total(result), 0);
  assert.equal(travelFee(result), 0);
});

test('manual measured builders item requires actual measured quantity; unknown quantity is not one square metre', () => {
  const empty = estimate([{ code: 'builders_final', selected: true }]);
  assert.equal(total(empty), 0);
  assertReview(empty);
  const measured = estimate([line('builders_final', 250)]);
  assertMoney(measured, 1340.63);
  assert.equal(measured.calculationBreakdown.lines[0].quantity, 250);
  assertReview(measured);
});


test('selected non-numeric measured quantity is excluded but explicitly requires review', () => {
  const result = estimate([line('window_standard_both', 20), { code: 'pressure_concrete', quantity: 'not-a-number', selected: true }]);
  assertMoney(result, 313.5);
  assertReview(result);
  assert.equal(result.calculationBreakdown.lines.length, 1);
});

test('invalid access/condition codes cannot quietly become high-confidence easy standard access', () => {
  for (const overrides of [{ accessDifficulty: 'unknown-access' }, { conditionLevel: 'unknown-condition' }]) {
    const result = estimate([line('window_standard_both', 20)], overrides);
    assertReview(result);
  }
});

test('scope excludes quantities rejected by pricing validation, including fractional whole units and extreme counts', () => {
  for (const quantity of [1.5, 100001]) {
    const lines = [line('window_standard_both', quantity)];
    const result = estimate(lines);
    assert.equal(result.calculationBreakdown.lines.length, 0);
    assert.equal(buildServiceScope(input(lines)).length, 0);
  }
});


test('repeated positive codes cannot silently double-charge a high-confidence estimate', () => {
  const result = estimate([line('window_standard_both', 20), line('window_standard_both', 20)]);
  assertReview(result);
  assert.match(result.estimateReasons.join(' '), /more than once|duplicate|separate work/i);
});

test('window whole-property package variants and package-included addons require overlap review', () => {
  for (const additional of [line('window_package_double', 1), line('window_flyscreen', 5), line('window_deep_track', 5)]) {
    assertReview(estimate([line('window_package_single', 1), additional]));
  }
});

test('both-sides and single-side glass for the same item family require overlap confirmation', () => {
  for (const family of ['window_standard', 'window_large', 'window_skylight']) {
    assertReview(estimate([line(family + '_both', 10), line(family + '_exterior', 10)], { serviceArea: '' }));
  }
});

test('orphan negative mattress allowance cannot discount unrelated work or create a bill', () => {
  const alone = estimate([line('mattress_one_side', 5)]);
  assert.equal(total(alone), 0);
  assert.equal(alone.calculationBreakdown.lines.length, 0);
  assertReview(alone);
  const other = estimate([line('window_standard_both', 40), line('mattress_one_side', 5)]);
  assertMoney(other, 627);
  assertReview(other);
  assert.doesNotMatch(buildServiceScope(input([line('window_standard_both', 40), line('mattress_one_side', 5)])).join(' '), /One-side-only reduction/);
});

test('one-side reductions cannot outnumber the positively priced mattresses', () => {
  const result = estimate([line('mattress_queen', 1), line('mattress_one_side', 2)]);
  assertMoney(result, 123.75);
  assertReview(result);
  assert.equal(result.calculationBreakdown.lines.length, 1);
  const valid = estimate([line('mattress_queen', 2), line('mattress_one_side', 2)]);
  assertMoney(valid, 198);
});

test('duplicated mattress reductions are checked as a combined count', () => {
  const result = estimate([line('mattress_queen', 1), line('mattress_one_side', 1), line('mattress_one_side', 1)]);
  assertMoney(result, 123.75);
  assertReview(result);
  assert.equal(result.calculationBreakdown.lines.length, 1);
});

test('double-storey package rates do not incur a second double-storey access percentage', () => {
  for (const [code, expected] of [
    ['window_package_double', 536.25], ['gutter_package_double', 408.38], ['house_wash_double', 726],
  ]) {
    const result = estimate([line(code, 1)], { storeys: '2', accessDifficulty: 'double' });
    assertMoney(result, expected);
    assert.equal(result.calculationBreakdown.adjustments.some(a => a.label === 'Access allowance'), false);
  }
});

test('one access-included item cannot exempt separate measured work from the entire category', () => {
  const result = estimate([line('window_package_double', 1), line('window_standard_both', 20)], { storeys: '2', accessDifficulty: 'double' });
  assertMoney(result, 896.78);
  assertReview(result);
  assert.equal(result.calculationBreakdown.adjustments.find(a => a.label === 'Access allowance').amountExGst, 57);
});

test('a named roof-access allowance does not silently stack with another percentage for that roof', () => {
  const result = estimate([line('roof_metal_single', 100), line('roof_access_double', 1)], { storeys: '2', accessDifficulty: 'double' });
  assertMoney(result, 907.5);
  assertReview(result);
  assert.equal(result.calculationBreakdown.adjustments.some(a => a.label === 'Access allowance'), false);
});

test('a null or empty distance cannot be presented as verified zero-distance travel', () => {
  for (const travelDistanceKm of [null, '']) {
    const result = estimate([line('window_standard_both', 40)], { addressVerified: true, travelDistanceKm });
    assertMoney(result, 627);
    assertReview(result);
    assert.equal(result.travelStatus, 'requires address confirmation');
  }
});


test('mattress one-side purchase cannot promise both sides in the customer scope', () => {
  const scope = buildServiceScope(input([line('mattress_queen', 1), line('mattress_one_side', 1)])).join(' ');
  assert.match(scope, /one side only/i);
  assert.doesNotMatch(scope, /both sides/i);
  const partial = buildServiceScope(input([line('mattress_queen', 3), line('mattress_one_side', 1)])).join(' ');
  assert.match(partial, /1 mattress cleaned on one side only/);
  assert.match(partial, /2 remaining mattresses cleaned on both sides/);
});

test('contradictory fixed package/storey selection requires review without increasing rates',()=>{
  const value=estimate([line('house_wash_double',1)],{storeys:'1'});
  assertMoney(value,726); assertReview(value);
  assert.match(value.estimateReasons.join(' '),/storey-specific package/);
});

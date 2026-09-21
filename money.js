(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TAMoney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ACTIVE_PROMOTIONS = Object.freeze({
    one_off_service: Object.freeze({ rate: 0.25, basisPoints: 2500, label: '25% off one-off cleaning services', startsAt: null, endsAt: null }),
    subscription: Object.freeze({ rate: 0.10, basisPoints: 1000, label: '10% off subscriptions', startsAt: null, endsAt: null }),
  });
  function fraction(value) {
    if (!Number.isFinite(Number(value))) throw new Error('Enter a finite amount.');
    const text = Number(value).toFixed(8);
    return [BigInt(text.replace('.', '')), 100000000n];
  }
  function rounded(n, d) {
    const sign = n < 0n ? -1n : 1n;
    const result = Number(sign * ((sign * n + d / 2n) / d));
    if (!Number.isSafeInteger(result)) throw new Error('Amount is out of range.');
    return result;
  }
  function toCents(value) { const [n, d] = fraction(value); return rounded(n * 100n, d); }
  function scaleCents(cents, multiplier) {
    if (!Number.isSafeInteger(cents)) throw new Error('Money must be integer cents.');
    const [n, d] = fraction(multiplier); return rounded(BigInt(cents) * n, d);
  }
  function promotion(normalExGstCents, classification, now = Date.now()) {
    if (!Number.isSafeInteger(normalExGstCents) || normalExGstCents < 0) throw new Error('Invalid normal price.');
    const campaign = ACTIVE_PROMOTIONS[classification];
    if (!campaign) throw new Error('Invalid purchase classification.');
    const active = (!campaign.startsAt || now >= Date.parse(campaign.startsAt)) && (!campaign.endsAt || now < Date.parse(campaign.endsAt));
    const discountCents = scaleCents(normalExGstCents, active ? campaign.rate : 0);
    const subtotalExGstCents = normalExGstCents - discountCents;
    const gstCents = scaleCents(subtotalExGstCents, 0.1);
    const totalIncGstCents = subtotalExGstCents + gstCents;
    return { classification, campaign: { ...campaign, rate: active ? campaign.rate : 0 }, normalExGstCents, discountCents, subtotalExGstCents, gstCents, totalIncGstCents,
      normalExGst: normalExGstCents / 100, discount: discountCents / 100, subtotalExGst: subtotalExGstCents / 100, gst: gstCents / 100, totalIncGst: totalIncGstCents / 100 };
  }
  return { ACTIVE_PROMOTIONS, toCents, scaleCents, promotion };
});

(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TAGiveawayPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const startsAt = Date.parse('2026-08-24T00:00:00+10:00');
  const endsAt = Date.parse('2026-10-23T20:00:00+10:00');
  // Records must come from the staff-controlled payment ledger, never a public form.
  function qualifies(record) {
    const total = record?.finalDiscountedIncGstCents;
    const paid = record?.paidCents;
    const at = Date.parse(record?.paidAt);
    return record?.status === 'paid' && Number.isSafeInteger(total) && total >= 49500 && Number.isSafeInteger(paid) && paid >= Math.ceil(total * (record.method === 'afterpay' ? 1 : 0.5)) && at >= startsAt && at < endsAt;
  }
  return { qualifies, startsAt, endsAt };
});

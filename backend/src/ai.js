import pricingEngine from '../../pricing-engine.js';

const { buildServiceScope, calculateEstimate, generateSummary } = pricingEngine;

function toText(value) {
  return String(value ?? '').trim();
}

export function estimateLead(lead = {}) {
  return calculateEstimate(lead);
}

export function generateAISummary(lead = {}, estimate = null) {
  const resolvedEstimate = estimate || calculateEstimate(lead);
  return generateSummary(lead, resolvedEstimate);
}

export function generateServiceScope(lead = {}) {
  return buildServiceScope(lead);
}

export function scoreLeadQuality(lead = {}, estimate = null) {
  const coreFields = [
    lead.firstName,
    lead.phone,
    lead.address,
    lead.propertyType,
    lead.pricingItemCode || (Array.isArray(lead.lineItems) && lead.lineItems.length ? 'line-items' : ''),
    lead.conditionLevel,
    lead.accessDifficulty,
    toText(lead.travelBand) && toText(lead.travelBand) !== 'unverified' ? lead.travelBand : '',
  ];
  const completed = coreFields.filter((value) => toText(value)).length;
  const activeLines = Array.isArray(lead.lineItems) ? lead.lineItems.filter((line) => Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0) : [];
  const hasQuantity = Number(lead.scopeQuantity || 0) > 0 || activeLines.length > 0;
  const hasPhotos = Number(lead.photoUploadCount || 0) > 0 || (Array.isArray(lead.photoUploads) && lead.photoUploads.length > 0);
  const hasUsefulNotes = toText(lead.notes).length >= 30;

  if (lead.addressVerified !== true || (estimate && (estimate.manualReviewRequired || estimate.tailoredQuoteRecommended))) return 'low';
  if (completed >= 7 && hasQuantity && (hasPhotos || hasUsefulNotes)) return 'high';
  if (completed >= 6 && hasQuantity) return 'medium';
  return 'low';
}

import pricingEngine from '../../frontend/pricing-engine.js';

const { calculateEstimate, generateSummary } = pricingEngine;

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

export function scoreLeadQuality(lead = {}) {
  const coreFields = [
    lead.firstName,
    lead.phone,
    lead.address,
    lead.propertyType,
    lead.pricingItemCode || (Array.isArray(lead.lineItems) && lead.lineItems.length ? 'line-items' : ''),
    lead.conditionLevel,
    lead.accessDifficulty,
    lead.travelBand,
  ];
  const completed = coreFields.filter((value) => toText(value)).length;
  const hasQuantity = Number(lead.scopeQuantity || 0) > 0 || (Array.isArray(lead.lineItems) && lead.lineItems.every((line) => Number(line.quantity) > 0));
  const hasPhotos = Number(lead.photoUploadCount || 0) > 0 || (Array.isArray(lead.photoUploads) && lead.photoUploads.length > 0);
  const hasUsefulNotes = toText(lead.notes).length >= 30;

  if (completed >= 7 && hasQuantity && (hasPhotos || hasUsefulNotes)) return 'high';
  if (completed >= 6 && hasQuantity) return 'medium';
  return 'low';
}

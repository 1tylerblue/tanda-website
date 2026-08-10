import { getServiceQuoteService } from '../../service-quote-config.mjs';

export const COMPACT_SERVICE_QUOTE_VARIANT = 'service_landing_compact';

export function isCompactServiceQuote(variant) {
  return String(variant || '').trim() === COMPACT_SERVICE_QUOTE_VARIANT;
}

export function getCompactService(serviceId) {
  return getServiceQuoteService(serviceId);
}

export function buildCompactQuoteDetails(service) {
  return {
    customerScope: [
      service.scope,
      'Final access, condition and scope confirmed by T & A Pro Cleaning before booking.',
    ],
    aiSummary: `A ${service.label} enquiry was received from the service landing page. The team will confirm the property scope before issuing a final quote.`,
    estimate: {
      estimateMin: null,
      estimateMax: null,
      estimateMinIncGst: null,
      estimateMaxIncGst: null,
      recommendedEstimate: null,
      recommendedEstimateIncGst: null,
      recommendedEstimateLabel: 'Scope confirmation required',
      internalEstimateLabel: 'Compact service enquiry - no automated price issued',
      pricingMethod: 'Compact service enquiry',
      estimateLabel: 'Scope confirmation required',
      estimateReasons: ['Compact landing-page enquiry received before detailed property scope was collected.'],
      estimatedJobType: 'Service Landing Enquiry',
      tailoredQuoteRecommended: true,
      manualReviewRequired: true,
      largeRoofInspectionRequired: false,
      submittedRoofArea: null,
      maximumAutomatedRoofArea: null,
      photoRequired: false,
      calculationBreakdown: {
        lines: [],
        groups: [],
        adjustments: [],
        servicesSubtotalExGst: null,
        subtotalExGst: null,
        gst: null,
        totalIncGst: null,
      },
      internalCalculation: {
        compactServiceEnquiry: true,
      },
      estimateGuidance: 'T & A Pro Cleaning will confirm access, condition and the complete scope before issuing the final price.',
      accuracyLevel: 'Manual review',
      eligibleForGiveaway: false,
    },
  };
}

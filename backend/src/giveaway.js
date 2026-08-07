export const GIVEAWAY_MINIMUM_INC_GST_CENTS = 49500;
export const GIVEAWAY_MINIMUM_INC_GST = GIVEAWAY_MINIMUM_INC_GST_CENTS / 100;
export const GIVEAWAY_MINIMUM_PUBLIC_RULE = 'Minimum eligible job value: $495 including GST, subject to review.';

export function moneyToCents(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

export function getGiveawayEligibility(totalIncludingGst, campaignOpen = true) {
  const totalIncludingGstCents = moneyToCents(totalIncludingGst);
  const meetsMinimumValue = totalIncludingGstCents !== null
    && totalIncludingGstCents >= GIVEAWAY_MINIMUM_INC_GST_CENTS;

  return {
    minimumIncludingGst: GIVEAWAY_MINIMUM_INC_GST,
    minimumIncludingGstCents: GIVEAWAY_MINIMUM_INC_GST_CENTS,
    totalIncludingGst: totalIncludingGstCents === null ? null : totalIncludingGstCents / 100,
    totalIncludingGstCents,
    meetsMinimumValue,
    campaignOpen: Boolean(campaignOpen),
    eligible: Boolean(campaignOpen) && meetsMinimumValue,
    publicRule: GIVEAWAY_MINIMUM_PUBLIC_RULE,
  };
}

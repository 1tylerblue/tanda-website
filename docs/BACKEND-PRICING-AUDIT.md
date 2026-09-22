# Backend pricing audit — 23 September 2026

Baseline: production commit `07e8e60d8b2b748c5a71fd87fe6104b995f84be2`. Git retains the complete original implementation; this document records findings before modification.

Confirmed defects:
- travel.js appends Queensland/Australia to arbitrary input and accepts the first Photon result without query/country/postcode/precision/ambiguity validation. OSRM failure bills haversine × 1.25, an invented road distance.
- Standard lead totals and travel fees from the browser are already disregarded, but server trusts this unsafe cache. Zero lines are retained until the shared engine; engine owner is fixing normalization and scope there.
- Giveaway compares EX-GST recommendedEstimate against the GST-INCLUSIVE $495 threshold.
- Subscription amounts are accepted from the browser without recomputation; subscription owner is producing a shared authoritative module.
- Quote emails omit promotion arithmetic even though they use the server estimate breakdown.
- Lead quality can be High without address verification or checking pricing review conditions.

Integration boundary:
The production backend has quote/referral/subscription enquiry APIs and SMTP/Apps Script mail delivery. No Square/Afterpay/Zip checkout or payment-link creation endpoint exists. Payment preference is enquiry metadata. Preserve delivery and tracking; do not invent or claim verified payment integrations.

Planned bounded fixes:
Require a matching Australian geocoder result and reliable driving route; ambiguity, invalid input and failed routing return unverified zero-fee/null-distance status. Preserve Biggera Waters and existing >50 km/$50 GST-inclusive rule. Pass explicit ground-access confirmation to engine. Recompute subscriptions from the shared browser module. Giveaway uses final GST-inclusive total. Emails show server promotion and totals. Tests use mock HTTP and synthetic data; no real email or payment.

## Implemented and verified

- Address placeholders, blank input, random text, invalid/mismatched postcodes, foreign/missing-country matches, region-only centroids, unrelated points of interest, ambiguous locations and failed/unreliable driving routes return `travelBand: unverified`, `addressVerified: false`, `distanceKm: null`, `travelFeeIncGst: 0`, and `travelStatus: requires address confirmation`.
- Exact Australian locality or street/house-number matches are required. Explicit NSW/state context is preserved. Only verified driving routes enter the cache used by quote submissions; client distance, verification flags, fee and total fields remain untrusted.
- Server quantity normalization distinguishes missing values from zero and from malformed values. Malformed supplied quantities retain an invalid marker, so fixed-price jobs cannot silently turn them into one billable property. Optional zero fields remain zero and shared scope/pricing excludes them.
- The backend carries explicit ground-access confirmation through to the shared estimator, and lead quality cannot be High when location or pricing requires review.
- Quote email, API response and stored lead identify pricing policy `T&A-PRICING-FIX-2026-09-23` separately from the unchanged July master-rate version. They all use the same server-calculated promotion, GST-inclusive amount, 50% standard deposit and full-payment Afterpay reference amount. No charge is created automatically.
- Giveaway uses the existing campaign dates and final GST-inclusive $495 threshold after discounts. Exact $495 and below-threshold $470.25 are covered.
- Subscription API recalculates from the new shared pricing input, overriding submitted prices, service scope, workers and visits. Legacy payloads without sufficient calculation inputs receive a refresh/recalculate message instead of trusting an old amount. Deploy the shared pricing module and updated builder with this backend change.
- SMTP and Apps Script dispatch, API endpoint names, rate limits, backups, saved lead format and delivery queue remain in place. An exported app allows tests to import routes without starting production listeners or backup scheduling.

## Verification evidence

`npm test --prefix backend`: **55 passed** (15 HTTP integration tests, 32 travel/matching tests, 8 existing shared-engine/backend regressions). HTTP tests use a loopback-only email sink, synthetic contact details and an isolated temporary data folder. External HTTPS is blocked and all real SMTP credentials are blanked in tests. No production enquiry, email, payment or analytics conversion is sent.

Verified HTTP arithmetic includes 40 standard both $627; 30 standard both $470.25; 30 large both $693; 30 exterior with unused pressure fields $272.25; 20 m² concrete with only its legitimate minimum $206.25; valid mocked Brisbane route adds exactly $50 incl. GST to produce $677. Bronze/Gold/Platinum each use 10% only, recomputed by the backend. Forged totals/travel and malformed fixed-job quantities cannot increase the calculated amount.

Read-only real-provider smoke on 23 September 2026 found Photon returns the expected named Biggera Waters suburb without postcode and the named Brisbane City administrative district with postcode 4000. Both shapes pass matching. Photon returned unrelated shopping centres/schools for `Biggera Waters QLD 4216`; those are rejected. The public OSRM HTTPS endpoint failed from this environment for the accepted public localities, so actual driving distances were **not verified** and the result remained unverified/$0. No provider fallback or fabricated distance was substituted. Valid-location/fee arithmetic is covered by deterministic route fixtures, not claimed as a successful live provider route.

## Exact backend files

- `backend/src/travel.js`
- `backend/src/server.js`
- `backend/src/ai.js`
- `backend/src/mailer.js`
- `backend/package.json` (test runner includes all regression files; dependencies unchanged)
- `backend/test/quote-pricing.test.mjs`
- `backend/test/travel-pricing-regression.test.mjs`
- `backend/test/http-pricing-regression.test.mjs`
- `docs/BACKEND-PRICING-AUDIT.md`

Shared pricing, money and subscription modules are documented in the main pricing review. No commit or deployment was performed by the backend workstream.

# Production pricing correction — updated 27 September 2026

Status: implemented and verified in `fix/production-pricing-20260923`, based on live production commit `07e8e60d8b2b748c5a71fd87fe6104b995f84be2`. Deployment remains subject to Tyler's approval of the verified preview, as required by the earlier website mission. This branch now includes the saved September banner, upright Anytime Fitness image with its corner logo, Ford-badge hero images and approved hero spacing. The service-CTA work remains separate.

Latest confirmed promotion: **15% for normal services; subscriptions stay 10%**. This 27 September instruction supersedes the earlier 25% pricing brief. The banner, browser calculator, backend calculation and regression expectations now agree.

## Corrected customer examples

All totals are AUD including GST, standard condition, with no verified travel charge or additional surcharge. The stored rates are preserved; these examples verify arithmetic, not new business approval of rates.

| Scenario | Normal service ex GST | 15% promotion | Discounted services ex GST | GST | Final incl GST |
|---|---:|---:|---:|---:|---:|
| A/B: 40 standard windows, both sides | $760.00 | −$114.00 | $646.00 | $64.60 | **$710.60** |
| D: 30 standard windows, both sides | $570.00 | −$85.50 | $484.50 | $48.45 | **$532.95** |
| C: 30 large glass panels, both sides | $840.00 | −$126.00 | $714.00 | $71.40 | **$785.40** |
| E: 30 exterior windows, zero pavers/walls | $330.00 | −$49.50 | $280.50 | $28.05 | **$308.55** |
| 20 m² concrete, zero optional walls | $250.00 minimum | −$37.50 | $212.50 | $21.25 | **$233.75** |
| Single-storey house wash | $550.00 | −$82.50 | $467.50 | $46.75 | **$514.25** |
| Double-storey house wash | $880.00 | −$132.00 | $748.00 | $74.80 | **$822.80** |

Invalid/blank/unresolved addresses always add **$0 travel**, have no distance, and require address confirmation. High confidence is not given. Unusually large apartment/window quantities, large panel counts, contradictory package/storeys and uncertain multi-storey glass access require review/photos as appropriate. They do not automatically increase prices. Explicit confirmation that all requested glass is safely ground-accessible is supported. Rope-only access is not offered.

## What changed

- One shared money module applies the approved 15% service promotion before GST, once. Legitimate service charges, minimums and priced additions use that campaign; verified travel is excluded. Legacy bundle and maintenance discounts do not stack and their applicability is referred for review. Subscriptions cannot receive this campaign.
- Pricing and customer scope share the same validated active lines. Every explicit zero/negative quantity is absent from charges, minimums, bundle counts, scope and review/photo flags. Selected blank/invalid measured quantities require correction/review. Fixed one-property jobs retain their legitimate missing-quantity default, but explicit zero or invalid supplied quantities cannot become one property.
- Measured builder jobs require real quantities. Decimal area/metres/hours are preserved; incomplete whole-window quantities remain invalid rather than being rounded into billable work. Window helper text distinguishes complete units from separately chargeable large panels.
- Window scope follows the purchased item code for interior/exterior/both sides. Screens/tracks are only promised when included in a package or specifically selected. Mattress one-side reductions also remove the both-sides promise. Overlapping packages, duplicate selections and unsupported reductions require review.
- Geocoder results must match the supplied Australian locality/address/postcode and sufficiently precise location. Unrelated POIs, overseas/ambiguous matches and failed/unreliable routes never create fees. The Biggera Waters reference and existing >50 km/$50 incl-GST rule remain. No straight-line distance fallback is billed. Editing or clearing the address immediately invalidates previous travel results.
- Subscription configuration was extracted without changing stored plan rates or inclusions. Default inclusions, duplicate pool/balcony/access selections and optional preselected charges are counted once. Only 10% is deducted before GST. First-clean/monthly/annual figures and every adjustment are itemised. Annual recurring is twelve final monthly payments and excludes the separate first clean.
- The backend recalculates quotes and subscriptions from the shared modules instead of trusting browser totals. Quote email, saved lead, response, deposit metadata and browser result use the corrected total. Standard deposit is 50%; Afterpay full-payment metadata is 100%. No real transaction is initiated.
- The $495 giveaway boundary uses the final price including GST after promotion, preserving the existing inclusion of legitimate travel. Campaign dates and other rules are unchanged; the incorrect public “ex GST” threshold label is corrected.
- Smart Quote previews and submitted results now show the active computed promotion and saving in a red notice next to the price, with the deduction row also red. No saving is advertised for zero-value or unpriced work. Desktop/mobile rendering, unchanged totals and the zero-quantity state were verified using in-memory submissions; owner email calculations remain itemised in the existing plain-text format.
- Mobile now exposes the price breakdown and review reasons. Travel status reserves space so the Continue button cannot move during a tap. A missing master script cannot fall back to retired per-pane/range prices.

## Subscription examples

Base package scope, light condition, standard access, no optional additions:

| Plan | First clean incl GST after 10% | Monthly incl GST after 10% | Annual recurring incl GST |
|---|---:|---:|---:|
| Bronze | $593.01 | $395.01 | $4,740.12 |
| Silver | $791.01 | $543.51 | $6,522.12 |
| Gold | $1,088.01 | $741.51 | $8,898.12 |
| Platinum | $1,583.01 | $1,187.01 | $14,244.12 |

The existing explicit standard-condition first-clean adjustment of $75 ex GST is preserved and disclosed. These “from” figures use light condition. Unknown condition/safe-access uncertainty requires review rather than an assumed surcharge. The historic Gold $1,954/$1,532 email cannot be reconstructed uniquely without its original selections.

## Restored approved design

The five saved image files were copied byte-for-byte from `../pricing-payments-ads-readiness/assets/images/`: `builders-clean-1600.webp`, `builders-clean.JPG`, `hero-house-van-1920.webp`, `hero-house-van-900.webp` and `hero-house-van.png`. The gym image is already upright with the small Anytime Fitness logo embedded in the top-right corner. Both homepage uses share this asset; the commercial thumbnail is aligned to the top to keep its logo visible. Asset query versions prevent stale previews. Only the banner-specific CSS and the requested hero spacing were carried over; the older pricing generator and engine were not copied. The banner also includes subtle static confetti at its edges, checked at 320, 390 and 1266 pixels without horizontal overflow or blocked links. The customer Call Now button is confirmed as `tel:0466224927`, with the mobile number in its accessible label; existing call tracking is unchanged.

## Source, backup and commercial uncertainties

`PRICING-BASELINE.md` records all 161 original items, units, rates, minimums and adjustments extracted from immutable commit `07e8e60`, with an engine SHA-256. `PRODUCTION-BASELINE-VERIFICATION.md` records read-only comparison with live assets. That commit is the complete rollback source. No newer approved master was found. `T&A-MASTER-2026-07-11` remains the rate identity, with a separate correction policy version. All catalogue numbers and subscription configuration are tested against the original commit.

The existing single/double-storey window packages and measured-unit prices represent different scopes (packages include screens/tracks). No per-window rate was arbitrarily lowered or replaced. Overlapping selections are provisional and require review.

## Verification and required matrix

- `npm test`: **138 root tests + 55 backend tests passed**. This includes all 161 items at zero/negative quantity, all 137 measured-item missing-quantity cases, all 24 fixed-job defaults, integer-cent rounding boundaries, API/email parity and tampered payloads.
- `npm run test:browser -- --workers=1`: **17 passed**. Total: **210 passing automated tests**. External requests are blocked and submissions use an in-memory interception or isolated local mail sink. No production conversion, enquiry, email or payment was sent.
- Manual visual review: restored red banner, upright gym image and visible top-right logo in both homepage placements at 320, 390 and 1440 pixels; Ford badge and hero spacing; mobile/desktop quote and subscription screenshots, visible discount/GST/review warnings and scope; no horizontal overflow at 320, 375, 390, 768 and 1440 pixels in quote-flow tests.
- Exact preservation checks cover all 24 HTML GTM/default-consent/noscript blocks, existing Ads/GA4 helpers and IDs, phone/Messenger links, email delivery transports, campaign dates and unrelated gallery/review integrations. No PostHog source exists in this production checkout; no remotely configured GTM tags were changed.

| Requested cases | Coverage |
|---|---|
| Windows 1–7 | 10 exterior/both, 20/30/40 both, double-hung/skylights, 30 large panels; current rates/minimums and 15% arithmetic |
| Windows 8–13 | Single/double/three storeys; residential/apartment/commercial; explicit safe ground access and conflicting scopes |
| Windows 14–17 | Matching local/Brisbane/Logan/Ipswich geocoder fixtures, invalid/blank/failed/overseas/ambiguous locations |
| Windows 18–23 | Zero/high quantity, correct exterior/interior/both scope, zero optional pressure services and required missing quantities |
| Pressure 24–28 | 20 m² concrete minimum, zero pavers/walls, positive multiple surfaces and one minimum per active category |
| House 29–33 | Single/double base, valid/invalid location, 15% once, apartment/package and storey contradictions |
| Subscriptions 34–40 | Bronze/Gold/Platinum (also Silver/Custom), rooms/storeys/workers/visits/inclusions/swaps/balcony/commercial, exactly 10%, never the 15% general promotion |
| General 41–45 | GST/promotion once, no legacy discount stacking, exact $50 legitimate travel, failed routing/geocoding $0 |
| General 46–50 | Final $495 boundary, 50% deposit, Afterpay full-payment metadata, authoritative API/email/display equality; live processor verification unavailable because no checkout endpoint exists |

Read-only public geocoder smoke checks validated actual Photon locality shapes, including Brisbane's administrative locality. Actual routing was unavailable from this environment, so those real lookups correctly remained unverified with $0 travel. Successful local/Brisbane/Logan/Ipswich route/fee arithmetic is verified with realistic deterministic responses, not claimed as live route success.

## Payment boundary

This production code records Card/Bank transfer/Cash/Afterpay preferences. It has no Square, Afterpay or Zip payment-link/checkout amount-creation integration to exercise. We can prove display/API/email/deposit amounts agree; we cannot claim that a live merchant checkout receives these amounts. Zip availability is not invented. Existing merchant settings and payment integrations outside this repository are unchanged.

## Files and deployment

Production changes: `promotions.css`, the restored five `assets/images/` files, `pricing-engine.js`, `money.js`, `app.js`, `index.html`, `styles-home.css`, `giveaway.html`, `subscription-pricing.js`, `subscription-builder.js`, `subscription-builder.html`, `backend/src/travel.js`, `backend/src/server.js`, `backend/src/ai.js`, `backend/src/mailer.js`.

Verification/support: root `package.json`, `package-lock.json`, `playwright.config.cjs`; backend package manifests and `backend/test/*.test.mjs`; `tests/*.test.cjs`, `tests/browser/*.spec.cjs`; `scripts/preview-pricing.cjs`; the five audit/review documents in `docs/`.

Preview: `npm run preview`, then `http://127.0.0.1:4191/` for the restored homepage or `http://127.0.0.1:4191/index.html?service=window-cleaning#quote` for the calculator. Preview API submissions are disabled. Backend tests use only temporary synthetic storage and a local mail sink.

After approval, deploy frontend and backend from the same reviewed commit through the existing hosting workflow. Both new shared modules must be available beside the root pricing engine. New versioned browser scripts prevent stale asset use; an already-open old subscription form receives a clear refresh/recalculate response instead of trusting its old total. Verify live asset hashes and the invalid-address GET response first, then prices/consent without sending production conversions. A controlled live email/payment check requires a designated test and authorization. Roll back both services to the previous known commit if critical verification fails; preserve production lead data.

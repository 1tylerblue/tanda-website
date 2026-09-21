# Pricing, payments and ads review

Feature branch: `feature/pricing-payments-ads-readiness`.
Production base: `07e8e60d8b2b748c5a71fd87fe6104b995f84be2`.
This release is prepared for review only. Do not merge or deploy until Tyler explicitly approves the verified preview.

## Pricing

`money.js` holds the two campaigns and integer-cent rounding: 25% for one-off services and their priced additions, 10% for subscriptions, then 10% GST. Campaign dates are configurable and unset; no expiry has been invented. Explicit promotional codes are rejected instead of stacked. Normal recurring, package, bundle, condition and travel rules precede the promotion.

The existing 19-category catalogue remains in `pricing-engine.js`. Both the quote browser and backend use this file. Equivalent package/access charges are suppressed per category, while unrelated extra difficulty can still be charged. Quantities are validated before money calculation. Roof areas above 150 m² retain the complete entered area and require inspection with no automatic dollar estimate.

`subscription-pricing.js` is shared by browser and server. The original package prices and inclusion schedules are retained. Default inclusions add nothing; higher frequencies add only the monthly difference; removals do not create credits. Standard condition and the previously preselected outdoor add-on no longer add unintended charges. The backend ignores submitted totals and regenerates the plan and price breakdown.

### Tested reference prices (AUD)

| Scope | Normal ex GST | Campaign | Discount | Sale ex GST | GST | Final incl GST |
|---|---:|---:|---:|---:|---:|---:|
| Single-storey windows | 450.00 | 25% | 112.50 | 337.50 | 33.75 | 371.25 |
| Double-storey windows | 650.00 | 25% | 162.50 | 487.50 | 48.75 | 536.25 |
| Metal roof, up to 100 m² | 850.00 | 25% | 212.50 | 637.50 | 63.75 | 701.25 |
| Carpet, 3 standard rooms | 90.00 | 25% | 22.50 | 67.50 | 6.75 | 74.25 |
| Carpet, 4 standard rooms | 110.00 | 25% | 27.50 | 82.50 | 8.25 | 90.75 |
| Carpet, 5 standard rooms | 120.00 | 25% | 30.00 | 90.00 | 9.00 | 99.00 |
| Single-storey gutters including patio | 300.00 | 25% | 75.00 | 225.00 | 22.50 | 247.50 |
| Three-seat sofa and chaise | 200.00 | 25% | 50.00 | 150.00 | 15.00 | 165.00 |
| Bronze first clean | 599.00 | 10% | 59.90 | 539.10 | 53.91 | 593.01 |
| Bronze monthly | 399.00 | 10% | 39.90 | 359.10 | 35.91 | 395.01 |
| Silver first clean | 799.00 | 10% | 79.90 | 719.10 | 71.91 | 791.01 |
| Silver monthly | 549.00 | 10% | 54.90 | 494.10 | 49.41 | 543.51 |
| Gold first clean | 1099.00 | 10% | 109.90 | 989.10 | 98.91 | 1088.01 |
| Gold monthly | 749.00 | 10% | 74.90 | 674.10 | 67.41 | 741.51 |
| Platinum first clean | 1599.00 | 10% | 159.90 | 1439.10 | 143.91 | 1583.01 |
| Platinum monthly | 1199.00 | 10% | 119.90 | 1079.10 | 107.91 | 1187.01 |

These examples assume standard condition and access, no extra services, and no travel charge. Subscription examples use a standard house and only the plan's included services.

### Catalogue questions preserved for Tyler

- The old carpet catalogue has a $120 category minimum. The supplied 3/4/5-room references replace those three quantities. For 1–2 rooms, the existing $120 minimum is retained rather than inventing a new price; this is higher than the new 3-room offer and needs business confirmation.
- Residential tile/grout remains $10.50/m² with a $350 category minimum. A $550–$650 full-house reference needs an approved floor-area definition; no unsupported fixed whole-house package was invented.
- House wash bases remain $550/$880, within the supplied ranges. A $250 mould-treatment addition is available with house washing, requiring photos.

## Customer presentation and SEO

Static promotion cards and JSON-LD are generated from the same shared modules by `npm run generate`; `npm test` checks that the generated content is current. Original and sale prices specify their GST basis. The quote shows normal price, adjustments, campaign discount, sale ex GST, GST and total. Initial quote pricing is neutral guidance.

`robots.txt` and `sitemap.xml` include the canonical public pages, including `/reviews/`. Local links, image/script references, fragment targets, metadata and JSON-LD are checked. All analytics IDs and conversion labels are retained.

The hero already uses 239,512-byte desktop and 80,866-byte mobile WebP images. Giveaway art already has a 140,326-byte WebP source, dimensions and lazy loading on the secondary image. No new heavy promotional images were added. The displayed 38-review count matches the 38 imported source records; this is not a fresh verification of each external review.

## Submissions and analytics

`submission-client.js` provides a 45-second bounded request including response parsing, an in-flight guard, retry-stable random idempotency keys, and conversion deduplication. Session storage contains hashes and receipt IDs, not customer form contents. Forms retain entered data on errors. The server persists the key and request hash with the record; exact retries return the existing record and do not send another email. A changed request cannot reuse a key.

The actual lead and subscription routes are exercised with in-memory storage and mail sinks. Browser success screenshots use the local simulated API and do not prove live email delivery. No real charge, customer enquiry, email or notification was sent in verification.

Analytics tests verify consent gating, estimate events, payment preferences, phone and Messenger clicks, and backend-confirmed quote/subscription success with no duplicate success event on retry or refresh. Afterpay/Zip interest events are not offered because neither method is operationally available here. No PostHog integration is present on the authoritative production branch; no new analytics account was created.

Read-only timing of the live backend `/api/stats`: first request 22,836 ms, next request 227 ms, both HTTP 200. The initial hosting sleep state is unknown; this is an observation, not a guaranteed cold-start benchmark. The preview adds a read-only health request on form interaction and a longer bounded submission timeout. Local performance numbers are not production Core Web Vitals.

## Payments: verified limitations

The website records preferences only. It does not create Square invoices, payment links or recurring charges. Staff must confirm scope, then issue an appropriate Square invoice/link or arrange another agreed method. No customer payment surcharge has been added.

Square's real Afterpay settings showed **Ineligible** and available locations **None**. The separate custom payment label `afterpay` is a bookkeeping label and does not process Afterpay. No Square settings were changed. Afterpay is removed from selectable preferences and its unavailable status is stated clearly. There is no website Square checkout to sandbox-test, and the ineligible account could not support an Afterpay transaction test.

If Square later confirms eligibility, Tyler can use:

`Square Dashboard → Settings → Account & settings → Payments → Payment methods → Afterpay → Edit → enable Online and In Person → Save`

For Square POS: `More → Settings → Checkout → Payment types → Configure Afterpay`.

Only after actual enablement and a supported test should the website advertise: “Afterpay available on eligible one-off jobs up to $2,000, subject to Afterpay approval.” It must not be offered for automatic recurring subscription charges; any eligible upfront one-off payment must be distinguished from the recurring method.

Zip state: **not advertised**. No direct Zip integration or operational Zip Visa flow was verified. No merchant application, legal acceptance or director-identity entry was started.

## Giveaway payment verification

The $495 incl GST boundary uses the final discounted amount, and value eligibility alone is not an entry. The public counter reads `backend/data/giveaway-payments.json`, a staff-controlled ledger that the public quote endpoint cannot write. A paid standard booking requires at least 50%; supported Afterpay requires 100%. Refunded/cancelled records never qualify. Campaign dates remain 24 August–23 October 2026, closing at 20:00 Brisbane time.

From the backend directory, authorised staff can record a verified online or phone booking:

```powershell
node scripts/record-giveaway-payment.mjs BOOKING_ID paid standard 49500 24750 2026-09-21T10:00:00+10:00
```

Amounts are cents; use the verified final discounted invoice value. Use the same booking ID with `refunded` or `cancelled` to remove eligibility. Use `afterpay` only for a genuinely supported fully paid booking. This command does not take payment or contact anyone. Run ledger writes serially, keep the file private and include it in backend backups. No surnames are exposed by the public count endpoint.

**Before deployment, reconcile existing paid qualifying bookings into this ledger.** Old `eligibleForGiveaway` flags do not prove payment and are deliberately not auto-migrated.

## Verification and preview

From this feature worktree:

```powershell
npm ci
npm --prefix backend ci
npm test
npm run test:browser
npm run preview
```

Browser tests use installed Google Chrome, via Playwright. The preview binds only to `127.0.0.1:4180`, blocks external tracking calls, shows a simulation banner and emits `noindex` headers. It cannot send real leads, email or payment requests. Open:

- `http://127.0.0.1:4180/`
- `http://127.0.0.1:4180/index.html#quote`
- `http://127.0.0.1:4180/subscription-builder.html`

Screenshots and detailed audit output are under `output/playwright/` and are deliberately excluded from git. The final handover records exact pass totals and the full commit SHA after verification.

Verified on 21 September 2026: `npm test` passed **30 pricing/site tests + 21 backend tests**, plus the generated-content check. `npm run test:browser` passed **14 browser tests** (58.9 seconds). Total **65 passed, 0 failed**. `git diff --check` passed. Browser coverage includes widths 320, 375, 390, 768 and 1440; complete mobile quote submission; consent gating; success/error/timeout/retry; concurrent submission protection; subscription refresh/back navigation; carpet field relevance; and accessibility/link checks. Axe reported zero violations on the four sampled pages (homepage, subscription builder, giveaway and carpet service page). This is a practical automated audit, not a claim of comprehensive accessibility certification.

Key screenshots: `index-1440.png`, `index-390.png`, `quote-25-percent.png`, `subscription-10-percent.png`, `payment-wording.png`, `quote-success-simulated.png`, `quote-mobile-success.png`, `quote-timeout.png`, `subscription-success-simulated.png` and `subscription-error.png`.

## Release and paid-ads gate

Paid-ads verdict: **NOT READY** until yourdigital confirms ownership/management of `AW-11132030271` and `G-GDWFQH85WN`, and existing giveaway payments are reconciled. The feature preview is reviewable; payment collection remains a manual staff step. Carpet 1–2-room pricing and full-house tile scope require Tyler's catalogue decision before advertising those specific prices.

There is no production deployment/configuration change in this branch. Frontend and backend remain in the existing repository and Render architecture. After Tyler approves, merge through the existing workflow, deploy the backend from `/backend` with `npm install` / `npm start` and the static frontend from the repository root, verify both use the approved commit, then smoke-test prices, form capture and consent on the live domain. A controlled live submission/email test requires approval because this verification used simulated delivery only. Monitor backend health, logs and public pages; if a critical new-release fault appears, roll back this release using the existing Render/Git workflow, preserving unrelated changes.

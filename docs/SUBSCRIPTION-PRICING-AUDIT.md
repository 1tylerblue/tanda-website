# Subscription pricing audit — 23 September 2026

## Production baseline recorded before edits

Production source: git commit 07e8e60d8b2b748c5a71fd87fe6104b995f84be2, subscription-builder.js and subscription-builder.html. Git retains the exact original implementation. All monetary configuration below is ex GST.

| Plan | First clean | Monthly | Workers | Visits/month | Default included selections |
|---|---:|---:|---|---:|---|
| Bronze | 599 | 399 | 1 | 1 | Interior windows bi-monthly; bins monthly |
| Silver | 799 | 549 | 1–2 | 1.5 | General monthly; interior/exterior windows bi-monthly; bins monthly |
| Gold | 1099 | 749 | 2 | 2 | General monthly; interior windows bi-monthly; exterior windows/gutters monthly; solar quarterly |
| Platinum | 1599 | 1199 | 2 | 2.5 | General fortnightly; interior bi-monthly; exterior/gutters monthly; pressure quarterly; roof annually; pest/tile six-monthly |
| Custom | 799 | 549 | 2 | 2 | No default selections |

Original calculation: plan base + property adjustments + ALL selected service firstAdd/monthly amounts + add-ons + access + condition + explicit second-worker uplift. First-clean minimum $250; monthly minimum $190. Whole-dollar rounding. Annual = monthly × 12. No subscription promotion. UI/payload display ex-GST figures and a GST note but do not calculate GST.

Confirmed defects: default included services are added again to the plan base; property and general access questions can both charge for the same stairs/booking/access condition; pool presence plus selected pool service can double-charge; accessible balcony glass adds its flat charge even when all panel/door quantities are zero; missing review flags for unsafe/uncertain access and swaps; browser supplies all price fields to backend.

Existing rates must be preserved unless a duplication is demonstrated. House extras: beyond four bedrooms +$75 first/$50 monthly, beyond one storey +$200/$150. Apartment base reduction $75/$50; beyond two bedrooms +$60/$40. Strata beyond four units +$60/$40 and beyond two floors +$180/$120. Balcony includes up to ten panels with $75/$50 base, extra panels $5/$5 and doors $10/$10. Explicit second worker for a one-worker plan +$140/$120. Standard condition adds $75 to first clean; heavy $250; first professional $350; unknown $150. Standard and unknown condition rates are existing commercial policy; they must be disclosed/reviewed, not silently deleted. Workers/visit-duration estimates do not independently multiply price.

Gold reported $1954 first / $1532 monthly cannot be reproduced uniquely without the customer's complete field selections. Those numbers alone do not authorise replacing stored rates.

## Corrections and verification

Implemented corrections and regression results are recorded below.

### Implemented corrections

- Extracted the unchanged production plan/modifier/service configuration into shared browser/server subscription-pricing.js. Regression test compares the entire configuration against production 07e8e60.
- Plan default inclusions are counted in the package base exactly once. Higher service frequency adds only the existing rate difference. New services retain their catalogue first-clean and monthly additions.
- Applied only the approved 10% subscription promotion before GST using integer cents; general 25% service promotion cannot enter this path. Monthly GST is rounded once; annual recurring is exactly twelve final monthly payments and excludes the separate first clean.
- Browser shows normal ex-GST price, 10% discount, discounted subtotal, GST and final GST-inclusive totals separately for first clean and recurring month, plus itemised base/property/service/access/condition/worker adjustments. Payload carries the same inclusive totals, named ex-GST accounting fields and complete breakdowns. Server recalculates from pricingInput rather than trusting submitted amounts.
- Optional paid-area selectors explicitly say Include cleaning, so property presence is not confused with requested paid scope. A one-worker request on a two-worker package also requires staffing/scope review.
- No charge is added for a duplicate package inclusion, pool service/pool presence, balcony allowance/frequency selection, duplicate apartment stairs, duplicated strata access severity or booking, or duplicate priority/event-ready selections.
- Optional Outdoor Area and Accessible Balcony Glass selections now default No; balcony panels and doors start at zero. Production previously defaulted Outdoor Area to Yes and balcony to ten panels plus one door, silently including unrequested charges. Positive measured balcony quantities are required before its allowance or service can contribute a charge or scope. Deliberate balcony selection with no positive quantity asks for confirmation; unused zero fields do not create a review requirement.
- Pool removal/swaps remove pool charges and scope. Removed plan inclusions, reduced included frequencies, swaps, high-rise scope, missing property quantities and uncertain/unsafe access require reviewed scope; no automatic credit policy was invented.
- Unknown condition and unsafe/uncertain water/power/equipment-access inputs no longer invent surcharges: they require review. Explicit known standard/heavy/first-professional condition rates remain unchanged and itemised.
- High-rise exterior glass is excluded from selected/priced scope; only interior and safely accessible balcony work is contemplated. No rope-only work is offered.
- Non-finite quantities, invalid frequencies, duplicate service rows, invalid plans and attempted promo codes fail validation. Hidden property-type fields do not affect another property type.

### Verified base prices (light condition, standard included package scope)

| Plan | First clean incl GST after 10% | Monthly incl GST after 10% | Annual recurring incl GST |
|---|---:|---:|---:|
| Bronze | $593.01 | $395.01 | $4,740.12 |
| Silver | $791.01 | $543.51 | $6,522.12 |
| Gold | $1,088.01 | $741.51 | $8,898.12 |
| Platinum | $1,583.01 | $1,187.01 | $14,244.12 |

### Verification

31 deterministic Node subscription tests passed. Three real-Chrome Playwright tests passed, including desktop 1440px and mobile 390px plan selection, progressive form, extra bedrooms/storeys, first-clean condition, itemised breakdown, annual calculation, zero balcony/unsafe access review, and submission to an in-memory API interception. All external network requests and production analytics were blocked. Browser and shared-module totals/payload breakdown matched exactly. No real enquiry, email or payment was sent. Browser screenshot manually inspected at mobile width: readable totals and breakdown with no horizontal overflow. Artifacts: output/playwright/subscription-summary-390.png and subscription-summary-1440.png.

Commands: node --test tests/subscription-pricing.test.cjs; npx playwright test tests/browser/subscriptions.spec.cjs --workers=1.

The reported Gold $1954/$1532 email remains a historical input-reconstruction limitation: the full submitted selections are required to explain that individual previous quote exactly. Corrected pricing uses the preserved authoritative package configuration and exposes every current adjustment. This does not establish business approval of any historical rate or authorise payment until review conditions are resolved.

### Files

subscription-builder.js; subscription-builder.html; subscription-pricing.js; tests/subscription-pricing.test.cjs; tests/browser/subscriptions.spec.cjs; docs/SUBSCRIPTION-PRICING-AUDIT.md. Shared money.js, homepage price cards and backend integration are coordinated separately with the parent task.

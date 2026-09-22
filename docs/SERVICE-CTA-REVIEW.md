# Service landing-page CTA review

Prepared 22 September 2026 on `feature/service-landing-ctas`, based on production commit `07e8e60d8b2b748c5a71fd87fe6104b995f84be2`.

The ten live service pages all returned HTTP 200 and matched the production checkout before editing. This separate checkout excludes the unpublished pricing, September discount, image and homepage-spacing work from the earlier preview. Production has not been deployed from this branch.

## Pages inspected and modified

All ten existing service landing pages were inspected and modified. Each destination below is relative to the site root and opens the existing quote section directly, with the existing supported service query. It does not send visitors to the top of the homepage.

| Service / existing page | Quote destination | CTA placement |
|---|---|---|
| Window Cleaning — `services/window-cleaning-gold-coast.html` | `index.html?service=window-cleaning#quote` | Hero moved above context pills; new benefits and gallery CTAs; existing final and project-review CTA retained |
| Pressure / Driveway / Path Cleaning — `services/pressure-cleaning-gold-coast.html` | `index.html?service=pressure-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| House / Soft Washing — `services/house-washing-gold-coast.html` | `index.html?service=house-building-washing#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Roof Cleaning — `services/roof-cleaning-gold-coast.html` | `index.html?service=roof-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Gutter Cleaning — `services/gutter-cleaning-gold-coast.html` | `index.html?service=gutter-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Solar Panel Cleaning — `services/solar-panel-cleaning-gold-coast.html` | `index.html?service=solar-panel-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Tile & Grout Cleaning — `services/tile-grout-cleaning-gold-coast.html` | `index.html?service=tile-grout-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Carpet Cleaning — `services/carpet-cleaning-gold-coast.html` | `index.html?service=carpet-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Upholstery Cleaning — `services/upholstery-cleaning-gold-coast.html` | `index.html?service=upholstery-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |
| Commercial / Strata / Builders — `services/commercial-cleaning-gold-coast.html` | `index.html?service=hourly-cleaning#quote` | New hero, benefits and gallery CTAs; final and project-review links updated |

The header Quote link also preserves the page's service selection. Project-review buttons are rendered by the existing reviews component where review/project content is available.

Commercial preselects the existing **Hourly Cleaning** group, which contains **Recurring commercial cleaning** and **Ad-hoc commercial cleaning**. This avoids the unusable Commercial Additions group, whose entries are all add-ons. No job type or price is forced. Builder jobs remain selectable through the existing Builders Cleaning group; the shared Commercial page is not silently treated as a builders-only page.

No separate active Mattress, Rug, Pool Fence, Tennis Court or Oxidation Removal landing pages were found in the production website's page inventory. No duplicate pages were created. Driveway/paths, soft washing and builders already fall under the pages named above; the quote catalogue remains unchanged.

## Component and design reuse

The Window Cleaning reference uses `service-hero-actions`, `btn btn-primary`, `btn btn-outline`, a service-specific quote label, and the `?service=...#quote` destination. Its existing button colours, sizing, hover/focus states and mobile stacking are reused. Hero quote and phone buttons now precede the service-context pills, making the primary action visible earlier on mobile. The original Window Cleaning hero label is preserved.

`scripts/service-ctas.json` contains the page/label/service mapping. `scripts/render-service-ctas.cjs` generates small static CTA blocks, validates that each mapped service has standalone job types, and supports `--check`. The CTAs are ordinary links and do not require a new runtime script. Existing final-panel labels, section IDs and classes are retained. No new sticky CTA layer was added.

## Issues found and addressed

1. Nine pages had no hero quote button; only Window Cleaning had one.
2. Existing generic quote links discarded service context. The existing preselection architecture was reused without changing form JavaScript.
3. The dynamic project-review Get Quote link was only 17 pixels high. Adding the existing `btn` class restores a normal tap target while retaining `btn-primary` and the original text.
4. The commercial-additions group contains no standalone quote jobs. Commercial CTAs now use the working hourly-cleaning group.
5. On mobile, the travel-status message could appear during a tap and move Continue, leaving the form on step 1. The only form-related change is CSS reserving space for that message. Form fields, IDs, validation, submission logic and calculations are untouched.

## Verification

**Final result: `npm test` passed all 14 tests (2.5 minutes), including 50 page/viewport combinations.** No browser JavaScript exceptions were observed in the service-page checks.

Run `npm ci`, then `npm test`. The suite includes:

- All ten service pages at 320, 375, 390, 768 and 1440 pixel widths: loading, horizontal overflow, CTA visibility/size, hit testing for obstruction, all primary CTA destinations, direct quote navigation, service selection and enabled job choices.
- Existing Window Cleaning, header phone links and Messenger visibility.
- Desktop and mobile simulated quote submission through the actual existing form, with requests intercepted by the test runner; selected job reaches the payload and the existing Google Ads form-conversion event fires.
- Keyboard activation of a hero CTA, plus existing quote-click, phone-click, phone-conversion and Messenger events after consent.
- Exact production comparison of protected application/pricing/subscription/giveaway files, service-page head content, analytics scripts and GTM noscript blocks; local service-page links and referenced assets resolve.
- Static generator consistency and `git diff --check`.

Screenshots are in `output/screenshots/` for every service at 390 and 1440 pixels. External network requests are blocked during browser tests; no real enquiries, emails, payments or analytics test conversions are sent.

The four Google Ads destinations — Window Cleaning, Driveway/Pressure Cleaning, Roof Cleaning and House/Soft Washing — have verified CTA and enquiry paths in the local preview. This is implementation readiness, not a claim about Google Ads performance or receipt of production leads. Deployment and a post-deployment check remain pending review.

## Tracking and scope preservation

GTM `GTM-58HPXR72`, Google Ads `AW-11132030271`, and the existing form and phone conversion labels are unchanged. No analytics configuration, event names, form IDs or handlers were edited. No PostHog source was found in this production checkout; no installed analytics was removed and the GTM container was not modified.

Pricing, promotions, Smart Estimates, GST, subscriptions, giveaway/deposit rules, Square/Afterpay/Zip, customer review content/data, business contact information, SEO head content and integration configuration are unchanged. The change in `reviews.js` affects only the project-review CTA's href and missing button class.

## Exact changed files

- The ten `services/*.html` pages listed in the table.
- `reviews.js`: project-review CTA service destination and existing button class.
- `styles-home.css`: reserve the travel-status message's space to prevent the mobile Continue button shifting.
- `scripts/service-ctas.json`: reusable CTA configuration.
- `scripts/render-service-ctas.cjs`: static CTA generation/check.
- `scripts/preview-service-ctas.cjs`: localhost-only preview server; enquiries disabled.
- `tests/service-ctas.spec.cjs`: all-page responsive, destination, preselection and preservation checks.
- `tests/quote-tracking.spec.cjs`: simulated form flow and tracking-event checks.
- `playwright.config.cjs`, `package.json`, `package-lock.json`: pinned browser-test tooling.
- `docs/SERVICE-CTA-REVIEW.md`: this handover.

Preview: `npm run preview:ctas`, then open `http://127.0.0.1:4190/services/window-cleaning-gold-coast.html`. This preview has no real enquiry delivery. Other service pages use the same base URL.

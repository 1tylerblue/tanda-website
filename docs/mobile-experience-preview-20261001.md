**T & A Pro Cleaning — mobile experience preview, 1 October 2026**

Review handover. This work is a local preview and has **not been deployed**. Production deployment requires owner approval.

Preview: [http://127.0.0.1:4191/](http://127.0.0.1:4191/). Run `npm run preview` from this checkout if the preview server is not already running. The preview disables enquiry submissions; test requests must not create messages, bookings, payments, giveaway entries or advertising conversions.

Branch: `fix/mobile-experience-20261001`. Starting commit: `28c975f0ad6ddae097fcb792df76b4e30a3e8b08`. The review commit is the head of this feature branch and is recorded in the delivery message. Stop before merge or production deployment; owner approval is required.

The homepage now uses compact mobile spacing, a shorter hero and promotion area, horizontal service cards, expandable supporting content and a less nested quote form. Six services remain visible initially; “View all 12 services” exposes the rest. Service actions retain the existing quote-group preselection through their quote URLs.

The shared navigation covers **23 public pages**, including nested service, area and review URLs. It uses a compact header, opaque navy overlay, grouped links and quote/call actions. Navigation handling includes focus containment, Escape/backdrop dismissal, scroll restoration, anchor focus and coordination with Messenger and consent controls; final test confirmation is recorded below.

Commercial proof, including Anytime Fitness, remains available. Plans keep their name, first-clean and recurring prices, GST/discount basis, workers, visit frequency and primary action visible; named disclosures contain the full inclusions and suitability descriptions. Supporting service standards and company information use native disclosures. Before-and-after imagery has compact Previous / counter / Next controls, with the existing desktop dots retained.

Pricing calculations, discounts, GST, plan inclusions/billing, giveaway prizes/dates/eligibility, payment and deposit rules, backend APIs and environment settings are outside this change. Quote behaviour, consent choices, analytics event names and conversion logic are preserved. A source-content comparison confirmed the original text, links and images in the seven supporting homepage sections were retained.

**Measurement and final QA record**

Compare the same browser, 390 × 844 viewport, confirmed loaded Inter fonts, fully loaded images, consent state and default quote Step 1. Allow gallery/review data and layout to settle. Measure document scroll height with disclosures in their initial mobile state, then again with every mobile disclosure expanded. Compare section heights as well as document height, and inspect text/control bounds so clipping cannot be mistaken for a shorter page. The final browser harness permits Google Fonts GET requests while blocking analytics and POST requests; fallback-font component measurements must not replace these authoritative results.

| Measure | Authoritative final result |
| --- | --- |
| Baseline homepage height | 24,847px; `before/baseline.json`, verified against production commit `28c975f` |
| Final default height / reduction | 12,795px / 48.5% (12,052px less) |
| Final all-expanded height / reduction | 18,540px / 25.4% (6,307px less) |
| Height saved through disclosures | 5,745px beyond the 6,307px saved with everything expanded |
| Largest remaining sections | Plans 2,757px; services 1,430px; quote Step 1 1,187px; commercial proof 1,095px; gallery preview 1,076px |
| Main quote action visible initially | Yes at 390 × 844: top 428px, bottom 476px; hero 758 → 381px; header 77 → 69px |
| Automated regression / browser tests | `npm test`: 138 frontend/pricing/preservation + 55 backend checks passed. `npm run test:browser -- --workers=1`: 34 passed; one 320px browser-startup timeout passed unchanged in an isolated rerun, verifying all 35 scenarios. WebKit separately passed mouse/touch/keyboard Continue, canceled drag and the next valid tap. |
| Responsive and visual QA | Chromium 153.0.8010.53 and WebKit 26.0: 320, 360, 375, 390, 414, 430, 768, 1024, 1440px; 390 × 420 short screen; 844 × 390 landscape; 320/390 at 200% root text with all disclosures expanded. No visible text/control overflow. |

The reduction is a matched Chromium comparison, not a comparison between different browser engines. WebKit provides independent responsive validation. All 51 images with a nonempty source loaded; no image failures or page errors were recorded. Native disclosures, keyboard interaction, breakpoint changes, gallery controls and all 12 quote-service destinations were checked. A physical-pointer regression also covers address checking during the first Continue tap; pointer capture preserves the existing click target without reserving an empty status area.

The final actual-preview smoke used no CSP override: Inter 400/600/700 loaded, page height remained exactly 12,795px, GTM/Ads scripts were blocked, and empty synthetic localhost lead/subscription POSTs both returned 503 without sending an enquiry. Quote steps 1 → 2 → 3 worked with the loaded font; 40 standard both-side windows retained the existing $710.60 inclusive total with the approved 15% discount and $0 unverified travel. Evidence: `after/preview-safety.json`.

**Screenshot references**

These are local QA artifacts under `output/mobile-redesign/`; they are not production assets. Final screenshots were visually inspected. Hero/menu screenshots are natural viewport captures; section images are document clips taken from scroll position zero so the sticky header cannot obscure their content.

| View | Before | After |
| --- | --- | --- |
| Whole homepage | [Baseline](../output/mobile-redesign/before/whole-page.png) | [Final](../output/mobile-redesign/after/whole-page.png) |
| Hero / closed menu | [Baseline](../output/mobile-redesign/before/hero-closed-menu.png) | [Final](../output/mobile-redesign/after/chromium-hero.png) |
| Open menu | [Baseline](../output/mobile-redesign/before/menu-open.png) | [Chromium](../output/mobile-redesign/after/chromium-menu.png), [WebKit](../output/mobile-redesign/after/webkit-menu.png) |
| Services | [Baseline](../output/mobile-redesign/before/services.png) | [Final](../output/mobile-redesign/after/services.png) |
| Before-and-after gallery | [Baseline](../output/mobile-redesign/before/gallery.png) | [Final](../output/mobile-redesign/after/gallery.png) |
| Gallery preview | [Baseline](../output/mobile-redesign/before/gallery-preview.png) | [Final](../output/mobile-redesign/after/gallery-preview.png) |
| Plans | [Baseline](../output/mobile-redesign/before/plans.png) | [Default](../output/mobile-redesign/after/plans.png), [expanded Bronze](../output/mobile-redesign/final-bronze-expanded-390.png) |
| Quote form | [Baseline](../output/mobile-redesign/before/quote.png) | [Final](../output/mobile-redesign/after/quote.png) |
| Giveaway | [Baseline](../output/mobile-redesign/before-giveaway-promo-banner-390.png) | [Component check](../output/mobile-redesign/final-giveaway-promo-banner-390.png) |

**Changed files and limits**

- Homepage: `index.html`, `mobile-home.css`, `content-disclosures.js`, and the counter update in `gallery.js`.
- Shared navigation/presentation: `site-navigation.css`, `site-navigation.js`, `styles-home.css`, `styles.css`, `app.js`, `messenger-button.js`, and navigation markup/imports across the 23 public HTML pages.
- Verification: `tests/browser/mobile-navigation.spec.cjs`, `tests/integration-preservation.test.cjs`, local screenshots/measurement JSON, this handover and `docs/MOBILE-NAVIGATION-REVIEW.md`.
- Local preview: `scripts/preview-pricing.cjs` permits the site's Google Fonts styles/font files so the owner's preview matches its typography; external scripts, connections and frames remain blocked, and enquiry POSTs remain disabled.

Browser automation and viewport/text emulation do not constitute real-device testing. No physical-phone testing or native on-screen keyboard testing is claimed. External analytics requests are blocked and submission checks use isolated/mocked endpoints; live payments, customer communications and production conversion delivery are not exercised. The preview server remains local to this computer. Screenshot and detailed JSON/log evidence lives in ignored `output/mobile-redesign/` and is available in this workspace; it is not included in the production deployment.

The existing **September promotion wording is still present on 1 October**. It was deliberately left unchanged because this task does not authorize commercial-content changes; the owner should review its timing separately. No discount or campaign date has been silently corrected.

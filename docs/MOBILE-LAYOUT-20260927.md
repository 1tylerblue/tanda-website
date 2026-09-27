# Mobile spacing and alignment review — 27 September 2026

Base: production commit `095ea02482408cba6c5c3b9bc8feae2c4a3c2e94`.
Branch: `fix/mobile-layout-20260927`.

## Changes

- Homepage mobile containers use equal side gutters measured from the available page width, including browsers with a scrollbar gutter.
- Hero title, description, primary action and secondary actions have distinct spacing. Supporting links and trust cards use equal-width columns.
- Service and subscription cards use consistent content insets, button dimensions and list alignment.
- Gallery previews use a compact two-column grid with aligned captions. Footer links use two columns with larger tap targets.
- The giveaway panel now stacks on mobile. Its inherited desktop minimum column widths previously clipped copy and the prize image inside the card.
- Smart Quote uses a single column of full-width controls, including email, with 16px input text and at least 48px control height. Redundant outer form borders/insets are removed. Existing mobile step visibility and reserved address-status space are retained.
- Subscription property fields and step actions share the contact fields' left and right edges.
- Gallery page gutters and service-page review quote links receive matching mobile spacing/tap-target adjustments.

All layout changes are limited to widths of 760px or less. Pricing, discount rates, scope generation, backend APIs, payment handling, images and tracking scripts are unchanged.

## Verification

- `npm test`: passed (pricing, subscriptions, backend travel and production integration preservation).
- `npm run test:browser -- --workers=1`: all 17 existing tests passed. Local/mock requests only; no production submissions, payment requests, emails or conversion requests were sent.
- Independent browser checks at 320px, 390px and 760px: mobile menu opens/closes; its links fit; all three quote steps work; form controls share edges; giveaway copy and image fit inside the card; no unexpected horizontal overflow or text clipping.
- 40 standard windows, both sides, unverified address: provisional total remains $710.60 including GST after the approved 15% promotion.
- Subscription mobile checks at 320px and 390px: property, contact and action containers align. Separate 10% subscription pricing is preserved.
- Homepage desktop geometry at 1440px matches the saved pre-change baseline for hero, service cards, subscription cards, quote shell and footer.
- Visual review images are saved locally under `output/mobile-layout/`; subscription screenshots are under `output/playwright/`.

## Review and deployment

Preview: `http://127.0.0.1:4191/` (submissions disabled).
This branch is prepared for preview review. The mobile changes have not been merged into production; the earlier website brief requires approval of the verified preview before deployment.

# Shared navigation review — 1 October 2026

Branch: `fix/mobile-experience-20261001`. Local preview: `http://127.0.0.1:4191/`. The owner approved publication on 2 October 2026. The wider handover records the feature-branch delivery and final verification.

## Baseline and result

The existing mobile menu expanded the sticky header and pushed the page down. The cascade contained repeated component declarations in both `styles.css` and `styles-home.css`; narrow screens also used a 42px toggle and uneven pill-like menu links.

At a 390 × 844 Chromium viewport (375px content area with its classic scrollbar):

| Measurement | Before | After |
| --- | ---: | ---: |
| Closed header | 77px | 69px |
| Header with menu open | 617px | 69px |
| Toggle target | 42 × 42px | 44 × 44px |
| Open navigation panel | 343 × 550px, inline | 375 × 545px, overlay |

The overlay starts below the header, has white left-aligned 44px rows on opaque navy, groups the six main and three secondary destinations, and ends with 48px Quote / Call buttons. It uses its own scrolling only when its contents exceed the available viewport. The close control stays visible inside that scroll area. Desktop navigation remains inline; the representative 1440px service-page header measures 81px.

## Implementation

- `site-navigation.css` is the single owner of the shared header/navigation component. Obsolete navigation/header/brand selectors were removed from the two legacy stylesheets; non-navigation branches of mixed selector lists were retained. Footer brand rules were preserved.
- `site-navigation.js` handles focus containment, Escape, close/backdrop dismissal, exact body-style and scroll restoration, background `inert` state, same-page anchor focus, cross-page anchors and desktop reset. The mobile breakpoint is 1279px so all destinations remain readable at tablet widths.
- `app.js` delegates its existing `setupMobileNav` function to the new component. A separate bounded UI fix in `setupMobileQuoteSteps` captures a primary pointer press on Continue/Review so address-blur status reflow cannot move the release target. Capture is released when the user moves more than 8px from the original press. A canceled-pointer flag also suppresses WebKit's subsequent synthetic activation with `stopImmediatePropagation`, preventing both navigation and the separate Review click tracker from treating that canceled gesture as a completed click. Keyboard clicks (`detail:0`) and the next genuine pointer press remain valid. Existing click validation and keyboard activation stay unchanged. Pricing, address resolution, consent, conversion and submission functions were not changed.
- The shared header and component assets are installed on all 23 public content pages, including nested services, areas and reviews. The legacy `reviews.html` redirect remains a redirect. Relative URLs and the original quote destinations are retained. Header logos use their original files and eager loading.
- Existing `.site-nav.is-open` behavior remains available. Messenger's existing visibility check now responds to any open mobile navigation width. Open-menu CSS also suspends consent/floating overlays; their consent choices and original inert state are restored on dismissal.
- Updated asset query versions prevent a cached old `app.js` navigation handler from attaching alongside the new module. Messenger destinations, consent and event logic are unchanged.
- One measured header offset is used for anchors. Previous target margins are neutralized so scroll padding and margin do not count the header twice.
- Without JavaScript, the links remain readable as an inline navy navigation and inactive toggle/close controls are hidden. The skip link remains available on keyboard focus without adding an extra header row.

## Verification and artifacts

Before screenshots and geometry were captured before component edits:

- `output/playwright/navigation/before-390-closed.png`
- `output/playwright/navigation/before-390-open.png`
- `output/playwright/navigation/before.json`

After screenshots were inspected visually with the original logo decoded:

- `output/playwright/navigation/after-390-closed.png`
- `output/playwright/navigation/after-390-open.png`
- `output/playwright/navigation/after-320-open.png`
- `output/playwright/navigation/after-1440-service-closed.png`
- `output/playwright/navigation/after-390-nojs.png`

A physical, hit-tested pointer interaction independently confirmed scroll restoration at 900px: click captured 900px, body locked at `top:-900px`, and Escape returned exactly to 900px. Playwright's high-level `locator.click` can itself scroll this sticky control before clicking; the regression test therefore clicks its visible, hit-tested centre without removing the exact restoration assertion.

Desktop resize was also checked with the mobile Close control focused: the visible Home link received focus, the body lock cleared and main content was no longer inert. The privacy-page header was verified at y=0 and 69px after the shared skip-link fix.

`node --test tests/integration-preservation.test.cjs` passes all 32 tests. The strict Chromium regression `a first tap on Continue works while the address field starts a delayed lookup` passes: a physical press/release advances to step 2 while the mocked address request remains pending, without reserving empty vertical space. WebKit 26.0 also passes mouse press/release, touch tap, keyboard Continue, and deliberate drag-away cancellation followed by a valid next click, with no page errors. Evidence: `output/mobile-redesign/after/webkit-quote-pointer.json`; runner: `output/mobile-redesign/verify-quote-pointer.cjs`. All 23 content pages have the required navigation assets and controls; static local URL checks found no missing files. `node --check` passes for the component, app and Messenger scripts. The dedicated browser suite is `tests/browser/mobile-navigation.spec.cjs`; its final run is reported separately by the QA agent alongside the full responsive matrix.

Tests use the isolated local preview with external requests blocked. The preview disables enquiry submissions. These are desktop-browser viewport tests, not physical-device tests. No real messages, payments or advertising conversions were created. Full-page height reduction and content-disclosure measurements belong to the wider mobile-layout review, not this navigation-only measurement.

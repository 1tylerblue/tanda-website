# Live production baseline verification

Checked 2026-09-22T14:54:55.794Z using read-only HTTP GET requests. No form submissions, tracking scripts, payment requests or customer records were created.

Comparison source: immutable Git production commit `07e8e60d8b2b748c5a71fd87fe6104b995f84be2`. Content comparison removes only UTF-8 BOM and CRLF/LF transport differences; substantive JavaScript and HTML content must match.

| Live resource | HTTP | Matches baseline after encoding normalisation | SHA-256 of normalised response |
|---|---:|---|---|
| [index.html](https://www.tandaprocleaning.com.au/index.html) | 200 | Yes | `d1d7c4687ead0e92d695a856572ecb2f9e13b0e0ce45bc086314c43ec4110ce2` |
| [pricing-engine.js](https://www.tandaprocleaning.com.au/pricing-engine.js) | 200 | Yes | `4cd2d950bd594a032ab5a2150f73f4a8a5bb8a4798a3ed06258ac4b66ce87707` |
| [app.js](https://www.tandaprocleaning.com.au/app.js) | 200 | Yes | `deff15fd527821ce2d432dcd2182ac4ee8a6e1d9c0aa8137950d192143fe7b9c` |
| [subscription-builder.js](https://www.tandaprocleaning.com.au/subscription-builder.js) | 200 | Yes | `3029c0482f9c12b275f7921be8ce2ba610d787d3210ad14b0fd8e073c547a1d4` |
| [subscription-builder.html](https://www.tandaprocleaning.com.au/subscription-builder.html) | 200 | Yes | `6e341fc1ef194e25b6aeaf5be027a8c2af8d0efb7a571e75b1f3d26147307a4b` |

All five live files matched the production baseline at the recorded time. The app.js comparison differs only in BOM/line-ending representation where applicable; no substantive pricing or integration change was found on the live server. The urgent fix is therefore being built against the verified live pricing source, not an unpublished earlier branch.

## Integration preservation checks

`node --test tests/integration-preservation.test.cjs` passed 32 tests. It compares Google consent defaults, GTM script/noscript blocks on all 24 tracked HTML pages, Google Ads/GA4 IDs, 18 analytics and consent helper bodies, all telephone links, unchanged Messenger code, campaign dates/unlock target, all 161 master catalog item numeric values/modes/units/flags, script dependency order, local HTML imports/links, API origin, unchanged email transport/dispatch/webhook/recipient/attachment code, and unchanged gallery/review integration source against the same baseline.

No direct PostHog code exists in the verified production baseline. GTM may manage additional tools remotely; preserved GTM source does not establish whether a remotely configured PostHog tag is active. No production analytics or tag configuration was changed.

These checks confirm source preservation and local dependency integrity. Browser interaction and mocked conversion-event checks are reported separately. They do not claim receipt of a live conversion or acceptance of a payment by a processor.

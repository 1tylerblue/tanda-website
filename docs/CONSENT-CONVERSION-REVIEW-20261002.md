# Consent and conversion repair — review record (2 October 2026)

This is a local preview on branch `fix/consent-conversions-20261002`. It has **not** been pushed, merged, deployed, or published to GTM. The preview at `http://127.0.0.1:4191/` blocks outbound tracking and returns HTTP 503 for lead POSTs; browser tests intercept selected requests with in-memory responses. It cannot create real enquiries or Google conversions.

## Cause and baseline

The production site used an **Accept Analytics** button. On click, `app.js` set `analytics_storage: granted` but explicitly set `ad_storage: denied`; it omitted `ad_user_data` and `ad_personalization` from the update, leaving their default denied values. Thus an analytics-only choice was correctly denied for advertising, but the interface offered no explicit advertising choice. This explains why an accepted analytics choice could still show denied advertising fields. It does **not** prove that every visitor consented or explain the Ads account's reported 0% rate on its own.

An isolated Chromium session loaded the live site with all third-party and API requests blocked, then clicked the actual **Accept Analytics** button. Its data layer showed:

| Point | analytics_storage | ad_storage | ad_user_data | ad_personalization |
| --- | --- | --- | --- | --- |
| Initial default | denied | denied | denied | denied |
| Startup update before choice | denied | denied | unchanged from default | unchanged from default |
| After actual Accept Analytics click | granted | denied | unchanged from default | unchanged from default |

The old localStorage record was `tac_cookie_consent_v1` with `state: accepted`. This browser check was deliberately isolated from Google and did not test Tag Assistant's effective state.

## Repair

- `consent-manager.js` reads one versioned preference record and sends a complete four-field Google consent update. It runs after the existing denied default and **before** the unchanged GTM container on every HTML page. Existing v1 analytics acceptance migrates as analytics-only; it never becomes advertising consent silently. Invalid/expired/corrupt records fail closed; unavailable storage allows a session choice without breaking the page.
- The existing banner now presents **Accept all**, **Reject all**, and **Preferences** with separate analytics/advertising choices. **Cookie settings** in the footer reopens the controls for withdrawal. The controls remain compact on mobile. `privacy.html` describes these choices.
- `app.js` no longer writes a second consent update. It reads the shared preference for optional analytics and keeps the existing tag IDs, conversion labels, quote-success mapping, and consent-mode approach. Tracking exceptions cannot block phone links or quote handling. `messenger-button.js` uses the same choice and keeps its existing click-only event.
- Existing GTM and noscript snippets, pricing, APIs, forms, giveaway, and payment code are unchanged. The published GTM JavaScript was inspected read-only and contains the known GA4 and Google Ads base IDs. A container preview is still required to rule out account-side duplicate conversion tags or another consent writer.

## Local verification

- `npm test`: 138 frontend/integration checks and 55 backend checks passed.
- `npm run test:browser`: 41 Chromium browser checks passed, including six consent checks and the existing pricing, navigation, and subscription checks. Two later targeted quote-choice checks also passed after adding a rejected-consent case. External requests were blocked or intercepted.
- A separate WebKit 1.58.2 browser smoke check at a 390×844 emulated viewport passed: denied default, all granted after Accept all, saved acceptance restored on reload, advertising denied after custom withdrawal, no page errors. This was browser emulation, not a physical iPhone.
- Live production's before-click and after-click data-layer values were captured read-only as shown above. On the local preview, browser tests verified all four values grant after Accept all, remain denied after Reject all, and stay denied for advertising with analytics-only selection. The saved update precedes `gtm.js` on reload.
- The mocked lead test verified form validation made zero POSTs/conversions, an HTTP 503 made zero lead conversions, one accepted backend response made one conversion, and a repeated accepted submission made no second conversion. The phone/Messenger destinations stayed intact and tracking failures did not raise a browser error. These are browser/code checks, **not** proof of email delivery or effective live tag firing.
- Three isolated live-homepage browser sessions observed HTTP 200 for `GTM-58HPXR72` and the Google Ads base script before any choice, after **Deny Analytics**, and after **Accept Analytics**. The local mocked lead test queued the existing quote conversion once after backend acceptance for both **Accept all** and **Reject all**. With consent denied, Google may use limited cookieless measurements; neither test proves that Ads attributed a real lead.

## Approval boundary and remaining account verification

No production deployment or GTM edit was made. The repository has no deployment workflow/configuration that establishes branch push safety, and Render branch auto-deploy settings have not been verified. Keep the branch local until those settings are checked; only deploy after the owner's separate approval. Rollback after any later frontend deployment: redeploy the previous known production main commit `c7fc32364802a595a05a80b37717bfab7ff356c0`; leave lead data and GTM unchanged.

After an approved staged/production deployment, Gustavo should use [Google Tag Assistant](https://developers.google.com/tag-platform/security/guides/consent-debugging) and GTM Preview with a clean browser profile:

1. Check the earliest Consent event has all four optional values denied. Click **Accept all** and verify the latest Consent event plus the tag's **Consent** tab show all four granted and that the relevant Ads/GA4 tags respond accordingly.
2. Repeat with **Reject all**, analytics-only **Preferences**, withdrawal through **Cookie settings**, reload, and internal navigation. Confirm the four-field effective state at each relevant event, not only queued `dataLayer` calls. Check no second GTM consent template or custom tag overwrites the website choice.
3. Inspect GTM Preview for the existing quote and phone-click conversion labels. Ensure a single confirmed backend-accepted test lead fires one quote conversion only, while failed submissions do not. Use an agreed isolated test lead; do not create a production booking merely to test this. Confirm the phone action is classified as a **click**, not a completed call, and Messenger as a click, not a conversation.
4. In Google Ads, inspect diagnostics and consent-rate trends after enough post-release traffic. The reported 0% warning has **not** been observed clearing; an account-side cause remains possible.

The direct Google tag and GTM container are both present. Their effective interaction, duplicate-tag status, and the Ads diagnostic cannot be verified by the local preview because its CSP intentionally blocks Google scripts and outbound events. The account/Tag Assistant steps above remain necessary.

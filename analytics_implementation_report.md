# T&A Pro Cleaning Analytics Implementation Report

Date: 7 August 2026 (AEST)

## 1. Project and Branch

- Confirmed repository: `1tylerblue/tanda-website`.
- Confirmed local project: `tanda-pro-polished-v3-fixed/deploy/frontend-publish-repo-20260717`.
- Confirmed production branch: `main`.
- Isolated test branch: `analytics/posthog-test`.
- Initial implementation commit: `0658ca1`.
- Latest tested implementation commit before this report: `44c327b`.
- Production `main` was not merged, pushed or redeployed during isolated testing.

## 2. Existing Analytics Found

- Existing GA4 Measurement ID: `G-GDWFQH85WN`.
- Existing Google Ads ID: `AW-11132030271`.
- Existing quote conversion label: `AW-11132030271/8PYfCNyuw9QcEL-albwp`.
- Existing phone conversion label: `AW-11132030271/RBdMCMS3w9QcEL-albwp`.
- Existing consent storage: `tac_cookie_consent_v1`.
- No existing PostHog, Meta Pixel, Microsoft Clarity or GTM container was found.

## 3. Problems and Duplicates Found

- PostHog behaviour, funnel, friction, performance and reliability analytics did not exist.
- Pages without banner controls incorrectly overrode a previously accepted consent choice. This is fixed while unknown consent still defaults off.
- Analytics initialization, event names, attribution and privacy controls were not centralised.
- No duplicate analytics loader was found. The redirect-only `reviews.html` remains intentionally uninstrumented to avoid a duplicate page view.
- No fake `G-XXXXXXXXXX` placeholder remains.

## 4. Files Changed

Created:

- `analytics.js`
- `ANALYTICS.md`
- `analytics_implementation_report.md`
- `backend/src/analytics.js`
- `backend/test/analytics-config.test.mjs`
- `scripts/analytics.test.mjs`
- `scripts/analytics-browser-qa.js`
- `scripts/analytics-secondary-browser-qa.js`
- `scripts/verify-analytics-integration.mjs`

Modified:

- `app.js`, `subscription-builder.js`, `backend/src/server.js`, `backend/.env.example`, `privacy.html`.
- 23 content pages load the deferred central analytics utility exactly once.

Unrelated `.playwright-cli`, `output`, `i.complete` and `i.naturalWidth` artifacts were not changed or included.

## 5. Events Implemented

The central allowlist contains 35 events covering page and section engagement, scroll depth, service and CTA interest, contact actions, the full quote funnel, uploads, estimate continuation, abandonment, reset/progress loss, subscription activity, rage/dead clicks, reliability failures and sampled Web Vitals. The exact event/property/deduplication catalogue is in `ANALYTICS.md`.

## 6. Quote Funnel Mapped

Implemented funnel:

`quote_form_viewed -> quote_form_started -> quote_step_viewed/completed -> quote_submission_attempted -> quote_submitted`

Safe step IDs cover property details, service selection, access details, photos and review. Selection/removal, backward movement, revisits, validation categories, estimate display, upload result, retries, timeout/failure, successful response and abandonment reconciliation are included. `quote_submitted` fires only after a successful API response.

## 7. Privacy Protections

- Strict event and property allowlists plus key/value PII rejection.
- No `identify` call and no customer contact field used as an analytics identity.
- Query strings and fragments removed from page paths and URLs.
- Raw Google click IDs are not stored; only a boolean presence flag is retained.
- Names, phones, emails, addresses, notes, form values, filenames, images, bodies, headers, tokens, stack traces, quote values and revenue are excluded.
- All forms and generated customer content are marked no-capture/no-autocapture before SDK loading.
- Consent denial removes attribution and unfinished analytics state. Do Not Track is respected.

## 8. Heatmaps and Recordings

- Both features are independently disabled by default and were enabled only on the isolated test services.
- Forms, controls, uploads, previews, generated images and result panels are blocked.
- All input and visible text masking is configured; attributes, console recording and network bodies are disabled.
- Heatmap autocapture is limited to non-form links/buttons and strips text and attributes.
- A real isolated PostHog session recording was created and opened in the `T&A Website - Test` EU Cloud project.
- All six captured `$snapshot` payloads and the remaining PostHog transport payloads were decoded and checked. No synthetic contact detail, message, filename, form value or image-preview marker was present.
- Production flags remain off and unconfigured.

## 9. Dashboards

Direct PostHog account access was unavailable, so no dashboard is claimed as created. `ANALYTICS.md` contains exact definitions for Customer Behaviour, Service Interest, Quote Conversion, Website Friction, Reliability and Performance, and Marketing and Business dashboards, including filters and recording cohorts.

## 10. Alerts

Direct monitoring access was unavailable, so no alert is claimed as created. Exact thresholds and time windows are documented for traffic loss, quote drops, abandonment, API/submission/upload errors, JavaScript/resource spikes, poor mobile LCP and analytics initialization failures.

## 11. Marketing Attribution

First-touch attribution is preserved after consent and never overwritten. Last-touch attribution is refreshed safely. Source, medium, campaign, content, term, landing page, referring domain, paid/organic/direct/referral/email/social classification and returning-visit buckets are allowlisted and sanitised.

## 12. Business Outcomes

The backend creates a random UUID for each quote/subscription and stores only a normalised anonymous analytics context. A dormant, tested and idempotent outcome-event builder is prepared. It is not connected and sends no lead status, quote value, booking, job or revenue data. CRM mapping and explicit approval remain required.

## 13. Internal, Test and Bot Filtering

- Staff browsers can be marked with `TandaAnalytics.markInternal(true)` without IP filtering.
- Production bots and webdriver traffic are excluded; labelled test/development automation remains testable.
- Every event carries environment/test/internal fields.
- Consent-denied, internal and Do Not Track browser tests each emitted zero events.

## 14. Automated Validation

- JavaScript syntax: all frontend analytics/app/pricing/subscription and backend analytics/server/mailer files passed.
- Analytics utility tests: 10 passed, 0 failed.
- Backend analytics tests: 5 passed, 0 failed.
- Existing backend pricing/scope tests: 8 passed, 0 failed.
- HTML/link/asset audit: 24 pages, 23 intended analytics loaders, zero missing local files.
- `git diff --check`: passed; only Git line-ending notices were reported.
- No repository build, lint or type-check commands exist for this static JavaScript project.
- Dependency audit after locked install reported 4 existing advisories: 3 moderate and 1 high. They were not altered as part of analytics work because dependency upgrades need separate mailer/runtime regression testing.

## 15. Desktop, Tablet and Mobile

Playwright verified the homepage at 1440x900, 820x1180 and 390x844. The quote form remained present, analytics loaded and no horizontal overflow occurred. A second mobile scan checked all 23 analytics-enabled pages with zero page failures, console errors, page errors or horizontal overflow. The deployed isolated test site was checked again at 1440x900 and 390x844: the service picker and Done control fit the viewport, the mobile Details -> Cleaning transition worked, and no website-origin console, page or resource errors were found.

## 16. Quote and Subscription Submission

- Quote API failure and success were intercepted locally; no real lead or email was created.
- Failed response: no `quote_submitted` event and no quote Google Ads conversion.
- Successful response: one `quote_submitted` event and one quote Google Ads conversion.
- Rapid double-submit: one network request; the duplicate attempt was recorded only as friction.
- Subscription API success was mocked: one request and one `subscription_completed` event.
- Real production delivery was not exercised because the instructions prohibit a real quote/email during QA.

## 17. Sensitive Data Verification

Synthetic PII-shaped names, phones, emails, addresses, query parameters, messages and filenames were used only in the isolated test. No probe appeared in custom event properties, browser analytics storage or decoded outgoing PostHog payloads. All six real `$snapshot` payloads were checked. An anonymous 17-second session recording appeared in the actual EU Cloud test project and was opened for review. The session contained no customer data, real upload or production action.

## 18. Performance Impact

- `analytics.js`: 96,852 bytes raw and 22,441 bytes compressed with the local gzip verification.
- It is dependency-free, loaded with `defer`, and loads PostHog asynchronously only after consent/configuration.
- Performance events are sampled (default 25%) and each metric is deduplicated.
- No visible HTML/CSS layout was changed and responsive QA found no new overflow or console errors.

## 19. Deployment Status

Deployed to isolated test services only:

- Frontend Render service `tanda-website-posthog-test`: `https://tanda-website-posthog-test.onrender.com`.
- Backend Render service `tanda-pro-cleaning-api-posthog-test`: `https://tanda-pro-cleaning-api-posthog-test.onrender.com`.
- Branch: `analytics/posthog-test`.

The production Render services remain `tanda-website` and `tanda-pro-cleaning-api`. The test backend has `ANALYTICS_ENABLED=true`, `ANALYTICS_ENVIRONMENT=test`, the EU ingestion/UI hosts, recording and heatmaps enabled, and a 100% performance sample. Its dedicated test project key exists only in Render. The test frontend's API base points only to `tanda-pro-cleaning-api-posthog-test`.

The test backend now returns `200` for `/api/analytics-config` with the expected safe test/EU configuration. The earlier `404` came from testing the production backend, whose deployed `main` release does not yet contain that route; the path itself was correct. Production Render services and `tandaprocleaning.com.au` remain untouched.

## 20. Live Verification

The isolated test frontend and backend were verified. The test project received page, section, scroll, service, quote-funnel, upload, attribution, error and Core Web Vitals events. Important event identities had no duplicates after the final funnel fix. A successful API response produced one Google Ads quote conversion, while browser validation failure and a mocked HTTP 500 response produced zero conversions.

One controlled isolated backend synthetic lead was created with no mail or downstream credentials configured. Subsequent full journey replays mocked `/api/leads`; backend lead count stayed unchanged, production API requests stayed at zero, and no real email, SMS, CRM record, job or customer notification was created.

No claim is made that PostHog is active on the production domain. Production dashboards and alerts have not been configured.

## 21. Required Access and Decisions

Before production deployment:

1. Create or confirm a separate PostHog production project and configure its private token and EU host only in the production Render environment.
2. Obtain explicit user approval immediately before merging or deploying to production.
3. Keep CRM/business outcomes dormant until backend mapping, privacy, deduplication and the exact fields are approved.
4. Create the documented production dashboards and alerts after representative live, consented traffic exists.
5. Address the existing dependency audit separately with email and backend regression testing.

Current classification:

- Implemented: yes.
- Tested locally: yes.
- Deployed to isolated test services: yes.
- Verified in a real PostHog test project: yes.
- Production deployed: no.
- Production live verification: no.

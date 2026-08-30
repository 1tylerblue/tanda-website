# Privacy-Safe Website Analytics

## Status

The repository contains a consent-gated PostHog implementation that is disabled by default. It has been verified in separate, isolated Render test services using a dedicated EU Cloud PostHog test project. Production remains unconfigured and unchanged; it must stay disabled until a separate production project is configured and the production release receives explicit approval. Existing Google Analytics 4 and Google Ads tracking remain in `app.js`.

## Architecture

- `analytics.js`: one dependency-free browser utility for consent, PostHog loading, event validation, attribution, funnel tracking, masking, deduplication, reliability and sampled performance events.
- `backend/src/analytics.js`: public environment configuration, defensive context normalisation, random analytics lead IDs and a dormant business-outcome event builder.
- `GET /api/analytics-config`: returns public browser-safe settings with `Cache-Control: no-store`.
- Quote and subscription requests include only an allowlisted anonymous analytics context. The backend regenerates the context and returns a random UUID after a successful request.
- No customer contact field is used as a PostHog distinct ID. The client never calls `identify`.
- PostHog failures are caught and do not affect rendering, pricing, uploads or form delivery.

## Isolated Test Deployment

- Test branch: `analytics/posthog-test`.
- Test frontend: `https://tanda-website-posthog-test.onrender.com`.
- Test backend: `https://tanda-pro-cleaning-api-posthog-test.onrender.com`.
- Test analytics endpoint: `GET /api/analytics-config` returns the browser-safe test configuration with no private project key written to source control or reports.
- The test frontend points only to the isolated test backend. Production API requests were explicitly blocked during controlled browser QA.
- No SMTP, SMS, CRM, webhook or production notification credentials are configured on the isolated backend.
- A controlled synthetic journey and an actual PostHog test-project session recording were inspected. Captured browser payloads, including all `$snapshot` payloads, contained none of the synthetic name, phone, email, address, message, upload filename or image-preview marker.
- The current production Render services and `tandaprocleaning.com.au` were not changed by this test deployment.

## Environment Variables

| Variable | Required to enable | Default | Purpose |
| --- | --- | --- | --- |
| `ANALYTICS_ENABLED` | Yes | `false` | Master switch. |
| `POSTHOG_PROJECT_API_KEY` | Yes | empty | Client-visible project token supplied by Render. |
| `POSTHOG_HOST` | Yes | empty in code | Regional ingestion host, for example `https://us.i.posthog.com`. |
| `POSTHOG_UI_HOST` | No | empty | Matching PostHog application host. |
| `ANALYTICS_ENVIRONMENT` | Yes | `production` | One of production, preview, staging, development or test. |
| `ANALYTICS_RELEASE` | No | Render commit or `unversioned` | Website release identifier. |
| `POSTHOG_SESSION_RECORDING_ENABLED` | No | `false` | Separate recording gate. Keep off until masking is reviewed. |
| `POSTHOG_HEATMAPS_ENABLED` | No | `false` | Separate heatmap/autocapture gate. |
| `ANALYTICS_PERFORMANCE_SAMPLE_RATE` | No | `0.25` | Core Web Vitals sample from 0 to 1. |
| `ANALYTICS_CAPTURE_INTERNAL_TRAFFIC` | No | `false` | Keeps marked staff browsers excluded. |
| `ANALYTICS_CAPTURE_GOOGLE_CLICK_ID` | No | `false` | Reserved. Raw click IDs are not currently captured. |
| `ANALYTICS_DEBUG` | No | `false` | Non-production diagnostics only; no customer payload logging. |

Use a separate PostHog project or project token for test/staging. Never point local or preview environments at the production project.

## Consent and Initialisation

PostHog loads asynchronously only after all of these are true: the existing `Accept Analytics` choice is stored, `ANALYTICS_ENABLED=true`, the key and HTTPS host are valid, Do Not Track is off, the browser is not marked internal, and the user agent is not a known bot. Sensitive DOM surfaces are marked before the SDK can load. Declining removes stored attribution and unfinished analytics funnel state.

Pages reached before a consent decision are not tracked. Pages without a visible banner can use a consent decision already stored on the main website; they do not silently opt visitors in.

## Common Event Properties

All custom events pass through a strict event-name and property allowlist. Common properties include sanitised `page_path`, `page_type`, `environment`, `release`, `is_test`, `is_internal`, anonymous `page_view_id` and `journey_id`, device/screen/viewport categories, browser/OS family, visitor type, referring domain, traffic type, and sanitised first/last attribution. Query strings and fragments are removed.

Never allowed: names, phone numbers, emails, addresses, precise location, notes, messages, descriptions, filenames, uploads, image data, form values, payment details, cookies, tokens, headers, request/response bodies, stack traces, full URLs, raw Google click IDs, quote prices or revenue.

## Event Catalogue

| Event | Trigger and purpose | Event-specific allowed properties | Deduplication | Main report |
| --- | --- | --- | --- | --- |
| `page_viewed` | One permitted page load | previous/entry/landing path | page-view UUID | Behaviour |
| `page_engaged` | Page exit/lifecycle summary | active, idle, total time; deepest scroll/section | once per page | Behaviour |
| `section_viewed` | Section reaches 25% visibility | section, previous section, visible percent | page + section | Behaviour |
| `section_engaged` | Visible active time is at least 500 ms | section, active time, visibility, next safe action | page + section | Behaviour |
| `scroll_depth_reached` | 10/25/50/75/90/100% | milestone, deepest section, elapsed time, scrolled up | page + milestone | Behaviour |
| `service_clicked` | Service card/link action | service, section, element type/position, safe destination | interaction UUID | Service interest |
| `cta_clicked` | Known CTA action | CTA ID/label, placement, destination, service, scroll/estimate state | interaction UUID | Behaviour/conversion |
| `contact_clicked` | Phone, email or SMS link | contact type, placement, section, service | interaction UUID | Conversion |
| `messenger_button_clicked` | Floating Messenger contact button opens | CTA/contact type, placement, safe destination, page/device category | interaction UUID | Conversion |
| `quote_form_viewed` | Quote form reaches 20% visibility | form ID/location, trigger | page view | Quote funnel |
| `quote_form_started` | First meaningful form interaction | form, safe step | anonymous journey | Quote funnel |
| `quote_step_viewed` | First view of a safe funnel step | step, previous step, trigger | page + step | Quote funnel |
| `quote_step_completed` | Required safe fields in a step validate | step time, furthest step, post-estimate state | journey + step | Quote funnel |
| `quote_step_returned` | Step revisited or back control used | step, previous step, direction/revisit count | interaction UUID | Friction |
| `quote_service_selected` | Service or safe option ID added | service/option, count, step, post-estimate state | interaction UUID | Service/quote |
| `quote_service_removed` | Service or safe option ID removed | service/option, count, step, post-estimate state | interaction UUID | Service/quote |
| `quote_estimate_viewed` | Estimate panel becomes visible | price-shown boolean, service count, safe step | journey | Quote conversion |
| `quote_validation_failed` | Browser validation rejects a field | safe field/step, category, count | throttled by interaction | Friction |
| `quote_upload_attempted` | File control receives files | count/size buckets only | interaction UUID | Quote/friction |
| `quote_upload_succeeded` | Local file checks pass | count/size buckets only | interaction UUID | Quote |
| `quote_upload_failed` | Local file checks fail | rejection category and count bucket | interaction UUID | Friction |
| `quote_submission_attempted` | Valid submit event starts | random submission ID, furthest step, estimate/service state | submission UUID | Quote funnel |
| `quote_submitted` | Quote API returns success | random backend analytics ID, duration/status, delivery category | persistent analytics lead UUID | Quote funnel |
| `quote_submission_failed` | Request fails, rejects or times out | duration, HTTP status, safe error category/code | interaction UUID | Reliability |
| `quote_form_abandoned` | Meaningful unfinished journey exits or is reconciled | furthest steps, duration, validation count, estimate/service state | journey + page/update | Abandonment |
| `quote_form_reset` | Customer resets an active form | furthest steps and estimate state | interaction UUID | Friction |
| `quote_form_progress_lost` | Recent safe funnel state is found after an unrestored reload | furthest steps, duration, trigger | persistent journey + update | Friction |
| `subscription_started` | First builder interaction | form/location | journey | Subscription |
| `subscription_option_viewed` | Package/service option selected or package CTA used | package/option/service safe IDs | interaction UUID | Subscription |
| `subscription_completed` | Subscription API returns success | package, service count, duration/status | persistent backend UUID | Subscription |
| `rage_click_detected` | Three rapid clicks or repeated changes/failures | friction type, count, placement/step | page + target thresholds | Friction |
| `dead_click_detected` | Safe non-form button has no response or quote step pauses 90 seconds | friction type, safe element/step, pause duration | page/step | Friction |
| `website_error_detected` | Unhandled/handled safe failure | feature, safe category/code | interaction UUID | Reliability |
| `resource_load_failed` | Image/script/style load fails | resource type/domain and safe code | page + resource | Reliability |
| `web_vital_measured` | Sampled LCP/INP/CLS/TTFB/FCP/load/resource metric | metric, numeric value/rating, sample rate | page + metric | Performance |
| `analytics_initialization_failed` | PostHog config/script/init is unavailable | safe category only; also reported to consented GA4 | page/session | Reliability |

All events are disabled in unconfigured environments. `environment`, `is_test`, release and internal status support project-level exclusion. Important quote/subscription successes carry stable `$insert_id` values.

## Privacy Controls for Heatmaps and Recordings

- Recordings and heatmaps default off independently of the master switch.
- Every form, input, textarea, select, upload control, customer result panel, generated preview and blob/data image is marked `ph-no-capture` and excluded from autocapture.
- `maskAllInputs`, `mask_all_text` and `mask_all_element_attributes` are enabled.
- Forms and customer-content containers use the recording `blockSelector`.
- Console recording, exception autocapture, pageview autocapture and pageleave autocapture are disabled.
- Network bodies and headers are removed; URLs are reduced to scheme, host and path.
- Heatmap autocapture is limited to non-form anchor/button clicks. Element text and attributes are removed in `before_send`; only tag position and click geometry remain.
- A real test recording and outgoing `$snapshot`/`$autocapture` review is mandatory before enabling either production flag.

## Attribution and Abandonment

After consent, the first valid touch is retained and the most recent touch is updated in first-party storage. UTM values are length-limited and checked for PII. Only `gclidPresent: true/false` is retained. The latest safe quote state contains anonymous IDs, safe step IDs, timing, counts and service IDs only. Exits after five seconds emit abandonment where possible; stale state is reconciled on the next visit, and a recent reload without restored progress emits `quote_form_progress_lost`.

## Internal, Test and Bot Filtering

Mark a staff browser in its console with `TandaAnalytics.markInternal(true)`, then reload. Restore it with `TandaAnalytics.markInternal(false)`. No IP rule is used. Known bots, webdriver sessions, Do Not Track, local/preview/test environments and duplicate submissions are filtered or labelled. For QA, use a test project and `ANALYTICS_ENVIRONMENT=test`.

## PostHog Dashboard Setup

Create each dashboard with a global filter `environment = production` and `is_internal = false`. Exclude test cohorts and known bot traffic.

1. **Customer Behaviour**: trends for `page_viewed` by page/device/visitor type; average `page_engaged.active_time_ms`; `section_viewed` reach; `section_engaged` time; scroll milestone distribution; paths from `page_viewed` to CTA/contact/quote start.
2. **Service Interest**: `service_clicked` and `quote_service_selected` trends broken down by service, source and device; funnels from service click to quote start and quote submitted; `subscription_option_viewed` by package.
3. **Quote Conversion**: ordered funnel `quote_form_viewed -> quote_form_started -> quote_step_completed` (one step filter per safe step) `-> quote_submission_attempted -> quote_submitted`; breakdowns by service, device, browser, source and visitor type. Add abandonment, validation, upload and estimate continuation tables.
4. **Website Friction**: trends/tables for rage/dead clicks, repeated validation, retries, progress loss, long pauses, upload failures and post-estimate abandonment.
5. **Reliability and Performance**: website/resource errors, quote/subscription failures and timeouts, Web Vitals by page/device/browser/release, and funnel conversion split by metric rating.
6. **Marketing and Business**: submitted quotes by first/last source, campaign, landing page and service. Leave qualified/approved/booked/revenue/cost/ROAS panels unconfigured until the CRM integration is approved and active.

Recording filters, after the separate recording gate is approved: quote started without submitted; abandonment by furthest step; validation count at least 3; upload/submission failure; rage/dead click; mobile plus poor Web Vital; estimate viewed plus abandonment.

## Alerts to Configure

Use PostHog subscriptions/alerts or the existing monitor. Do not include person properties.

- `quote_submitted = 0` for 60 minutes during 07:00-21:00 AEST, after a 14-day baseline exists.
- Quote starts fall more than 40% versus the same weekday 4-week average for two consecutive hours.
- Abandonment rate rises above 65% and at least 10 starts occur in 6 hours.
- Quote submission failures exceed 3 in 30 minutes or 10% of attempts with at least 10 attempts.
- Timeouts exceed 2 in 30 minutes; upload failures exceed 5 in 60 minutes.
- JavaScript/resource errors exceed 10 in 30 minutes or triple the 7-day hourly baseline.
- Poor mobile LCP exceeds 40% or p75 LCP exceeds 4 seconds over 24 hours with at least 50 samples.
- No `page_viewed` event arrives for 30 minutes during normal traffic hours.
- `analytics_initialization_failed` exceeds 3 in 30 minutes.
- Review Google Ads landing-page conversion separately if it changes by more than 35% week over week after at least 20 conversions.

## Business Outcome Interface

The backend stores a random `analyticsLeadId` with each lead and returns it after success. `buildBusinessOutcomeEvent` is a pure, uncalled function prepared for an authenticated future Command Centre/CRM integration. If explicitly approved later, the current interface would send only random analytics lead ID, one allowlisted outcome (`lead_created`, `quote_sent`, `booking_confirmed`, `job_completed` or `lead_lost`), occurrence time and an idempotency UUID. It does not send lead status today, and quote values, revenue, customer identity and sequential database IDs are not implemented. Backend mapping, role access, retention, deduplication and a separate user approval remain mandatory before activation.

## Safe Disable and Future Testing

Set `ANALYTICS_ENABLED=false` to stop PostHog without changing the website. Keep the Google configuration untouched. For each future change run:

```powershell
node --test scripts/analytics.test.mjs
node --test backend/test/analytics-config.test.mjs
node scripts/verify-analytics-integration.mjs
npm --prefix backend test
```

Then use a test project and synthetic values to verify consent accepted/denied, DNT, internal flag, script blocking, desktop/mobile/tablet, navigation, scroll/sections, every service/CTA/contact type, all quote steps and errors, estimate, safe upload categories, mocked success/failure/timeout, abandonment reconciliation and subscription success. Inspect PostHog payloads and recordings for names, phone/email/address, form values, notes, filenames, images, query strings, headers, bodies, tokens and stack data. Do not submit a real customer quote or upload a real image during QA.

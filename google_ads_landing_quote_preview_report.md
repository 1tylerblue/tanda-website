# Google Ads Landing Quote Preview Report

Status: READY FOR PREVIEW DEPLOYMENT

## Scope

Four Google Ads landing pages now provide an embedded, service-specific fast quote form:

- Window Cleaning
- Pressure Cleaning
- House Washing / Soft Washing
- Roof Cleaning / Roof Soft Washing

The visitor provides name, mobile number and suburb or postcode. Email, message and up to three JPG, PNG or WebP photos are optional. The service is preselected from the landing page and is never requested again.

## Safety and lead handling

- The compact form uses the existing `/api/leads` pipeline with a canonical service identifier.
- The backend regenerates the customer-facing service scope and marks compact requests for manual review instead of inventing a price.
- Attribution retains the landing path, UTMs and Google click identifiers in the lead pipeline without exposing them in analytics.
- Uploads are limited to validated JPEG, PNG and WebP data under 4 MB each; executable uploads are rejected.
- Local browser testing used delivery-disabled mode and TEST-only data. No production endpoint, email, SMS, CRM record, job, notification or paid conversion was used.

## Tracking

- Existing Google Ads identifiers remain unchanged: `AW-11132030271` and `AW-11132030271/8PYfCNyuw9QcEL-albwp`.
- Quote conversion code runs only after a successful API response and has an in-page duplicate guard.
- Google Ads loading is restricted to the two production domains, preventing preview and local QA from sending Google Ads page views or conversions.
- Privacy-safe PostHog events use only allowlisted properties including service, page, device, CTA location, form variant, traffic type, photo-present boolean and error category.

## QA completed

- `git diff --check`
- JavaScript syntax checks for frontend and backend modules
- `npm --prefix backend test`: 25 passed, 0 failed
- `node --test scripts/analytics.test.mjs`: 10 passed, 0 failed
- `node --test backend/test/analytics-config.test.mjs`: 5 passed, 0 failed
- Static local-link validation: 24 HTML pages, 0 missing local targets
- Desktop success journey against an isolated delivery-disabled local backend
- Mocked HTTP 400 and HTTP 500 browser journeys: form values retained and no success state shown
- Desktop and mobile visual checks, including a 390 x 844 mobile layout
- Browser console/network review after the final fix: 0 website errors and no external Google Ads request from local QA

## Approval boundary

This work is local and has not been committed, pushed, preview-deployed or production-deployed. A Render preview must use an isolated frontend and backend, with `LEAD_DELIVERY_MODE=disabled`, before it can be presented for production approval.

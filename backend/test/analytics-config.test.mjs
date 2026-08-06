import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyticsInternals,
  buildBusinessOutcomeEvent,
  createAnalyticsLeadId,
  getPublicAnalyticsConfig,
  normalizeAnalyticsContext,
} from '../src/analytics.js';

test('public analytics config is off by default and contains no private credentials', () => {
  const config = getPublicAnalyticsConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.sessionRecordingEnabled, false);
  assert.equal(config.heatmapsEnabled, false);
  assert.deepEqual(Object.keys(config).includes('secret'), false);
});

test('public analytics config requires enable flag, key and valid host', () => {
  const config = getPublicAnalyticsConfig({
    ANALYTICS_ENABLED: 'true',
    ANALYTICS_ENVIRONMENT: 'test',
    POSTHOG_PROJECT_API_KEY: 'phc_test',
    POSTHOG_HOST: 'https://us.i.posthog.com',
    POSTHOG_SESSION_RECORDING_ENABLED: 'true',
  });
  assert.equal(config.enabled, true);
  assert.equal(config.environment, 'test');
  assert.equal(config.sessionRecordingEnabled, true);
  assert.equal(config.heatmapsEnabled, false);
});

test('analytics lead identifiers are random UUIDs', () => {
  const first = createAnalyticsLeadId();
  const second = createAnalyticsLeadId();
  assert.match(first, /^[a-f0-9-]{36}$/i);
  assert.notEqual(first, second);
});

test('lead context is allowlisted and strips query strings and personal values', () => {
  const context = normalizeAnalyticsContext({
    journeyId: 'f34d7201-8c29-4f26-9663-b91b50fba122',
    submissionId: '049538b7-d6ac-4f64-9af5-c88f62a617c8',
    environment: 'preview',
    visitorType: 'returning',
    pagePath: '/index.html?email=customer@example.com',
    customerName: 'Not allowed',
    firstTouch: {
      source: 'google',
      campaign: 'customer@example.com',
      landingPage: '/?address=12+Main+Street',
      gclid: 'not-accepted',
      gclidPresent: true,
    },
  });
  assert.equal(context.pagePath, '/index.html');
  assert.equal(context.firstTouch.campaign, '');
  assert.equal(context.firstTouch.landingPage, '/');
  assert.equal(context.firstTouch.gclidPresent, true);
  assert.equal('customerName' in context, false);
  assert.equal(JSON.stringify(context).includes('not-accepted'), false);
});

test('future business outcome payload is anonymous, idempotent and not wired', () => {
  const analyticsLeadId = createAnalyticsLeadId();
  const idempotencyKey = createAnalyticsLeadId();
  const event = buildBusinessOutcomeEvent({
    analyticsLeadId,
    outcomeType: 'booking_confirmed',
    idempotencyKey,
    occurredAt: '2026-08-06T00:00:00.000Z',
  });
  assert.equal(event.distinctId, analyticsLeadId);
  assert.equal(event.insertId, idempotencyKey);
  assert.equal(event.properties.outcome_type, 'booking_confirmed');
  assert.equal('value' in event.properties, false);
  assert.equal(buildBusinessOutcomeEvent({ analyticsLeadId, outcomeType: 'revenue', idempotencyKey }), null);
  assert.equal(analyticsInternals.containsPersonalData('customer@example.com'), true);
});

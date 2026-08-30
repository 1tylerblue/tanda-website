import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const analytics = require('../analytics.js');

test('analytics stays disabled without a complete public configuration', () => {
  assert.equal(analytics.normalizeConfig({ enabled: true }).enabled, false);
  assert.equal(analytics.normalizeConfig({ enabled: true, projectKey: 'phc_test', host: 'not-a-url' }).enabled, false);
});

test('analytics normalizes a valid environment-backed configuration', () => {
  const config = analytics.normalizeConfig({
    enabled: 'true',
    projectKey: 'phc_test',
    host: 'https://us.i.posthog.com/path',
    uiHost: 'https://us.posthog.com/project/1',
    environment: 'staging',
    performanceSampleRate: 2,
    sessionRecordingEnabled: true,
  });
  assert.equal(config.enabled, true);
  assert.equal(config.host, 'https://us.i.posthog.com');
  assert.equal(config.uiHost, 'https://us.posthog.com');
  assert.equal(config.environment, 'staging');
  assert.equal(config.performanceSampleRate, 1);
  assert.equal(config.sessionRecordingEnabled, true);
});

test('paths and URLs discard query strings, fragments and duplicate slashes', () => {
  assert.equal(analytics.sanitizePath('https://example.com//quote/?email=a@example.com#done'), '/quote/');
  assert.equal(analytics.sanitizeUrl('https://example.com/quote?address=12+Main+St#done'), 'https://example.com/quote');
});

test('attribution stores sanitised first and last touches without a click identifier', () => {
  const first = analytics.inferTrafficTouch(
    'https://www.tandaprocleaning.com.au/?utm_source=Google&utm_medium=cpc&utm_campaign=Winter&gclid=SECRET',
    '',
    1,
  );
  const last = analytics.inferTrafficTouch(
    'https://www.tandaprocleaning.com.au/gallery.html?utm_source=facebook&utm_medium=social&utm_campaign=Gallery',
    'https://facebook.com/post/1',
    2,
  );
  const merged = analytics.mergeAttribution({ firstTouch: first, lastTouch: first }, last);
  assert.equal(merged.firstTouch.source, 'google');
  assert.equal(merged.firstTouch.gclidPresent, true);
  assert.equal(JSON.stringify(merged).includes('SECRET'), false);
  assert.equal(merged.lastTouch.source, 'facebook');
  assert.equal(merged.lastTouch.landingPage, '/gallery.html');
});

test('custom events allow safe schema properties and remove personal information', () => {
  const event = analytics.sanitizeEvent('web_vital_measured', {
    metric_name: 'lcp',
    metric_value: 1200,
    cta_label: 'a.person@example.com',
    notes: 'customer notes',
    page_path: '/index.html?phone=0466224927',
  });
  assert.deepEqual(event, {
    event: 'web_vital_measured',
    properties: {
      metric_name: 'lcp',
      metric_value: 1200,
      page_path: '/index.html',
    },
  });
  assert.equal(analytics.sanitizeEvent('made_up_event', {}), null);
});

test('messenger button click keeps only privacy-safe contact properties', () => {
  const event = analytics.sanitizeEvent('messenger_button_clicked', {
    cta_id: 'messenger_bottom_right',
    cta_label: 'message_us',
    placement: 'floating_contact',
    destination_type: 'social',
    contact_type: 'messenger',
    page_path: '/services/window-cleaning-gold-coast.html?name=private',
    message: 'private customer message',
    phone: '0400 000 000',
  });

  assert.deepEqual(event, {
    event: 'messenger_button_clicked',
    properties: {
      cta_id: 'messenger_bottom_right',
      cta_label: 'message_us',
      placement: 'floating_contact',
      destination_type: 'social',
      contact_type: 'messenger',
      page_path: '/services/window-cleaning-gold-coast.html',
    },
  });
});

test('autocapture envelopes keep heatmap geometry but remove text and attributes', () => {
  const event = analytics.sanitizePostHogEnvelope({
    event: '$autocapture',
    properties: {
      $token: 'phc_abcdefghijklmnopqrstuvwxyz123456',
      distinct_id: '019fd7d0-42d9-747c-af70-e23bfb926c15',
      $event_type: 'click',
      $current_url: 'https://example.com/index.html?email=a@example.com',
      $x: 20,
      $y: 30,
      $element_text: 'Call 0466 224 927',
      $elements: [{ tag_name: 'button', nth_child: 2, nth_of_type: 1, attr__aria_label: 'Customer address' }],
    },
  });
  assert.equal(event.properties.$current_url, 'https://example.com/index.html');
  assert.equal('$element_text' in event.properties, false);
  assert.equal(event.properties.$token, 'phc_abcdefghijklmnopqrstuvwxyz123456');
  assert.equal(event.properties.distinct_id, '019fd7d0-42d9-747c-af70-e23bfb926c15');
  assert.deepEqual(event.properties.$elements, [{ tag_name: 'button', nth_child: 2, nth_of_type: 1 }]);
});

test('custom event envelopes retain only valid anonymous PostHog transport properties', () => {
  const event = analytics.sanitizePostHogEnvelope({
    event: 'quote_submitted',
    properties: {
      token: 'phc_abcdefghijklmnopqrstuvwxyz123456',
      distinct_id: '019fd7d0-42d9-747c-af70-e23bfb926c15',
      $device_id: '019fd7d0-42d9-747c-af70-e23bfb926c15',
      customer_name: 'Private Customer',
      email: 'private@example.com',
      http_status: 201,
    },
  });
  assert.equal(event.properties.token, 'phc_abcdefghijklmnopqrstuvwxyz123456');
  assert.equal(event.properties.distinct_id, '019fd7d0-42d9-747c-af70-e23bfb926c15');
  assert.equal(event.properties.$device_id, '019fd7d0-42d9-747c-af70-e23bfb926c15');
  assert.equal(event.properties.http_status, 201);
  assert.equal('customer_name' in event.properties, false);
  assert.equal('email' in event.properties, false);
});

test('PostHog SDK events keep only a validated routing token', () => {
  const event = analytics.sanitizePostHogEnvelope({
    event: '$snapshot',
    properties: {
      token: 'phc_abcdefghijklmnopqrstuvwxyz123456',
      distinct_id: '019fd7d0-42d9-747c-af70-e23bfb926c15',
      filename: 'private-customer-photo.jpg',
    },
  });
  assert.equal(event.properties.token, 'phc_abcdefghijklmnopqrstuvwxyz123456');
  assert.equal(event.properties.distinct_id, '019fd7d0-42d9-747c-af70-e23bfb926c15');
  assert.equal('filename' in event.properties, false);

  const invalid = analytics.sanitizePostHogEnvelope({
    event: '$snapshot',
    properties: { token: 'not-a-project-token' },
  });
  assert.equal('token' in invalid.properties, false);
});

test('bot and service normalization cover the website service catalogue', () => {
  assert.equal(analytics.isLikelyBot('Googlebot/2.1'), true);
  assert.equal(analytics.isLikelyBot('Mozilla/5.0', false), false);
  assert.equal(analytics.normalizeServiceId('house-building-washing'), 'house_washing');
  assert.equal(analytics.normalizeServiceId('gym-specialty-cleaning'), 'gym_specialty_cleaning');
  assert.equal(analytics.normalizeServiceId('odour-sanitising'), 'odour_sanitising');
});

test('analytics configuration retries only transient failures', () => {
  assert.equal(analytics.shouldRetryConfigRequest({ name: 'AbortError' }), true);
  assert.equal(analytics.shouldRetryConfigRequest({ name: 'TypeError' }), true);
  assert.equal(analytics.shouldRetryConfigRequest({ status: 503 }), true);
  assert.equal(analytics.shouldRetryConfigRequest({ status: 404 }), false);
  assert.equal(analytics.shouldRetryConfigRequest(new Error('runtime failure')), false);
});

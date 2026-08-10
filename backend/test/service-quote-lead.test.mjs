import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.LEAD_DELIVERY_MODE = 'disabled';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tanda-service-quote-test-'));

const { app } = await import('../src/server.js');
const server = app.listen(0);
const port = server.address().port;

test.after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

async function submit(body) {
  const response = await fetch(`http://127.0.0.1:${port}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('compact service quote creates one manual-review lead without external delivery', async () => {
  const { response, body } = await submit({
    formVariant: 'service_landing_compact',
    serviceId: 'window_cleaning',
    firstName: 'TEST - conversion verification',
    phone: '0400000000',
    address: 'Test Suburb 4217',
    email: '',
    notes: 'TEST - quote-form conversion verification - do not contact',
    agree: true,
    formElapsedMs: 3000,
    clientSubmittedAt: '2026-08-10T00:00:00.000Z',
    marketingAttribution: {
      source: 'google_ads',
      landingPagePath: '/services/window-cleaning-gold-coast.html',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'window-cleaning',
      gclid: 'test-click-id_123',
    },
  });

  assert.equal(response.status, 201);
  assert.equal(body.lead.formVariant, 'service_landing_compact');
  assert.equal(body.lead.serviceId, 'window_cleaning');
  assert.equal(body.lead.service, 'Window Cleaning');
  assert.equal(body.lead.manualReviewRequired, true);
  assert.equal(body.lead.recommendedEstimate, null);
  assert.equal(body.lead.marketingAttribution.gclid, 'test-click-id_123');
  assert.match(body.deliveryStatus.email, /Delivery disabled for isolated test environment/);
  assert.match(body.lead.customerScope.join(' '), /Window glass/);
});

test('compact service quote rejects an unsupported service before creating a lead', async () => {
  const { response, body } = await submit({
    formVariant: 'service_landing_compact',
    serviceId: 'invented_service',
    firstName: 'TEST',
    phone: '0400000000',
    address: 'Test Suburb',
    agree: true,
    formElapsedMs: 3000,
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /supported service/i);
});

test('compact service quote rejects unsafe upload data', async () => {
  const { response, body } = await submit({
    formVariant: 'service_landing_compact',
    serviceId: 'roof_cleaning',
    firstName: 'TEST',
    phone: '0400000000',
    address: 'Test Suburb',
    agree: true,
    formElapsedMs: 3000,
    photoUploads: [{
      name: 'not-an-image.exe',
      type: 'application/octet-stream',
      size: 12,
      dataUrl: 'data:application/octet-stream;base64,ZXhlY3V0YWJsZQ==',
    }],
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /Photos must be JPG, PNG or WebP/i);
});

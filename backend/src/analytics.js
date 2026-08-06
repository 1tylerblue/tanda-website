import { randomUUID } from 'crypto';

const ENVIRONMENTS = new Set(['production', 'preview', 'staging', 'development', 'test']);
const VISITOR_TYPES = new Set(['new', 'returning']);
const OUTCOME_TYPES = new Set(['lead_created', 'quote_sent', 'booking_confirmed', 'job_completed', 'lead_lost']);
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const ADDRESS_PATTERN = /\b\d{1,6}\s+[A-Za-z][A-Za-z .'-]{1,40}\s(?:street|st|road|rd|avenue|ave|drive|dr|court|ct|place|pl|lane|ln|boulevard|blvd|highway|hwy)\b/i;

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function containsPersonalData(value) {
  const text = String(value ?? '');
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text) || ADDRESS_PATTERN.test(text);
}

function safeIdentifier(value, fallback = '') {
  const result = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(result) ? result : fallback;
}

function safeCampaignValue(value) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
  if (!text || containsPersonalData(text)) return '';
  return text.replace(/[^A-Za-z0-9 _./:+-]/g, '').trim();
}

function safePath(value) {
  try {
    const url = new URL(String(value || '/'), 'https://analytics.invalid');
    const path = (url.pathname || '/').replace(/\/{2,}/g, '/').slice(0, 240);
    return path.startsWith('/') ? path : '/';
  } catch {
    return '/';
  }
}

function safeEnvironment(value, fallback = 'production') {
  const normalized = String(value || '').trim().toLowerCase();
  return ENVIRONMENTS.has(normalized) ? normalized : fallback;
}

function safeUuid(value) {
  const normalized = String(value || '').trim();
  return UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : '';
}

function normalizeTouch(value) {
  const touch = value && typeof value === 'object' ? value : {};
  return {
    source: safeCampaignValue(touch.source).toLowerCase(),
    medium: safeCampaignValue(touch.medium).toLowerCase(),
    campaign: safeCampaignValue(touch.campaign),
    content: safeCampaignValue(touch.content),
    term: safeCampaignValue(touch.term),
    landingPage: safePath(touch.landingPage),
    gclidPresent: Boolean(touch.gclidPresent),
  };
}

export function getPublicAnalyticsConfig(env = process.env) {
  const projectKey = String(env.POSTHOG_PROJECT_API_KEY || '').trim().slice(0, 220);
  let host = '';
  let uiHost = '';
  try {
    const parsed = new URL(String(env.POSTHOG_HOST || ''));
    if (parsed.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsed.hostname)) host = parsed.origin;
  } catch {
    host = '';
  }
  try {
    const parsed = new URL(String(env.POSTHOG_UI_HOST || ''));
    if (parsed.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsed.hostname)) uiHost = parsed.origin;
  } catch {
    uiHost = '';
  }

  const environment = safeEnvironment(env.ANALYTICS_ENVIRONMENT, env.NODE_ENV === 'test' ? 'test' : 'production');
  const configured = Boolean(projectKey && host);
  return {
    enabled: toBoolean(env.ANALYTICS_ENABLED, false) && configured,
    projectKey,
    host,
    uiHost,
    environment,
    release: safeCampaignValue(env.ANALYTICS_RELEASE || env.RENDER_GIT_COMMIT || 'unversioned') || 'unversioned',
    sessionRecordingEnabled: configured && toBoolean(env.POSTHOG_SESSION_RECORDING_ENABLED, false),
    heatmapsEnabled: configured && toBoolean(env.POSTHOG_HEATMAPS_ENABLED, false),
    performanceSampleRate: clampNumber(env.ANALYTICS_PERFORMANCE_SAMPLE_RATE, 0, 1, 0.25),
    captureInternalTraffic: configured && toBoolean(env.ANALYTICS_CAPTURE_INTERNAL_TRAFFIC, false),
    captureGoogleClickId: configured && toBoolean(env.ANALYTICS_CAPTURE_GOOGLE_CLICK_ID, false),
    debug: environment !== 'production' && toBoolean(env.ANALYTICS_DEBUG, false),
  };
}

export function createAnalyticsLeadId() {
  return randomUUID();
}

export function normalizeAnalyticsContext(value) {
  const context = value && typeof value === 'object' ? value : {};
  const visitorType = String(context.visitorType || '').trim().toLowerCase();
  return {
    journeyId: safeUuid(context.journeyId),
    submissionId: safeUuid(context.submissionId),
    environment: safeEnvironment(context.environment, 'production'),
    release: safeCampaignValue(context.release || 'unversioned') || 'unversioned',
    visitorType: VISITOR_TYPES.has(visitorType) ? visitorType : 'new',
    pagePath: safePath(context.pagePath),
    firstTouch: normalizeTouch(context.firstTouch),
    lastTouch: normalizeTouch(context.lastTouch),
  };
}

// Prepared for a future authenticated CRM integration. Nothing calls or transmits this today.
export function buildBusinessOutcomeEvent({ analyticsLeadId, outcomeType, idempotencyKey, occurredAt } = {}) {
  const safeLeadId = safeUuid(analyticsLeadId);
  const safeOutcome = safeIdentifier(outcomeType);
  const safeKey = safeUuid(idempotencyKey);
  if (!safeLeadId || !OUTCOME_TYPES.has(safeOutcome) || !safeKey) return null;
  const timestamp = new Date(occurredAt || Date.now());
  if (Number.isNaN(timestamp.getTime())) return null;
  return Object.freeze({
    event: 'business_outcome_recorded',
    distinctId: safeLeadId,
    insertId: safeKey,
    properties: Object.freeze({
      analytics_lead_id: safeLeadId,
      outcome_type: safeOutcome,
      occurred_at: timestamp.toISOString(),
    }),
  });
}

export const analyticsInternals = Object.freeze({
  containsPersonalData,
  safeCampaignValue,
  safeEnvironment,
  safeIdentifier,
  safePath,
  safeUuid,
});

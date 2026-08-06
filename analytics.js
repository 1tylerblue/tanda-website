(function analyticsModule(globalObject, factory) {
  'use strict';

  const analytics = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = analytics.core;
  }
  if (globalObject && globalObject.document) {
    globalObject.TandaAnalyticsCore = analytics.core;
    globalObject.TandaAnalytics = analytics.runtime;
  }
})(typeof globalThis === 'object' ? globalThis : this, function createAnalytics(globalObject) {
  'use strict';

  const EVENT_NAMES = new Set([
    'page_viewed',
    'page_engaged',
    'section_viewed',
    'section_engaged',
    'scroll_depth_reached',
    'service_clicked',
    'cta_clicked',
    'contact_clicked',
    'quote_form_viewed',
    'quote_form_started',
    'quote_step_viewed',
    'quote_step_completed',
    'quote_step_returned',
    'quote_service_selected',
    'quote_service_removed',
    'quote_estimate_viewed',
    'quote_validation_failed',
    'quote_upload_attempted',
    'quote_upload_succeeded',
    'quote_upload_failed',
    'quote_submission_attempted',
    'quote_submitted',
    'quote_submission_failed',
    'quote_form_abandoned',
    'quote_form_reset',
    'quote_form_progress_lost',
    'subscription_started',
    'subscription_option_viewed',
    'subscription_completed',
    'rage_click_detected',
    'dead_click_detected',
    'website_error_detected',
    'resource_load_failed',
    'web_vital_measured',
    'analytics_initialization_failed',
  ]);

  const COMMON_PROPERTY_NAMES = new Set([
    '$insert_id',
    'page_path',
    'page_type',
    'previous_page',
    'landing_page',
    'entry_page',
    'exit_page',
    'environment',
    'release',
    'is_test',
    'is_internal',
    'visitor_type',
    'visit_number_bucket',
    'device_category',
    'screen_category',
    'viewport_category',
    'browser_family',
    'os_family',
    'referring_domain',
    'traffic_type',
    'first_touch_source',
    'first_touch_medium',
    'first_touch_campaign',
    'first_touch_content',
    'first_touch_term',
    'first_touch_landing_page',
    'first_touch_gclid_present',
    'last_touch_source',
    'last_touch_medium',
    'last_touch_campaign',
    'last_touch_content',
    'last_touch_term',
    'last_touch_landing_page',
    'last_touch_gclid_present',
    'page_view_id',
    'journey_id',
    'active_time_ms',
    'engaged_time_ms',
    'total_time_ms',
    'idle_time_ms',
    'section_id',
    'visible_percent',
    'previous_section',
    'next_action',
    'deepest_section',
    'scroll_percent',
    'deepest_scroll_percent',
    'time_to_milestone_ms',
    'scrolled_up',
    'service_id',
    'service_context',
    'element_type',
    'element_position',
    'destination_type',
    'destination_path',
    'cta_id',
    'cta_label',
    'placement',
    'contact_type',
    'form_id',
    'form_location',
    'step_id',
    'previous_step',
    'furthest_step_viewed',
    'furthest_step_completed',
    'step_time_ms',
    'revisit_count',
    'field_id',
    'validation_category',
    'validation_count',
    'direction',
    'selected_service_count',
    'option_id',
    'package_id',
    'price_was_shown',
    'estimate_was_viewed',
    'continued_after_estimate',
    'file_count_bucket',
    'file_size_bucket',
    'rejection_category',
    'submission_id',
    'analytics_lead_id',
    'duration_ms',
    'response_time_ms',
    'http_status',
    'error_category',
    'error_code',
    'feature',
    'resource_type',
    'resource_domain',
    'metric_name',
    'metric_value',
    'metric_rating',
    'sample_rate',
    'friction_type',
    'click_count',
    'pause_duration_ms',
    'trigger',
    'email_delivery_status',
  ]);

  const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:full_?name|first_?name|last_?name|customer_?name|phone|email|address|street|suburb|postcode|message|notes?|description|filename|file_?name|file_?path|photo|image|upload|payment_?details?|card|token|secret|password|authorization|cookie|query|search|full_?url|request_?body|response_?body|stack)(?:$|_)/i;
  const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
  const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
  const ADDRESS_PATTERN = /\b\d{1,6}\s+[A-Za-z][A-Za-z .'-]{1,40}\s(?:street|st|road|rd|avenue|ave|drive|dr|court|ct|place|pl|lane|ln|boulevard|blvd|highway|hwy)\b/i;
  const SAFE_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
  const ALLOWED_ENVIRONMENTS = new Set(['production', 'preview', 'staging', 'development', 'test']);

  const SERVICE_ALIASES = Object.freeze({
    window: 'window_cleaning',
    windows: 'window_cleaning',
    'window-cleaning': 'window_cleaning',
    'window cleaning': 'window_cleaning',
    'house-washing': 'house_washing',
    'house washing': 'house_washing',
    'house-building-washing': 'house_washing',
    softwashing: 'house_washing',
    'soft washing': 'house_washing',
    'roof-cleaning': 'roof_cleaning',
    'roof cleaning': 'roof_cleaning',
    'gutter-cleaning': 'gutter_cleaning',
    'gutter cleaning': 'gutter_cleaning',
    'pressure-cleaning': 'pressure_cleaning',
    'pressure cleaning': 'pressure_cleaning',
    'pressure washing': 'pressure_cleaning',
    'driveway cleaning': 'driveway_cleaning',
    'solar-panel-cleaning': 'solar_panel_cleaning',
    'solar panel cleaning': 'solar_panel_cleaning',
    'solar cleaning': 'solar_panel_cleaning',
    'carpet-cleaning': 'carpet_cleaning',
    'carpet cleaning': 'carpet_cleaning',
    'tile-grout-cleaning': 'tile_grout_cleaning',
    'tile & grout cleaning': 'tile_grout_cleaning',
    'tile and grout cleaning': 'tile_grout_cleaning',
    'upholstery-cleaning': 'upholstery_cleaning',
    'upholstery cleaning': 'upholstery_cleaning',
    'mattress cleaning': 'mattress_cleaning',
    'pest control': 'pest_control_addon',
    'bin cleaning': 'bin_cleaning',
    packages: 'packages',
    package: 'packages',
    subscriptions: 'subscriptions',
    subscription: 'subscriptions',
    commercial: 'commercial_cleaning',
    'commercial-cleaning': 'commercial_cleaning',
    'commercial cleaning': 'commercial_cleaning',
    'hard-floor-cleaning': 'hard_floor_cleaning',
    'residential-deep-cleaning': 'residential_deep_cleaning',
    'end-of-lease-cleaning': 'end_of_lease_cleaning',
    'hourly-cleaning': 'hourly_cleaning',
    'builders-cleaning': 'builders_cleaning',
    'commercial-additions': 'commercial_cleaning',
    'gym-specialty-cleaning': 'gym_specialty_cleaning',
    'odour-sanitising': 'odour_sanitising',
    strata: 'strata_property_management',
    'property management': 'strata_property_management',
  });

  function toBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
  }

  function clampNumber(value, minimum, maximum, fallback = minimum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function normalizeIdentifier(value, fallback = '') {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    return SAFE_IDENTIFIER_PATTERN.test(normalized) ? normalized : fallback;
  }

  function containsSensitiveValue(value) {
    const text = String(value ?? '');
    return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text) || ADDRESS_PATTERN.test(text);
  }

  function sanitizeCampaignValue(value) {
    let decoded = String(value ?? '');
    try {
      decoded = decodeURIComponent(decoded.replace(/\+/g, ' '));
    } catch {
      // Keep the original value when decoding fails.
    }
    const text = decoded.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
    if (!text || containsSensitiveValue(text)) return '';
    return text.replace(/[^A-Za-z0-9 _./:+-]/g, '').trim();
  }

  function sanitizePath(value, fallback = '/') {
    try {
      const url = new URL(String(value || fallback), 'https://analytics.invalid');
      let pathname = url.pathname || '/';
      pathname = pathname.replace(/\/{2,}/g, '/');
      return pathname.startsWith('/') ? pathname.slice(0, 240) : fallback;
    } catch {
      return fallback;
    }
  }

  function sanitizeUrl(value) {
    try {
      const url = new URL(String(value || ''), 'https://analytics.invalid');
      const path = sanitizePath(url.pathname);
      return url.hostname === 'analytics.invalid' ? path : `${url.protocol}//${url.host}${path}`;
    } catch {
      return '';
    }
  }

  function sanitizeReferringDomain(value) {
    try {
      const url = new URL(String(value || ''));
      return url.hostname.replace(/^www\./i, '').toLowerCase().slice(0, 120);
    } catch {
      return '';
    }
  }

  function normalizeServiceId(value) {
    const text = String(value ?? '').trim().toLowerCase();
    if (!text) return '';
    if (SERVICE_ALIASES[text]) return SERVICE_ALIASES[text];
    const slug = text.replace(/\.html$/i, '').replace(/-gold-coast$/i, '');
    if (SERVICE_ALIASES[slug]) return SERVICE_ALIASES[slug];
    const normalized = normalizeIdentifier(slug);
    return Object.values(SERVICE_ALIASES).includes(normalized) ? normalized : '';
  }

  function sanitizePropertyValue(key, value) {
    if (SENSITIVE_KEY_PATTERN.test(key) && !['browser_family', 'os_family'].includes(key)) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (Array.isArray(value)) {
      const items = value
        .map((item) => sanitizePropertyValue(key, item))
        .filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
        .slice(0, 20);
      return items.length ? items : undefined;
    }
    if (typeof value !== 'string') return undefined;

    if (key.endsWith('_path') || ['page_path', 'previous_page', 'landing_page', 'entry_page', 'exit_page'].includes(key)) {
      return sanitizePath(value);
    }
    if (key.endsWith('_domain') || key === 'referring_domain') return sanitizeReferringDomain(value);
    if (key.includes('campaign') || key.endsWith('_content') || key.endsWith('_term')) return sanitizeCampaignValue(value);
    if (key.endsWith('_source') || key.endsWith('_medium')) return sanitizeCampaignValue(value).toLowerCase();
    if (key.endsWith('_id') || key === '$insert_id') {
      if (key === '$insert_id') return String(value).replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 120);
      return normalizeIdentifier(value);
    }

    const text = value.trim().slice(0, 120);
    if (!text || containsSensitiveValue(text)) return undefined;
    return text;
  }

  function sanitizeEvent(eventName, properties = {}) {
    if (!EVENT_NAMES.has(eventName)) return null;
    const safeProperties = {};
    Object.entries(properties || {}).forEach(([key, value]) => {
      if (!COMMON_PROPERTY_NAMES.has(key)) return;
      const sanitized = sanitizePropertyValue(key, value);
      if (sanitized !== undefined) safeProperties[key] = sanitized;
    });
    return { event: eventName, properties: safeProperties };
  }

  function sanitizePostHogEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object') return null;
    const eventName = String(envelope.event || '');
    const originalProperties = envelope.properties && typeof envelope.properties === 'object' ? envelope.properties : {};
    const properties = { ...originalProperties };

    if (eventName === '$autocapture') {
      const safeProperties = {};
      ['$event_type', '$session_id', '$window_id', '$lib', '$lib_version'].forEach((key) => {
        if (typeof properties[key] === 'string' && !containsSensitiveValue(properties[key])) {
          safeProperties[key] = properties[key].slice(0, 120);
        }
      });
      ['$x', '$y', '$viewport_width', '$viewport_height'].forEach((key) => {
        if (Number.isFinite(Number(properties[key]))) safeProperties[key] = Number(properties[key]);
      });
      if (properties.$current_url) safeProperties.$current_url = sanitizeUrl(properties.$current_url);
      if (properties.$pathname) safeProperties.$pathname = sanitizePath(properties.$pathname);
      if (Array.isArray(properties.$elements)) {
        safeProperties.$elements = properties.$elements.slice(0, 12).map((element) => ({
          tag_name: normalizeIdentifier(element?.tag_name, 'element'),
          nth_child: clampNumber(element?.nth_child, 0, 200, 0),
          nth_of_type: clampNumber(element?.nth_of_type, 0, 200, 0),
        }));
      }
      return { ...envelope, event: eventName, properties: safeProperties };
    }

    Object.keys(properties).forEach((key) => {
      if (SENSITIVE_KEY_PATTERN.test(key) && !key.startsWith('$')) {
        delete properties[key];
        return;
      }
      if (/url|href|pathname/i.test(key)) {
        properties[key] = sanitizeUrl(properties[key]);
        return;
      }
      if (/referrer/i.test(key)) {
        const domain = sanitizeReferringDomain(properties[key]);
        properties[key] = domain ? `https://${domain}/` : '';
        return;
      }
      if (typeof properties[key] === 'string' && containsSensitiveValue(properties[key])) {
        delete properties[key];
      }
    });

    if (EVENT_NAMES.has(eventName)) {
      const safeCustomEvent = sanitizeEvent(eventName, properties);
      if (!safeCustomEvent) return null;
      const postHogSessionProperties = {};
      ['$session_id', '$window_id', '$lib', '$lib_version', '$browser', '$browser_version', '$os', '$os_version'].forEach((key) => {
        if (typeof properties[key] === 'string' && !containsSensitiveValue(properties[key])) {
          postHogSessionProperties[key] = properties[key].slice(0, 120);
        }
      });
      return {
        ...envelope,
        event: safeCustomEvent.event,
        properties: { ...safeCustomEvent.properties, ...postHogSessionProperties },
      };
    }

    return { ...envelope, properties };
  }

  function normalizeConfig(input = {}) {
    const environmentValue = String(input.environment || '').trim().toLowerCase();
    const environment = ALLOWED_ENVIRONMENTS.has(environmentValue) ? environmentValue : 'production';
    const projectKey = String(input.projectKey || input.projectApiKey || '').trim().slice(0, 220);
    let host = '';
    let uiHost = '';
    try {
      const parsedHost = new URL(String(input.host || input.posthogHost || ''));
      if (parsedHost.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsedHost.hostname)) {
        host = parsedHost.origin;
      }
    } catch {
      host = '';
    }
    try {
      const parsedUiHost = new URL(String(input.uiHost || ''));
      if (parsedUiHost.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsedUiHost.hostname)) {
        uiHost = parsedUiHost.origin;
      }
    } catch {
      uiHost = '';
    }

    const enabled = toBoolean(input.enabled) && Boolean(projectKey && host);
    return Object.freeze({
      enabled,
      projectKey,
      host,
      uiHost,
      environment,
      release: sanitizeCampaignValue(input.release || 'unversioned') || 'unversioned',
      sessionRecordingEnabled: enabled && toBoolean(input.sessionRecordingEnabled),
      heatmapsEnabled: enabled && toBoolean(input.heatmapsEnabled),
      performanceSampleRate: clampNumber(input.performanceSampleRate, 0, 1, 0.25),
      captureInternalTraffic: enabled && toBoolean(input.captureInternalTraffic),
      captureGoogleClickId: enabled && toBoolean(input.captureGoogleClickId),
      debug: toBoolean(input.debug) && environment !== 'production',
    });
  }

  function inferTrafficTouch(locationValue, referrerValue, timestamp = Date.now()) {
    let url;
    try {
      url = new URL(String(locationValue || ''), 'https://analytics.invalid');
    } catch {
      url = new URL('https://analytics.invalid/');
    }
    const params = url.searchParams;
    const referringDomain = sanitizeReferringDomain(referrerValue);
    const ownDomain = url.hostname.replace(/^www\./i, '').toLowerCase();
    const externalReferrer = referringDomain && referringDomain !== ownDomain ? referringDomain : '';
    const hasGclid = Boolean(params.get('gclid'));
    const explicitSource = sanitizeCampaignValue(params.get('utm_source')).toLowerCase();
    const explicitMedium = sanitizeCampaignValue(params.get('utm_medium')).toLowerCase();
    let source = explicitSource;
    let medium = explicitMedium;

    if (!source && hasGclid) source = 'google';
    if (!medium && hasGclid) medium = 'cpc';
    if (!source && externalReferrer) source = externalReferrer;
    if (!medium && externalReferrer) {
      medium = /google\.|bing\.|yahoo\.|duckduckgo\./i.test(externalReferrer) ? 'organic' : 'referral';
    }
    if (!source) source = 'direct';
    if (!medium) medium = 'none';

    const trafficType = hasGclid || /(?:cpc|ppc|paid|display)/i.test(medium)
      ? 'paid'
      : medium === 'organic'
        ? 'organic'
        : medium === 'referral'
          ? 'referral'
          : /email/i.test(medium)
            ? 'email'
            : /social/i.test(medium)
              ? 'social'
              : 'direct';

    return Object.freeze({
      source,
      medium,
      campaign: sanitizeCampaignValue(params.get('utm_campaign')),
      content: sanitizeCampaignValue(params.get('utm_content')),
      term: sanitizeCampaignValue(params.get('utm_term')),
      landingPage: sanitizePath(url.pathname),
      referringDomain: externalReferrer,
      gclidPresent: hasGclid,
      trafficType,
      capturedAt: Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now(),
    });
  }

  function mergeAttribution(existing, currentTouch) {
    const safeExisting = existing && typeof existing === 'object' ? existing : {};
    const firstTouch = safeExisting.firstTouch && typeof safeExisting.firstTouch === 'object'
      ? safeExisting.firstTouch
      : currentTouch;
    return Object.freeze({ firstTouch, lastTouch: currentTouch });
  }

  function isLikelyBot(userAgent, webdriver = false) {
    if (webdriver) return true;
    return /bot|crawler|spider|headless|lighthouse|pagespeed|pingdom|uptime|monitor|preview|facebookexternalhit|slurp/i.test(String(userAgent || ''));
  }

  function getDeviceCategory(width, userAgent = '') {
    const viewportWidth = Number(width) || 0;
    if (/tablet|ipad/i.test(userAgent) || (viewportWidth >= 700 && viewportWidth < 1024)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent) || viewportWidth < 700) return 'mobile';
    return 'desktop';
  }

  function getViewportCategory(width) {
    const viewportWidth = Number(width) || 0;
    if (viewportWidth < 480) return 'small_mobile';
    if (viewportWidth < 700) return 'large_mobile';
    if (viewportWidth < 1024) return 'tablet';
    if (viewportWidth < 1440) return 'desktop';
    return 'wide_desktop';
  }

  function getBrowserFamily(userAgent = '') {
    const value = String(userAgent);
    if (/Edg\//.test(value)) return 'edge';
    if (/OPR\//.test(value)) return 'opera';
    if (/Firefox\//.test(value)) return 'firefox';
    if (/Chrome\//.test(value)) return 'chrome';
    if (/Safari\//.test(value)) return 'safari';
    return 'other';
  }

  function getOsFamily(userAgent = '') {
    const value = String(userAgent);
    if (/Windows/i.test(value)) return 'windows';
    if (/Android/i.test(value)) return 'android';
    if (/iPhone|iPad|iPod/i.test(value)) return 'ios';
    if (/Mac OS/i.test(value)) return 'macos';
    if (/Linux/i.test(value)) return 'linux';
    return 'other';
  }

  function classifyValidation(validity = {}) {
    if (validity.valueMissing) return 'required_field_missing';
    if (validity.typeMismatch || validity.patternMismatch) return 'invalid_format';
    if (validity.tooLong || validity.tooShort) return 'invalid_length';
    if (validity.rangeOverflow || validity.rangeUnderflow || validity.stepMismatch) return 'invalid_range';
    return 'invalid_value';
  }

  function classifyError(error) {
    if (error && error.name === 'AbortError') return 'timeout';
    if (error && error.name === 'TypeError') return 'network_or_runtime';
    if (error && error.name === 'SecurityError') return 'security_policy';
    return 'runtime';
  }

  const core = Object.freeze({
    EVENT_NAMES,
    COMMON_PROPERTY_NAMES,
    SENSITIVE_KEY_PATTERN,
    normalizeConfig,
    normalizeIdentifier,
    normalizeServiceId,
    sanitizeCampaignValue,
    sanitizePath,
    sanitizeUrl,
    sanitizeReferringDomain,
    sanitizeEvent,
    sanitizePostHogEnvelope,
    inferTrafficTouch,
    mergeAttribution,
    isLikelyBot,
    getDeviceCategory,
    getViewportCategory,
    getBrowserFamily,
    getOsFamily,
    classifyValidation,
    classifyError,
    containsSensitiveValue,
  });

  if (!globalObject || !globalObject.document) {
    return { core, runtime: null };
  }

  const window = globalObject;
  const document = window.document;
  const CONSENT_KEY = 'tac_cookie_consent_v1';
  const INTERNAL_KEY = 'tac_internal_traffic_v1';
  const ATTRIBUTION_KEY = 'tac_attribution_v1';
  const VISIT_COUNT_KEY = 'tac_visit_count_v1';
  const VISIT_SESSION_KEY = 'tac_visit_session_v1';
  const QUOTE_FUNNEL_KEY = 'tac_quote_funnel_v1';
  const DEDUPE_KEY = 'tac_analytics_dedupe_v1';
  const CONFIG_ENDPOINT = 'https://tanda-pro-cleaning-api.onrender.com/api/analytics-config';
  const IDLE_TIMEOUT_MS = 30_000;
  const QUOTE_ABANDONMENT_MIN_MS = 5_000;
  const SCROLL_MILESTONES = [10, 25, 50, 75, 90, 100];
  const PAGE_START_MS = Date.now();

  const state = {
    consent: 'unknown',
    config: null,
    configPromise: null,
    posthogReady: false,
    captureStarted: false,
    sdkUnavailable: false,
    trackingSetup: false,
    disabledReason: '',
    queue: [],
    pageViewId: createUuid(),
    journeyId: '',
    attribution: null,
    visitorType: 'new',
    visitNumberBucket: 'first',
    previousPage: '',
    activeMs: 0,
    idleMs: 0,
    lastTickAt: performanceNow(),
    lastActivityAt: Date.now(),
    pageEngagementSent: false,
    trackedOnce: new Set(),
    persistedDedupe: new Set(),
    sections: new Map(),
    currentSection: '',
    previousSection: '',
    deepestSection: '',
    deepestScrollPercent: 0,
    trackedScrollMilestones: new Set(),
    scrolledUp: false,
    previousScrollY: window.scrollY || 0,
    mutationCount: 0,
    performanceSampled: false,
    performanceValues: new Map(),
    quote: {
      form: null,
      started: false,
      startedAt: 0,
      submitted: false,
      inFlight: false,
      submissionId: '',
      submissionStartedAt: 0,
      estimateViewed: false,
      lastStep: '',
      furthestStepViewed: '',
      furthestStepCompleted: '',
      viewedSteps: new Set(),
      completedSteps: new Set(),
      stepStartedAt: new Map(),
      services: new Set(),
      options: new Set(),
      optionServices: new Map(),
      selectionChangeCount: 0,
      lastInteractionAt: 0,
      pauseReportedSteps: new Set(),
      validationCount: 0,
    },
    subscription: {
      started: false,
      startedAt: 0,
      optionChangeCount: 0,
    },
  };

  function performanceNow() {
    return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
  }

  function createUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const random = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
    return `${random()}-${random().slice(0, 4)}-4${random().slice(0, 3)}-a${random().slice(0, 3)}-${random()}${random().slice(0, 4)}`;
  }

  function storageRead(storage, key, fallback = null) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storageWrite(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch {
      // Restricted storage is safe to ignore.
    }
  }

  function readConsent() {
    const stored = storageRead(window.localStorage, CONSENT_KEY);
    if (stored === 'accepted' || stored === 'denied') return stored;
    if (stored && (stored.state === 'accepted' || stored.state === 'denied')) return stored.state;
    return 'unknown';
  }

  function isDoNotTrackEnabled() {
    return String(window.navigator.doNotTrack || window.doNotTrack || '').trim() === '1';
  }

  function isInternalTraffic() {
    return storageRead(window.localStorage, INTERNAL_KEY, false) === true;
  }

  function getPagePath() {
    return core.sanitizePath(window.location.pathname || '/');
  }

  function getPageType() {
    const path = getPagePath().toLowerCase();
    if (path === '/' || path === '/index.html') return 'home';
    if (path.includes('/services/')) return 'service';
    if (path.includes('/areas/')) return 'service_area';
    if (path.includes('/reviews')) return 'reviews';
    if (path.includes('subscription-builder')) return 'subscription_builder';
    if (path.includes('giveaway')) return 'giveaway';
    if (path.includes('referrals')) return 'referrals';
    if (path.includes('gallery')) return 'gallery';
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('terms')) return 'terms';
    if (path.includes('cleaning-tips')) return 'content';
    return 'other';
  }

  function getScriptRelease() {
    const scripts = Array.from(document.scripts || []);
    const script = scripts.find((item) => /(?:^|\/)analytics\.js(?:\?|$)/i.test(item.src || ''));
    if (!script) return 'unversioned';
    try {
      return core.sanitizeCampaignValue(new URL(script.src).searchParams.get('v')) || 'unversioned';
    } catch {
      return 'unversioned';
    }
  }

  function getCommonProperties() {
    const userAgent = window.navigator.userAgent || '';
    const firstTouch = state.attribution && state.attribution.firstTouch ? state.attribution.firstTouch : {};
    const lastTouch = state.attribution && state.attribution.lastTouch ? state.attribution.lastTouch : {};
    return {
      page_path: getPagePath(),
      page_type: getPageType(),
      environment: state.config ? state.config.environment : inferEnvironment(),
      release: state.config ? state.config.release : getScriptRelease(),
      is_test: state.config ? state.config.environment !== 'production' : inferEnvironment() !== 'production',
      is_internal: isInternalTraffic(),
      visitor_type: state.visitorType,
      visit_number_bucket: state.visitNumberBucket,
      device_category: core.getDeviceCategory(window.innerWidth, userAgent),
      screen_category: core.getViewportCategory(window.screen?.width || window.innerWidth),
      viewport_category: core.getViewportCategory(window.innerWidth),
      browser_family: core.getBrowserFamily(userAgent),
      os_family: core.getOsFamily(userAgent),
      referring_domain: lastTouch.referringDomain || '',
      traffic_type: lastTouch.trafficType || 'direct',
      first_touch_source: firstTouch.source || '',
      first_touch_medium: firstTouch.medium || '',
      first_touch_campaign: firstTouch.campaign || '',
      first_touch_content: firstTouch.content || '',
      first_touch_term: firstTouch.term || '',
      first_touch_landing_page: firstTouch.landingPage || '',
      first_touch_gclid_present: Boolean(firstTouch.gclidPresent),
      last_touch_source: lastTouch.source || '',
      last_touch_medium: lastTouch.medium || '',
      last_touch_campaign: lastTouch.campaign || '',
      last_touch_content: lastTouch.content || '',
      last_touch_term: lastTouch.term || '',
      last_touch_landing_page: lastTouch.landingPage || '',
      last_touch_gclid_present: Boolean(lastTouch.gclidPresent),
      page_view_id: state.pageViewId,
      journey_id: state.journeyId,
    };
  }

  function inferEnvironment() {
    const hostname = String(window.location.hostname || '').toLowerCase();
    if (['localhost', '127.0.0.1'].includes(hostname)) return 'development';
    if (hostname === 'tandaprocleaning.com.au' || hostname === 'www.tandaprocleaning.com.au') return 'production';
    return 'preview';
  }

  function markSensitiveSurfaces(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('form, [data-result-panel], .form-message, [data-customer-content]').forEach((element) => {
      element.classList.add('ph-no-capture');
      element.setAttribute('data-ph-no-autocapture', 'true');
    });
    root.querySelectorAll('input, textarea, select, input[type="file"], [data-upload-preview], [data-photo-preview], img[src^="blob:"], img[src^="data:"]').forEach((element) => {
      element.classList.add('ph-no-capture');
      element.setAttribute('data-ph-no-autocapture', 'true');
    });
  }

  function readInlineConfig() {
    const inline = window.__TANDA_ANALYTICS_CONFIG__;
    if (!inline || typeof inline !== 'object') return null;
    if (!Object.prototype.hasOwnProperty.call(inline, 'enabled') && !inline.projectKey && !inline.projectApiKey) return null;
    return core.normalizeConfig({ ...inline, release: inline.release || getScriptRelease() });
  }

  async function loadConfig() {
    if (state.config) return state.config;
    if (state.configPromise) return state.configPromise;

    state.configPromise = (async () => {
      const inline = readInlineConfig();
      if (inline) {
        state.config = inline;
        return inline;
      }

      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeout = window.setTimeout(() => controller && controller.abort(), 2500);
      try {
        const endpoint = typeof window.__TANDA_ANALYTICS_CONFIG_ENDPOINT__ === 'string'
          ? window.__TANDA_ANALYTICS_CONFIG_ENDPOINT__
          : CONFIG_ENDPOINT;
        const response = await window.fetch(endpoint, {
          method: 'GET',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller ? controller.signal : undefined,
        });
        if (!response.ok) throw new Error('analytics_config_http_error');
        const payload = await response.json();
        state.config = core.normalizeConfig({ ...payload, release: payload.release || getScriptRelease() });
      } catch (error) {
        state.config = core.normalizeConfig({ enabled: false, environment: inferEnvironment(), release: getScriptRelease() });
        state.disabledReason = core.classifyError(error);
        reportInitializationFailure(state.disabledReason);
      } finally {
        window.clearTimeout(timeout);
      }
      return state.config;
    })();
    return state.configPromise;
  }

  function reportInitializationFailure(category) {
    if (state.consent !== 'accepted' || typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', 'analytics_initialization_failed', {
        event_category: 'analytics',
        event_label: core.normalizeIdentifier(category, 'unavailable'),
      });
    } catch {
      // Existing analytics failure reporting must also fail silently.
    }
  }

  function installPostHogSnippet() {
    if (window.posthog && window.posthog.__SV) return;
    (function install(documentObject, posthogObject) {
      let index;
      let methodName;
      let script;
      let firstScript;
      if (posthogObject.__SV) return;
      window.posthog = posthogObject;
      posthogObject._i = [];
      posthogObject.init = function init(projectKey, config, instanceName) {
        function stub(target, method) {
          const parts = method.split('.');
          if (parts.length === 2) {
            target = target[parts[0]];
            method = parts[1];
          }
          target[method] = function queuePostHogCall() {
            target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }
        script = documentObject.createElement('script');
        script.type = 'text/javascript';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.src = `${config.api_host.replace('.i.posthog.com', '-assets.i.posthog.com')}/static/1/array.js`;
        script.addEventListener('error', () => {
          state.sdkUnavailable = true;
          state.posthogReady = false;
          state.captureStarted = false;
          state.queue = [];
          window.__TANDA_POSTHOG_LOADED__ = false;
          state.disabledReason = 'posthog_script_unavailable';
          reportInitializationFailure(state.disabledReason);
        }, { once: true });
        firstScript = documentObject.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(script, firstScript);
        let instance = posthogObject;
        if (instanceName !== undefined) instance = posthogObject[instanceName] = [];
        else instanceName = 'posthog';
        instance.people = instance.people || [];
        instance.toString = function toString(includePeople) {
          let name = 'posthog';
          if (instanceName !== 'posthog') name += `.${instanceName}`;
          if (!includePeople) name += ' (stub)';
          return name;
        };
        instance.people.toString = function peopleToString() {
          return `${instance.toString(1)}.people (stub)`;
        };
        const methods = 'init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags on onFeatureFlags onSessionId identify reset get_distinct_id get_session_id opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing startSessionRecording stopSessionRecording captureException'.split(' ');
        for (index = 0; index < methods.length; index += 1) {
          methodName = methods[index];
          stub(instance, methodName);
        }
        posthogObject._i.push([projectKey, config, instanceName]);
      };
      posthogObject.__SV = 1;
    })(document, window.posthog || []);
  }

  function sanitizeRecordedRequest(request) {
    if (!request || typeof request !== 'object') return request;
    const safeRequest = { ...request };
    if (safeRequest.name) safeRequest.name = core.sanitizeUrl(safeRequest.name);
    delete safeRequest.body;
    delete safeRequest.requestBody;
    delete safeRequest.responseBody;
    delete safeRequest.headers;
    return safeRequest;
  }

  function initializePostHog(config) {
    if (state.posthogReady || window.__TANDA_POSTHOG_INITIALIZED__) {
      state.posthogReady = Boolean(window.__TANDA_POSTHOG_LOADED__ && window.posthog && typeof window.posthog.capture === 'function');
      flushQueue();
      return !state.sdkUnavailable;
    }

    installPostHogSnippet();
    if (!window.posthog || typeof window.posthog.init !== 'function') return false;

    window.__TANDA_POSTHOG_INITIALIZED__ = true;
    const privacySelector = 'form, .ph-no-capture, [data-ph-no-capture], [data-result-panel], .form-message, input[type="file"], [data-upload-preview], [data-photo-preview], img[src^="blob:"], img[src^="data:"]';
    const ignoredAutocaptureSelectors = ['form', 'form *', '.ph-no-autocapture', '[data-ph-no-autocapture]', '.ph-no-capture', '[data-ph-no-capture]'];
    const postHogConfig = {
      api_host: config.host,
      defaults: '2026-05-30',
      autocapture: config.heatmapsEnabled
        ? {
            dom_event_allowlist: ['click'],
            element_allowlist: ['a', 'button'],
            css_selector_ignorelist: ignoredAutocaptureSelectors,
            element_attribute_ignorelist: ['href', 'src', 'value', 'name', 'id', 'title', 'aria-label', 'placeholder'],
          }
        : false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: config.heatmapsEnabled,
      capture_performance: false,
      disable_session_recording: !config.sessionRecordingEnabled,
      enable_recording_console_log: false,
      mask_all_text: true,
      mask_all_element_attributes: true,
      respect_dnt: true,
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      persistence: 'localStorage+cookie',
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: privacySelector,
        blockSelector: privacySelector,
        maskCapturedNetworkRequestFn: sanitizeRecordedRequest,
      },
      before_send: core.sanitizePostHogEnvelope,
      loaded(posthogInstance) {
        try {
          if (!shouldCapture()) {
            posthogInstance.opt_out_capturing();
            return;
          }
          state.sdkUnavailable = false;
          state.posthogReady = true;
          window.__TANDA_POSTHOG_LOADED__ = true;
          state.disabledReason = '';
          posthogInstance.opt_in_capturing();
          if (config.sessionRecordingEnabled) posthogInstance.startSessionRecording();
          flushQueue();
        } catch {
          // PostHog remains optional and must never block the site.
        }
      },
    };
    if (config.uiHost) postHogConfig.ui_host = config.uiHost;

    try {
      window.posthog.init(config.projectKey, postHogConfig);
      window.posthog.opt_in_capturing();
      return true;
    } catch (error) {
      state.disabledReason = core.classifyError(error);
      reportInitializationFailure(state.disabledReason);
      return false;
    }
  }

  function shouldCapture() {
    if (state.consent !== 'accepted') return false;
    if (state.sdkUnavailable) return false;
    if (isDoNotTrackEnabled()) return false;
    const environment = state.config ? state.config.environment : inferEnvironment();
    const allowsLabelledAutomation = environment === 'test' || environment === 'development';
    if (core.isLikelyBot(window.navigator.userAgent, window.navigator.webdriver) && !allowsLabelledAutomation) return false;
    if (isInternalTraffic() && !(state.config && state.config.captureInternalTraffic)) return false;
    return Boolean(state.config && state.config.enabled);
  }

  function rememberDedupeKey(key, persistent = false) {
    const normalized = String(key || '').slice(0, 160);
    if (!normalized) return false;
    const inMemorySet = persistent ? state.persistedDedupe : state.trackedOnce;
    if (inMemorySet.has(normalized)) return false;
    inMemorySet.add(normalized);
    if (persistent) {
      const keys = Array.from(inMemorySet).slice(-40);
      storageWrite(window.localStorage, DEDUPE_KEY, keys);
    }
    return true;
  }

  function sendSafeEvent(eventName, properties = {}, options = {}) {
    const insertId = options.insertId || createUuid();
    const sanitized = core.sanitizeEvent(eventName, {
      ...getCommonProperties(),
      ...properties,
      $insert_id: insertId,
    });
    if (!sanitized) return false;
    if (!shouldCapture()) return false;

    const dedupeKey = options.dedupeKey || '';
    if (dedupeKey && !rememberDedupeKey(dedupeKey, options.persistent === true)) return false;
    if (!state.posthogReady || !window.posthog || typeof window.posthog.capture !== 'function') {
      state.queue.push(sanitized);
      state.queue = state.queue.slice(-100);
      return true;
    }
    try {
      window.posthog.capture(sanitized.event, sanitized.properties);
      return true;
    } catch {
      return false;
    }
  }

  function flushQueue() {
    if (!shouldCapture() || !state.posthogReady || !window.posthog || typeof window.posthog.capture !== 'function') return;
    const queued = state.queue.splice(0, state.queue.length);
    queued.forEach((item) => {
      try {
        window.posthog.capture(item.event, item.properties);
      } catch {
        // A blocked analytics request never affects the customer journey.
      }
    });
  }

  function setupAttributionAndVisit() {
    const existingAttribution = storageRead(window.localStorage, ATTRIBUTION_KEY, null);
    const currentTouch = core.inferTrafficTouch(window.location.href, document.referrer, Date.now());
    state.attribution = core.mergeAttribution(existingAttribution, currentTouch);
    storageWrite(window.localStorage, ATTRIBUTION_KEY, state.attribution);

    const existingSession = storageRead(window.sessionStorage, VISIT_SESSION_KEY, null);
    let visitCount = Number(storageRead(window.localStorage, VISIT_COUNT_KEY, 0)) || 0;
    if (!existingSession) {
      visitCount += 1;
      storageWrite(window.localStorage, VISIT_COUNT_KEY, visitCount);
      storageWrite(window.sessionStorage, VISIT_SESSION_KEY, { startedAt: Date.now(), id: createUuid() });
    }
    state.visitorType = visitCount > 1 ? 'returning' : 'new';
    state.visitNumberBucket = visitCount <= 1 ? 'first' : visitCount <= 3 ? 'two_to_three' : 'four_plus';
    state.previousPage = core.sanitizePath(storageRead(window.sessionStorage, 'tac_previous_page_v1', ''));
    storageWrite(window.sessionStorage, 'tac_previous_page_v1', getPagePath());
    state.journeyId = getOrCreateJourneyId();
  }

  function getOrCreateJourneyId() {
    const existing = storageRead(window.localStorage, 'tac_anonymous_journey_v1', '');
    if (typeof existing === 'string' && /^[a-f0-9-]{20,64}$/i.test(existing)) return existing;
    const id = createUuid();
    storageWrite(window.localStorage, 'tac_anonymous_journey_v1', id);
    return id;
  }

  async function startCaptureIfAllowed() {
    if (state.captureStarted) return;
    const config = await loadConfig();
    if (!config.enabled) {
      state.disabledReason = state.disabledReason || 'configuration_disabled';
      return;
    }
    if (!shouldCapture()) {
      state.disabledReason = isDoNotTrackEnabled() ? 'do_not_track' : isInternalTraffic() ? 'internal_traffic' : 'consent_or_bot_filter';
      return;
    }
    setupAttributionAndVisit();
    if (!initializePostHog(config)) return;
    state.captureStarted = true;
    setupBehaviorTracking();
    state.performanceSampled = Math.random() <= config.performanceSampleRate;
    sendSafeEvent('page_viewed', {
      previous_page: state.previousPage,
      landing_page: state.attribution.firstTouch.landingPage,
      entry_page: getPagePath(),
    }, { dedupeKey: `page_viewed:${state.pageViewId}` });
    reconcilePreviousQuoteFunnel();
    captureCurrentScrollDepth();
    observePerformance();
  }

  function setConsent(accepted) {
    state.consent = accepted === true || accepted === 'accepted' ? 'accepted' : 'denied';
    if (state.consent === 'accepted') {
      startCaptureIfAllowed();
      return;
    }
    state.queue = [];
    state.captureStarted = false;
    storageRemove(window.localStorage, ATTRIBUTION_KEY);
    storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
    if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
      try {
        window.posthog.opt_out_capturing();
      } catch {
        // Consent changes remain safe even when the SDK is blocked.
      }
    }
  }

  function markInternal(enabled = true) {
    storageWrite(window.localStorage, INTERNAL_KEY, Boolean(enabled));
    if (enabled && window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
      try {
        window.posthog.opt_out_capturing();
      } catch {
        // Internal filtering must not affect the site.
      }
    }
    return Boolean(enabled);
  }

  function updateActiveTime() {
    const now = performanceNow();
    const elapsed = Math.max(0, Math.min(2_000, now - state.lastTickAt));
    state.lastTickAt = now;
    const pageActive = document.visibilityState === 'visible' && Date.now() - state.lastActivityAt <= IDLE_TIMEOUT_MS;
    if (pageActive) {
      state.activeMs += elapsed;
      state.sections.forEach((section) => {
        if (section.visibleRatio >= 0.25) section.activeMs += elapsed;
      });
    } else {
      state.idleMs += elapsed;
    }
  }

  function recordActivity() {
    state.lastActivityAt = Date.now();
  }

  function pageEngaged() {
    if (state.pageEngagementSent || !state.captureStarted) return;
    updateActiveTime();
    state.pageEngagementSent = true;
    flushSectionEngagements();
    sendSafeEvent('page_engaged', {
      active_time_ms: Math.round(state.activeMs),
      total_time_ms: Math.max(0, Date.now() - PAGE_START_MS),
      idle_time_ms: Math.round(state.idleMs),
      deepest_scroll_percent: state.deepestScrollPercent,
      deepest_section: state.deepestSection,
      exit_page: getPagePath(),
    }, { dedupeKey: `page_engaged:${state.pageViewId}` });
  }

  function sectionIdentifier(element, index) {
    const homepageMap = [
      ['.hero', 'hero'],
      ['.giveaway-promo-banner', 'giveaway'],
      ['.commercial-trust-section', 'commercial_trust'],
      ['#services', 'services'],
      ['#packages', 'subscriptions'],
      ['.home-before-after-showcase', 'before_after'],
      ['#about', 'about'],
      ['#reviews', 'reviews'],
      ['#gallery-preview', 'gallery_preview'],
      ['#quote', 'quote'],
    ];
    for (const [selector, identifier] of homepageMap) {
      if (element.matches(selector)) return identifier;
    }
    if (element.tagName === 'FOOTER') return 'footer_contact';
    const existing = core.normalizeIdentifier(element.id || element.dataset.analyticsSection || '');
    if (existing) return existing;
    const classCandidate = Array.from(element.classList || []).find((name) => /(?:hero|gallery|review|service|feature|about|quote|trust|package|giveaway|referral|section)/i.test(name));
    if (classCandidate) return core.normalizeIdentifier(classCandidate);
    const heading = element.querySelector('h1, h2, h3');
    const headingId = heading ? core.normalizeIdentifier(heading.textContent) : '';
    return headingId || `section_${index + 1}`;
  }

  function flushSectionEngagement(section) {
    if (!section || section.engagementSent || !section.viewed || section.activeMs < 500) return;
    section.engagementSent = true;
    sendSafeEvent('section_engaged', {
      section_id: section.id,
      engaged_time_ms: Math.round(section.activeMs),
      visible_percent: Math.round(section.maxRatio * 100),
      previous_section: section.previousSection,
      next_action: section.nextAction,
    }, { dedupeKey: `section_engaged:${state.pageViewId}:${section.id}` });
  }

  function flushSectionEngagements() {
    state.sections.forEach(flushSectionEngagement);
  }

  function setupSectionTracking() {
    const candidates = Array.from(document.querySelectorAll('main > section, body > section, footer'));
    if (!candidates.length || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = state.sections.get(entry.target);
        if (!section) return;
        section.visibleRatio = entry.intersectionRatio;
        section.maxRatio = Math.max(section.maxRatio, entry.intersectionRatio);
        if (entry.intersectionRatio >= 0.25) {
          if (!section.viewed) {
            section.viewed = true;
            section.previousSection = state.currentSection;
            state.previousSection = state.currentSection;
            state.currentSection = section.id;
            state.deepestSection = section.id;
            sendSafeEvent('section_viewed', {
              section_id: section.id,
              visible_percent: Math.round(entry.intersectionRatio * 100),
              previous_section: section.previousSection,
            }, { dedupeKey: `section_viewed:${state.pageViewId}:${section.id}` });
          } else {
            state.currentSection = section.id;
            state.deepestSection = section.id;
          }
        } else if (entry.intersectionRatio === 0) {
          flushSectionEngagement(section);
        }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    candidates.forEach((element, index) => {
      const id = sectionIdentifier(element, index);
      element.dataset.analyticsSection = id;
      const section = { id, element, viewed: false, engagementSent: false, visibleRatio: 0, maxRatio: 0, activeMs: 0, previousSection: '', nextAction: '' };
      state.sections.set(element, section);
      observer.observe(element);
    });
  }

  function captureCurrentScrollDepth() {
    const root = document.documentElement;
    const bodyHeight = document.body ? document.body.scrollHeight : 0;
    const documentHeight = Math.max(root.scrollHeight, bodyHeight, window.innerHeight);
    const scrollable = Math.max(1, documentHeight - window.innerHeight);
    const currentY = Math.max(0, window.scrollY || root.scrollTop || 0);
    const percent = currentY >= scrollable - 2 ? 100 : Math.min(99, Math.round((currentY / scrollable) * 100));
    state.deepestScrollPercent = Math.max(state.deepestScrollPercent, percent);
    if (currentY < state.previousScrollY - 120) state.scrolledUp = true;
    state.previousScrollY = currentY;

    SCROLL_MILESTONES.forEach((milestone) => {
      if (percent < milestone || state.trackedScrollMilestones.has(milestone)) return;
      state.trackedScrollMilestones.add(milestone);
      sendSafeEvent('scroll_depth_reached', {
        scroll_percent: milestone,
        deepest_scroll_percent: state.deepestScrollPercent,
        deepest_section: state.deepestSection,
        time_to_milestone_ms: Math.max(0, Date.now() - PAGE_START_MS),
        scrolled_up: state.scrolledUp,
      }, { dedupeKey: `scroll:${state.pageViewId}:${milestone}` });
    });
  }

  function setupScrollTracking() {
    let requested = false;
    window.addEventListener('scroll', () => {
      if (requested) return;
      requested = true;
      window.requestAnimationFrame(() => {
        requested = false;
        captureCurrentScrollDepth();
      });
    }, { passive: true });
    window.addEventListener('load', captureCurrentScrollDepth, { once: true });
  }

  function elementPlacement(element) {
    if (!(element instanceof window.Element)) return 'main';
    if (element.closest('header, nav')) return 'header';
    if (element.closest('.hero, .inner-hero')) return 'hero';
    if (element.closest('#quote, .quote')) return 'quote';
    if (element.closest('footer')) return 'footer';
    if (window.matchMedia('(max-width: 760px)').matches && element.closest('[class*="sticky"], [class*="mobile"]')) return 'sticky_mobile';
    return 'main';
  }

  function destinationInfo(element) {
    if (element instanceof window.HTMLAnchorElement) {
      const href = String(element.getAttribute('href') || '');
      if (/^tel:/i.test(href)) return { type: 'phone', path: '' };
      if (/^mailto:/i.test(href)) return { type: 'email', path: '' };
      if (/^sms:/i.test(href)) return { type: 'sms', path: '' };
      let url;
      try {
        url = new URL(element.href, window.location.href);
      } catch {
        return { type: 'unknown', path: '' };
      }
      const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
      if (/afterpay\.com/i.test(hostname)) return { type: 'afterpay', path: '' };
      if (/facebook|instagram|linkedin|youtube|tiktok/i.test(hostname)) return { type: 'social', path: '' };
      if (/google\..*maps|maps\.apple|maps\.app/i.test(`${hostname}${url.pathname}`)) return { type: 'directions', path: '' };
      if (url.origin !== window.location.origin) return { type: 'external', path: '' };
      const path = core.sanitizePath(url.pathname);
      if (url.hash === '#quote') return { type: 'quote', path };
      if (/giveaway/i.test(path)) return { type: 'giveaway', path };
      if (/referral/i.test(path)) return { type: 'referral', path };
      if (/gallery/i.test(path)) return { type: 'gallery', path };
      if (/subscription|package/i.test(path)) return { type: 'subscription', path };
      if (/services\//i.test(path)) return { type: 'service', path };
      return { type: 'navigation', path };
    }
    if (element instanceof window.HTMLButtonElement && element.type === 'submit') return { type: 'form_submit', path: '' };
    return { type: 'button', path: '' };
  }

  function ctaLabel(destinationType, element) {
    const labels = {
      quote: 'get_quote',
      phone: 'call_now',
      email: 'email',
      sms: 'sms',
      afterpay: 'afterpay',
      giveaway: 'giveaway',
      referral: 'referral_rewards',
      gallery: 'view_gallery',
      subscription: 'property_care_plans',
      service: 'view_service',
      social: 'social_profile',
      directions: 'directions',
      form_submit: element && element.closest('#quoteForm') ? 'submit_quote' : 'submit_form',
    };
    return labels[destinationType] || '';
  }

  function inferServiceFromElement(element) {
    const directValue = element.closest('[data-service-filter], [data-gallery-service], [data-service-id]');
    if (directValue) {
      const value = directValue.dataset.serviceFilter || directValue.dataset.galleryService || directValue.dataset.serviceId;
      const directService = core.normalizeServiceId(value);
      if (directService) return directService;
    }
    const link = element.closest('a[href]');
    if (link) {
      try {
        const pathParts = new URL(link.href, window.location.href).pathname.toLowerCase().split('/');
        const fileName = pathParts[pathParts.length - 1] || '';
        const pathService = core.normalizeServiceId(fileName);
        if (pathService) return pathService;
      } catch {
        // Ignore malformed links.
      }
    }
    const card = element.closest('.service-card, .related-service-card, .package-card');
    if (card) {
      const heading = card.querySelector('h2, h3, h4');
      const headingService = core.normalizeServiceId(heading ? heading.textContent : '');
      if (headingService) return headingService;
    }
    return '';
  }

  function inferPackageId(element) {
    const card = element.closest('.package-card, [data-package-id], [data-plan]');
    if (!card) return '';
    const direct = card.dataset.packageId || card.dataset.plan || '';
    if (direct) return core.normalizeIdentifier(direct);
    const link = element.closest('a[href]') || card.querySelector('a[href]');
    if (link) {
      try {
        const plan = new URL(link.href, window.location.href).searchParams.get('plan');
        if (plan) return core.normalizeIdentifier(plan);
      } catch {
        // Ignore malformed package links.
      }
    }
    const heading = card.querySelector('h2, h3, h4');
    return core.normalizeIdentifier(heading ? heading.textContent : '');
  }

  function elementPosition(element) {
    const parent = element.parentElement;
    if (!parent) return 1;
    return Math.min(50, Array.from(parent.children).indexOf(element) + 1);
  }

  function updateSectionNextAction(element, action) {
    const sectionElement = element.closest('[data-analytics-section]');
    const section = sectionElement ? state.sections.get(sectionElement) : null;
    if (section && !section.nextAction) section.nextAction = action;
  }

  const recentClicks = [];
  function detectRageClick(element, event) {
    if (element.closest('input, textarea, select, [contenteditable="true"], .ph-no-rageclick')) return;
    const now = Date.now();
    const key = `${element.tagName.toLowerCase()}:${destinationInfo(element).type}:${elementPlacement(element)}`;
    recentClicks.push({ key, at: now, x: event.clientX, y: event.clientY });
    while (recentClicks.length && now - recentClicks[0].at > 1200) recentClicks.shift();
    const matching = recentClicks.filter((item) => item.key === key && Math.abs(item.x - event.clientX) <= 30 && Math.abs(item.y - event.clientY) <= 30);
    if (matching.length >= 3) {
      sendSafeEvent('rage_click_detected', {
        friction_type: element.closest('button[type="submit"]') ? 'repeated_submit_click' : 'rapid_repeated_click',
        click_count: matching.length,
        element_type: element.tagName.toLowerCase(),
        placement: elementPlacement(element),
        section_id: element.closest('[data-analytics-section]')?.dataset.analyticsSection || '',
      }, { dedupeKey: `rage:${state.pageViewId}:${key}` });
    }
  }

  function maybeDetectDeadClick(element) {
    if (!(element instanceof window.HTMLButtonElement || element.matches('[role="button"]'))) return;
    if (element.closest('form, [data-nav-toggle], [data-gallery], [data-lightbox], [data-mobile-quote-next], [data-mobile-quote-back]')) return;
    const beforeMutations = state.mutationCount;
    const beforePath = `${window.location.pathname}${window.location.hash}`;
    window.setTimeout(() => {
      const afterPath = `${window.location.pathname}${window.location.hash}`;
      if (afterPath !== beforePath || state.mutationCount !== beforeMutations) return;
      sendSafeEvent('dead_click_detected', {
        friction_type: 'button_no_visible_response',
        element_type: element.tagName.toLowerCase(),
        placement: elementPlacement(element),
        section_id: element.closest('[data-analytics-section]')?.dataset.analyticsSection || '',
      }, { dedupeKey: `dead:${state.pageViewId}:${elementPlacement(element)}:${elementPosition(element)}` });
    }, 700);
  }

  function setupClickTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof window.Element ? event.target : null;
      const element = target ? target.closest('a[href], button, [role="button"]') : null;
      if (!element || element.closest('.ph-no-autocapture, [data-ph-no-autocapture]')) return;

      recordActivity();
      detectRageClick(element, event);
      maybeDetectDeadClick(element);
      const destination = destinationInfo(element);
      const label = ctaLabel(destination.type, element);
      const serviceId = inferServiceFromElement(element);
      const packageId = inferPackageId(element);
      const sectionId = element.closest('[data-analytics-section]')?.dataset.analyticsSection || '';
      const placement = elementPlacement(element);

      if (label) {
        sendSafeEvent('cta_clicked', {
          cta_id: `${label}_${placement}`,
          cta_label: label,
          placement,
          destination_type: destination.type,
          destination_path: destination.path,
          section_id: sectionId,
          service_context: serviceId,
          deepest_scroll_percent: state.deepestScrollPercent,
          estimate_was_viewed: state.quote.estimateViewed,
        });
        updateSectionNextAction(element, label);
      }

      if (['phone', 'email', 'sms'].includes(destination.type)) {
        sendSafeEvent('contact_clicked', {
          contact_type: destination.type,
          placement,
          section_id: sectionId,
          service_context: serviceId,
        });
      }

      if (serviceId) {
        sendSafeEvent('service_clicked', {
          service_id: serviceId,
          element_type: element.tagName.toLowerCase(),
          element_position: elementPosition(element),
          destination_type: destination.type,
          destination_path: destination.path,
          section_id: sectionId,
          placement,
        });
      }

      if (packageId) {
        state.subscription.optionChangeCount += 1;
        sendSafeEvent('subscription_option_viewed', {
          option_id: packageId,
          package_id: packageId,
          placement,
          section_id: sectionId,
        });
        if (state.subscription.optionChangeCount === 5 || state.subscription.optionChangeCount === 8) {
          sendSafeEvent('rage_click_detected', {
            friction_type: 'repeated_package_changes',
            click_count: state.subscription.optionChangeCount,
            section_id: sectionId,
          });
        }
      }
    }, { capture: true, passive: true });
  }

  const QUOTE_STEPS = Object.freeze([
    { id: 'property_details_step', selector: '.property-details-card' },
    { id: 'service_selection_step', selector: '.service-scope-card' },
    { id: 'access_details_step', selector: '[data-quote-more-details], .quote-more-details' },
    { id: 'photo_upload_step', selector: '.quote-notes-card' },
    { id: 'review_step', selector: '.quote-mobile-review, [data-quote-inclusions]' },
  ]);

  const SAFE_QUOTE_FIELDS = Object.freeze({
    firstName: 'first_name_field',
    phone: 'phone_field',
    email: 'email_field',
    address: 'address_field',
    propertyType: 'property_type_field',
    storeys: 'storeys_field',
    rooms: 'rooms_field',
    service: 'service_field',
    pricingItemCode: 'job_type_field',
    scopeQuantity: 'quantity_field',
    serviceArea: 'service_area_field',
    accessDifficulty: 'access_field',
    conditionLevel: 'condition_field',
    lastCleaned: 'last_cleaned_field',
    parking: 'parking_field',
    recurringFrequency: 'frequency_field',
    paymentPreference: 'payment_preference_field',
    timingLoading: 'booking_type_field',
    preferredDate: 'preferred_date_field',
    preferredTime: 'preferred_time_field',
    notes: 'notes_field',
    photoUpload: 'photo_upload_field',
    agree: 'contact_consent_field',
  });

  function quoteStepForElement(element) {
    const stepElement = element.closest('[data-analytics-quote-step]');
    return stepElement ? stepElement.dataset.analyticsQuoteStep : '';
  }

  function quoteStepIndex(stepId) {
    return QUOTE_STEPS.findIndex((step) => step.id === stepId);
  }

  function persistQuoteState() {
    if (state.consent !== 'accepted' || !state.quote.started || state.quote.submitted) return;
    const safeState = {
      journeyId: state.journeyId,
      startedAt: state.quote.startedAt,
      updatedAt: Date.now(),
      pagePath: getPagePath(),
      lastStep: state.quote.lastStep,
      furthestStepViewed: state.quote.furthestStepViewed,
      furthestStepCompleted: state.quote.furthestStepCompleted,
      validationCount: state.quote.validationCount,
      estimateViewed: state.quote.estimateViewed,
      serviceIds: Array.from(state.quote.services).slice(0, 12),
    };
    storageWrite(window.localStorage, QUOTE_FUNNEL_KEY, safeState);
  }

  function reconcilePreviousQuoteFunnel() {
    const previous = storageRead(window.localStorage, QUOTE_FUNNEL_KEY, null);
    if (!previous || typeof previous !== 'object') return;
    const updatedAt = Number(previous.updatedAt || 0);
    const age = Date.now() - updatedAt;
    if (!Number.isFinite(age) || age < 5_000) return;
    if (age > 7 * 24 * 60 * 60 * 1000) {
      storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
      return;
    }
    const previousProperties = {
      journey_id: normalizeUuid(previous.journeyId),
      furthest_step_viewed: core.normalizeIdentifier(previous.furthestStepViewed),
      furthest_step_completed: core.normalizeIdentifier(previous.furthestStepCompleted),
      duration_ms: Math.max(0, updatedAt - Number(previous.startedAt || updatedAt)),
      validation_count: Math.max(0, Math.min(20, Number(previous.validationCount || 0))),
      estimate_was_viewed: Boolean(previous.estimateViewed),
      selected_service_count: Array.isArray(previous.serviceIds) ? previous.serviceIds.length : 0,
    };
    if (age < 30 * 60 * 1000) {
      if (document.getElementById('quoteForm')) {
        sendSafeEvent('quote_form_progress_lost', {
          ...previousProperties,
          trigger: 'page_reload_without_restoration',
        }, { dedupeKey: `progress_lost:${previous.journeyId}:${updatedAt}`, persistent: true });
        storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
      }
      return;
    }
    sendSafeEvent('quote_form_abandoned', {
      ...previousProperties,
      trigger: 'next_visit_reconciliation',
    }, { dedupeKey: `abandoned:${previous.journeyId}:${updatedAt}`, persistent: true });
    storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
  }

  function normalizeUuid(value) {
    const text = String(value || '');
    return /^[a-f0-9-]{20,64}$/i.test(text) ? text : '';
  }

  function markQuoteStarted(stepId) {
    if (state.quote.started) return;
    state.quote.started = true;
    state.quote.startedAt = Date.now();
    state.quote.lastInteractionAt = Date.now();
    state.quote.lastStep = stepId || 'property_details_step';
    sendSafeEvent('quote_form_started', {
      form_id: 'quote_form',
      form_location: 'homepage_quote',
      step_id: state.quote.lastStep,
    }, { dedupeKey: `quote_started:${state.journeyId}` });
    persistQuoteState();
  }

  function markQuoteStepViewed(stepId, trigger = 'viewport') {
    if (!stepId) return;
    const previousStep = state.quote.lastStep;
    const alreadyViewed = state.quote.viewedSteps.has(stepId);
    state.quote.viewedSteps.add(stepId);
    state.quote.lastStep = stepId;
    state.quote.stepStartedAt.set(stepId, state.quote.stepStartedAt.get(stepId) || Date.now());
    if (quoteStepIndex(stepId) > quoteStepIndex(state.quote.furthestStepViewed)) state.quote.furthestStepViewed = stepId;
    sendSafeEvent(alreadyViewed ? 'quote_step_returned' : 'quote_step_viewed', {
      step_id: stepId,
      previous_step: previousStep,
      revisit_count: alreadyViewed ? 1 : 0,
      trigger,
    }, { dedupeKey: alreadyViewed ? '' : `quote_step_viewed:${state.pageViewId}:${stepId}` });
    persistQuoteState();
  }

  function markQuoteStepCompleted(stepId) {
    if (!stepId || state.quote.completedSteps.has(stepId)) return;
    state.quote.completedSteps.add(stepId);
    if (quoteStepIndex(stepId) > quoteStepIndex(state.quote.furthestStepCompleted)) state.quote.furthestStepCompleted = stepId;
    const startedAt = state.quote.stepStartedAt.get(stepId) || Date.now();
    sendSafeEvent('quote_step_completed', {
      step_id: stepId,
      step_time_ms: Math.max(0, Date.now() - startedAt),
      furthest_step_completed: state.quote.furthestStepCompleted,
      continued_after_estimate: state.quote.estimateViewed,
    }, { dedupeKey: `quote_step_completed:${state.journeyId}:${stepId}` });
    persistQuoteState();
  }

  function requiredFieldsComplete(form, ids) {
    return ids.every((id) => {
      const field = form.querySelector(`#${id}`);
      if (!(field instanceof window.HTMLInputElement || field instanceof window.HTMLSelectElement || field instanceof window.HTMLTextAreaElement)) return false;
      if (field.disabled) return true;
      if (field.type === 'checkbox') return field.checked;
      return Boolean(String(field.value || '').trim()) && field.checkValidity();
    });
  }

  function evaluateQuoteStepCompletion(form) {
    if (requiredFieldsComplete(form, ['firstName', 'phone', 'email', 'address', 'propertyType', 'storeys'])) {
      markQuoteStepCompleted('property_details_step');
    }
    if (requiredFieldsComplete(form, ['service', 'pricingItemCode', 'scopeQuantity', 'serviceArea'])) {
      markQuoteStepCompleted('service_selection_step');
    }
  }

  function collectSelectedQuoteServices(form) {
    const services = new Set();
    const options = new Set();
    const optionServices = new Map();
    const primary = form.querySelector('#service');
    if (primary instanceof window.HTMLSelectElement) {
      const id = core.normalizeServiceId(primary.value || primary.selectedOptions[0]?.textContent);
      if (id) services.add(id);
      const primaryOption = core.normalizeIdentifier(form.querySelector('#pricingItemCode')?.value);
      if (primaryOption) {
        options.add(primaryOption);
        optionServices.set(primaryOption, id);
      }
    }
    form.querySelectorAll('[data-service-id][aria-checked="true"], input[data-service-id]:checked, input[name="services"]:checked').forEach((element) => {
      const id = core.normalizeServiceId(element.dataset.serviceId || element.value);
      if (id) services.add(id);
    });
    form.querySelectorAll('.additional-service-row').forEach((row) => {
      const serviceId = core.normalizeServiceId(row.querySelector('.additional-service-group')?.value);
      const optionId = core.normalizeIdentifier(row.querySelector('.additional-service-item')?.value);
      if (serviceId) services.add(serviceId);
      if (optionId) {
        options.add(optionId);
        optionServices.set(optionId, serviceId);
      }
    });
    form.querySelectorAll('input[name="addons"]:checked').forEach((element) => {
      const optionId = core.normalizeIdentifier(element.value);
      if (optionId) options.add(optionId);
    });
    return { services, options, optionServices };
  }

  function syncQuoteServices(form) {
    const next = collectSelectedQuoteServices(form);
    let changed = false;
    next.services.forEach((serviceId) => {
      if (state.quote.services.has(serviceId)) return;
      changed = true;
      state.quote.services.add(serviceId);
      sendSafeEvent('quote_service_selected', {
        service_id: serviceId,
        selected_service_count: next.services.size,
        step_id: 'service_selection_step',
        continued_after_estimate: state.quote.estimateViewed,
      });
    });
    Array.from(state.quote.services).forEach((serviceId) => {
      if (next.services.has(serviceId)) return;
      changed = true;
      state.quote.services.delete(serviceId);
      sendSafeEvent('quote_service_removed', {
        service_id: serviceId,
        selected_service_count: next.services.size,
        step_id: 'service_selection_step',
        continued_after_estimate: state.quote.estimateViewed,
      });
    });
    next.options.forEach((optionId) => {
      if (state.quote.options.has(optionId)) return;
      changed = true;
      state.quote.options.add(optionId);
      state.quote.optionServices.set(optionId, next.optionServices.get(optionId) || '');
      sendSafeEvent('quote_service_selected', {
        service_id: next.optionServices.get(optionId) || '',
        option_id: optionId,
        selected_service_count: next.services.size,
        step_id: 'service_selection_step',
        continued_after_estimate: state.quote.estimateViewed,
      });
    });
    Array.from(state.quote.options).forEach((optionId) => {
      if (next.options.has(optionId)) return;
      changed = true;
      const serviceId = state.quote.optionServices.get(optionId) || '';
      state.quote.options.delete(optionId);
      state.quote.optionServices.delete(optionId);
      sendSafeEvent('quote_service_removed', {
        service_id: serviceId,
        option_id: optionId,
        selected_service_count: next.services.size,
        step_id: 'service_selection_step',
        continued_after_estimate: state.quote.estimateViewed,
      });
    });
    if (changed) {
      state.quote.selectionChangeCount += 1;
      if (state.quote.selectionChangeCount === 5 || state.quote.selectionChangeCount === 8) {
        sendSafeEvent('rage_click_detected', {
          friction_type: 'repeated_service_changes',
          click_count: state.quote.selectionChangeCount,
          step_id: 'service_selection_step',
        });
      }
    }
    persistQuoteState();
  }

  function fileCountBucket(count) {
    if (count <= 0) return 'none';
    if (count === 1) return 'one';
    if (count <= 3) return 'two_to_three';
    if (count <= 5) return 'four_to_five';
    return 'over_limit';
  }

  function fileSizeBucket(bytes) {
    if (bytes <= 1024 * 1024) return 'up_to_1mb';
    if (bytes <= 4 * 1024 * 1024) return 'one_to_4mb';
    return 'over_4mb';
  }

  function setupQuoteTracking() {
    const form = document.getElementById('quoteForm');
    if (!(form instanceof window.HTMLFormElement)) return;
    state.quote.form = form;
    form.classList.add('ph-no-capture');
    form.setAttribute('data-ph-no-autocapture', 'true');

    QUOTE_STEPS.forEach((step) => {
      form.querySelectorAll(step.selector).forEach((element) => {
        element.dataset.analyticsQuoteStep = step.id;
        if (typeof IntersectionObserver === 'function') {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio >= 0.35) markQuoteStepViewed(step.id, 'viewport');
            });
          }, { threshold: [0.35] });
          observer.observe(element);
        }
      });
    });

    if (typeof IntersectionObserver === 'function') {
      const formObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio < 0.2) return;
          sendSafeEvent('quote_form_viewed', {
            form_id: 'quote_form',
            form_location: 'homepage_quote',
            trigger: 'viewport',
          }, { dedupeKey: `quote_form_viewed:${state.pageViewId}` });
          formObserver.disconnect();
        });
      }, { threshold: [0.2] });
      formObserver.observe(form);
    }

    const meaningfulInteraction = (event) => {
      const target = event.target;
      if (!(target instanceof window.HTMLInputElement || target instanceof window.HTMLSelectElement || target instanceof window.HTMLTextAreaElement)) return;
      if (target.name === 'website' || target.type === 'file') return;
      const stepId = quoteStepForElement(target) || state.quote.lastStep || 'property_details_step';
      state.quote.lastInteractionAt = Date.now();
      markQuoteStarted(stepId);
      markQuoteStepViewed(stepId, 'interaction');
      window.setTimeout(() => {
        evaluateQuoteStepCompletion(form);
        syncQuoteServices(form);
      }, 0);
    };
    form.addEventListener('input', meaningfulInteraction, { passive: true });
    form.addEventListener('change', meaningfulInteraction, { passive: true });

    window.setInterval(() => {
      if (!state.quote.started || state.quote.submitted || state.quote.inFlight || document.visibilityState !== 'visible') return;
      const stepId = state.quote.lastStep || 'property_details_step';
      const pauseDuration = Date.now() - state.quote.lastInteractionAt;
      if (pauseDuration < 90_000 || state.quote.pauseReportedSteps.has(stepId)) return;
      state.quote.pauseReportedSteps.add(stepId);
      sendSafeEvent('dead_click_detected', {
        friction_type: 'long_quote_step_pause',
        pause_duration_ms: pauseDuration,
        step_id: stepId,
      }, { dedupeKey: `quote_pause:${state.journeyId}:${stepId}` });
    }, 15_000);

    form.addEventListener('invalid', (event) => {
      const target = event.target;
      if (!(target instanceof window.HTMLInputElement || target instanceof window.HTMLSelectElement || target instanceof window.HTMLTextAreaElement)) return;
      const safeFieldId = SAFE_QUOTE_FIELDS[target.id || target.name];
      if (!safeFieldId) return;
      markQuoteStarted(quoteStepForElement(target));
      state.quote.validationCount += 1;
      sendSafeEvent('quote_validation_failed', {
        field_id: safeFieldId,
        step_id: quoteStepForElement(target),
        validation_category: core.classifyValidation(target.validity),
        validation_count: state.quote.validationCount,
      });
      if (state.quote.validationCount === 3 || state.quote.validationCount === 5) {
        sendSafeEvent('rage_click_detected', {
          friction_type: 'repeated_validation_failure',
          validation_count: state.quote.validationCount,
          step_id: quoteStepForElement(target),
        });
      }
      persistQuoteState();
    }, true);

    form.addEventListener('reset', () => {
      if (!state.quote.started) return;
      sendSafeEvent('quote_form_reset', {
        furthest_step_viewed: state.quote.furthestStepViewed,
        furthest_step_completed: state.quote.furthestStepCompleted,
        estimate_was_viewed: state.quote.estimateViewed,
      });
      storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
    });

    form.addEventListener('click', (event) => {
      const target = event.target instanceof window.Element ? event.target.closest('button') : null;
      if (!target) return;
      if (target.matches('[data-mobile-quote-back], [data-mobile-quote-edit]')) {
        const destinationStep = `step_${target.dataset.mobileQuoteBack || target.dataset.mobileQuoteEdit || 'previous'}`;
        sendSafeEvent('quote_step_returned', {
          step_id: core.normalizeIdentifier(destinationStep),
          previous_step: state.quote.lastStep,
          direction: 'backward',
        });
      }
      if (target.matches('[data-mobile-quote-next]')) {
        const currentStep = quoteStepForElement(target) || state.quote.lastStep;
        if (currentStep) markQuoteStepCompleted(currentStep);
      }
    });

    const estimatePanel = document.querySelector('[data-estimate-preview]');
    if (estimatePanel instanceof window.HTMLElement && typeof MutationObserver === 'function') {
      const estimateObserver = new MutationObserver(() => {
        if (estimatePanel.hidden || state.quote.estimateViewed) return;
        state.quote.estimateViewed = true;
        sendSafeEvent('quote_estimate_viewed', {
          price_was_shown: true,
          step_id: 'review_step',
          selected_service_count: state.quote.services.size,
        }, { dedupeKey: `quote_estimate:${state.journeyId}` });
        persistQuoteState();
      });
      estimateObserver.observe(estimatePanel, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
    }

    const photoInput = form.querySelector('#photoUpload');
    if (photoInput instanceof window.HTMLInputElement) {
      photoInput.addEventListener('change', () => {
        const files = Array.from(photoInput.files || []);
        if (!files.length) return;
        markQuoteStarted('photo_upload_step');
        const largest = files.reduce((max, file) => Math.max(max, Number(file.size || 0)), 0);
        sendSafeEvent('quote_upload_attempted', {
          step_id: 'photo_upload_step',
          file_count_bucket: fileCountBucket(files.length),
          file_size_bucket: fileSizeBucket(largest),
        });
        let rejectionCategory = '';
        if (files.length > 5) rejectionCategory = 'too_many_files';
        else if (files.some((file) => Number(file.size || 0) > 4 * 1024 * 1024)) rejectionCategory = 'file_too_large';
        else if (files.some((file) => !String(file.type || '').startsWith('image/'))) rejectionCategory = 'unsupported_file_type';
        if (rejectionCategory) {
          sendSafeEvent('quote_upload_failed', {
            step_id: 'photo_upload_step',
            rejection_category: rejectionCategory,
            file_count_bucket: fileCountBucket(files.length),
          });
        } else {
          sendSafeEvent('quote_upload_succeeded', {
            step_id: 'photo_upload_step',
            file_count_bucket: fileCountBucket(files.length),
            file_size_bucket: fileSizeBucket(largest),
          });
        }
      });
    }

    form.addEventListener('submit', () => {
      markQuoteStarted(state.quote.lastStep || 'review_step');
      markQuoteStepCompleted('review_step');
      beginQuoteSubmission();
    }, { capture: true });
  }

  function beginQuoteSubmission() {
    const now = Date.now();
    if (state.quote.inFlight) {
      sendSafeEvent('quote_submission_failed', {
        error_category: 'duplicate_submission_attempt',
        error_code: 'duplicate_submit',
        duration_ms: Math.max(0, now - state.quote.submissionStartedAt),
        estimate_was_viewed: state.quote.estimateViewed,
      });
      return { duplicate: true, submissionId: state.quote.submissionId };
    }
    state.quote.inFlight = true;
    state.quote.submissionStartedAt = now;
    state.quote.submissionId = createUuid();
    sendSafeEvent('quote_submission_attempted', {
      submission_id: state.quote.submissionId,
      furthest_step_completed: state.quote.furthestStepCompleted,
      estimate_was_viewed: state.quote.estimateViewed,
      selected_service_count: state.quote.services.size,
      continued_after_estimate: state.quote.estimateViewed,
    }, { dedupeKey: `quote_attempt:${state.quote.submissionId}` });
    return { duplicate: false, submissionId: state.quote.submissionId };
  }

  function quoteSubmitted(details = {}) {
    const analyticsLeadId = normalizeUuid(details.analyticsLeadId);
    const duration = clampNumber(details.durationMs || (Date.now() - state.quote.submissionStartedAt), 0, 120_000, 0);
    state.quote.submitted = true;
    state.quote.inFlight = false;
    sendSafeEvent('quote_submitted', {
      submission_id: state.quote.submissionId,
      analytics_lead_id: analyticsLeadId,
      duration_ms: duration,
      response_time_ms: duration,
      http_status: clampNumber(details.httpStatus, 100, 599, 201),
      selected_service_count: state.quote.services.size,
      estimate_was_viewed: state.quote.estimateViewed,
      email_delivery_status: core.normalizeIdentifier(details.emailDeliveryStatus, 'unknown'),
      continued_after_estimate: state.quote.estimateViewed,
    }, {
      insertId: analyticsLeadId ? `quote_submitted_${analyticsLeadId}` : `quote_submitted_${state.quote.submissionId}`,
      dedupeKey: `quote_submitted:${analyticsLeadId || state.quote.submissionId}`,
      persistent: true,
    });
    storageRemove(window.localStorage, QUOTE_FUNNEL_KEY);
  }

  function quoteSubmissionFailed(details = {}) {
    const duration = clampNumber(details.durationMs || (Date.now() - state.quote.submissionStartedAt), 0, 120_000, 0);
    state.quote.inFlight = false;
    sendSafeEvent('quote_submission_failed', {
      submission_id: state.quote.submissionId,
      duration_ms: duration,
      response_time_ms: duration,
      http_status: clampNumber(details.httpStatus, 0, 599, 0),
      error_category: core.normalizeIdentifier(details.errorCategory, 'request_failed'),
      error_code: core.normalizeIdentifier(details.errorCode, 'quote_api_error'),
      feature: 'quote_api',
      estimate_was_viewed: state.quote.estimateViewed,
      continued_after_estimate: state.quote.estimateViewed,
    });
  }

  function getLeadContext() {
    if (!state.captureStarted || !state.posthogReady || !shouldCapture()) return null;
    if (!state.attribution) setupAttributionAndVisit();
    const first = state.attribution.firstTouch;
    const last = state.attribution.lastTouch;
    return {
      journeyId: state.journeyId,
      submissionId: state.quote.submissionId || createUuid(),
      environment: state.config ? state.config.environment : inferEnvironment(),
      release: state.config ? state.config.release : getScriptRelease(),
      visitorType: state.visitorType,
      pagePath: getPagePath(),
      firstTouch: {
        source: first.source,
        medium: first.medium,
        campaign: first.campaign,
        content: first.content,
        term: first.term,
        landingPage: first.landingPage,
        gclidPresent: Boolean(first.gclidPresent),
      },
      lastTouch: {
        source: last.source,
        medium: last.medium,
        campaign: last.campaign,
        content: last.content,
        term: last.term,
        landingPage: last.landingPage,
        gclidPresent: Boolean(last.gclidPresent),
      },
    };
  }

  function setupSubscriptionTracking() {
    const form = document.getElementById('subscriptionBuilderForm');
    if (!(form instanceof window.HTMLFormElement)) return;
    form.classList.add('ph-no-capture');
    form.setAttribute('data-ph-no-autocapture', 'true');
    const start = () => {
      if (state.subscription.started) return;
      state.subscription.started = true;
      state.subscription.startedAt = Date.now();
      sendSafeEvent('subscription_started', {
        form_id: 'subscription_builder',
        form_location: 'subscription_page',
      }, { dedupeKey: `subscription_started:${state.journeyId}` });
    };
    form.addEventListener('input', start, { passive: true });
    form.addEventListener('change', (event) => {
      start();
      const target = event.target;
      if (!(target instanceof window.HTMLInputElement || target instanceof window.HTMLSelectElement)) return;
      const role = target.getAttribute('data-role');
      if (target.name === 'plan' || role === 'service-checkbox') {
        const optionId = target.name === 'plan' ? core.normalizeIdentifier(target.value) : core.normalizeServiceId(target.dataset.serviceId || target.value);
        if (optionId) {
          sendSafeEvent('subscription_option_viewed', {
            option_id: optionId,
            package_id: target.name === 'plan' ? optionId : '',
            service_id: role === 'service-checkbox' ? optionId : '',
          });
        }
      }
    }, { passive: true });
  }

  function subscriptionCompleted(details = {}) {
    sendSafeEvent('subscription_completed', {
      package_id: core.normalizeIdentifier(details.packageId, 'custom'),
      selected_service_count: clampNumber(details.selectedServiceCount, 0, 30, 0),
      duration_ms: clampNumber(details.durationMs || (Date.now() - state.subscription.startedAt), 0, 30 * 60 * 1000, 0),
      http_status: clampNumber(details.httpStatus, 100, 599, 201),
    }, {
      insertId: normalizeUuid(details.analyticsLeadId) ? `subscription_${details.analyticsLeadId}` : createUuid(),
      dedupeKey: `subscription_completed:${normalizeUuid(details.analyticsLeadId) || state.journeyId}`,
      persistent: true,
    });
  }

  function setupReliabilityTracking() {
    window.addEventListener('error', (event) => {
      const target = event.target;
      if (target instanceof window.HTMLImageElement || target instanceof window.HTMLScriptElement || target instanceof window.HTMLLinkElement) {
        const source = target.currentSrc || target.src || target.href || '';
        sendSafeEvent('resource_load_failed', {
          feature: 'page_resource',
          error_category: 'resource_load_failure',
          error_code: 'resource_unavailable',
          resource_type: target.tagName.toLowerCase(),
          resource_domain: core.sanitizeReferringDomain(source),
        }, { dedupeKey: `resource:${state.pageViewId}:${target.tagName}:${core.sanitizePath(source)}` });
        return;
      }
      sendSafeEvent('website_error_detected', {
        feature: state.quote.inFlight ? 'quote_funnel' : 'website',
        error_category: core.classifyError(event.error),
        error_code: 'unhandled_javascript_error',
      });
    }, true);
    window.addEventListener('unhandledrejection', (event) => {
      sendSafeEvent('website_error_detected', {
        feature: state.quote.inFlight ? 'quote_funnel' : 'website',
        error_category: core.classifyError(event.reason),
        error_code: 'unhandled_promise_rejection',
      });
    });
  }

  function metricRating(name, value) {
    const thresholds = {
      lcp: [2500, 4000],
      inp: [200, 500],
      cls: [0.1, 0.25],
      ttfb: [800, 1800],
      fcp: [1800, 3000],
    };
    const limits = thresholds[name];
    if (!limits) return 'unrated';
    if (value <= limits[0]) return 'good';
    if (value <= limits[1]) return 'needs_improvement';
    return 'poor';
  }

  function captureMetric(name, value, extra = {}) {
    if (!state.performanceSampled || !Number.isFinite(Number(value))) return;
    const numericValue = name === 'cls' ? Math.round(Number(value) * 1000) / 1000 : Math.round(Number(value));
    sendSafeEvent('web_vital_measured', {
      metric_name: name,
      metric_value: numericValue,
      metric_rating: metricRating(name, numericValue),
      sample_rate: state.config ? state.config.performanceSampleRate : 0,
      ...extra,
    }, { dedupeKey: `metric:${state.pageViewId}:${name}` });
  }

  function observePerformance() {
    if (!state.performanceSampled || !window.performance) return;
    const navigation = window.performance.getEntriesByType('navigation')[0];
    if (navigation) {
      captureMetric('ttfb', navigation.responseStart - navigation.requestStart);
      if (navigation.loadEventEnd > 0) captureMetric('page_load', navigation.loadEventEnd - navigation.startTime);
    }
    const firstContentfulPaint = window.performance.getEntriesByName('first-contentful-paint')[0];
    if (firstContentfulPaint) captureMetric('fcp', firstContentfulPaint.startTime);
    if (document.getElementById('quoteForm')) captureMetric('quote_form_ready', performanceNow());

    if (typeof PerformanceObserver === 'function') {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) state.performanceValues.set('lcp', last.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Unsupported performance entry types are optional.
      }
      try {
        let cls = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) cls += entry.value;
          });
          state.performanceValues.set('cls', cls);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Unsupported performance entry types are optional.
      }
      try {
        let inp = 0;
        const inpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            inp = Math.max(inp, entry.duration || 0);
          });
          state.performanceValues.set('inp', inp);
        });
        inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
      } catch {
        // Unsupported performance entry types are optional.
      }
    }

    window.addEventListener('load', () => {
      window.setTimeout(() => {
        const resources = window.performance.getEntriesByType('resource');
        const images = resources.filter((entry) => entry.initiatorType === 'img');
        if (images.length) captureMetric('image_load_slowest', Math.max(...images.map((entry) => entry.duration)));
        const slowResources = resources.filter((entry) => entry.duration >= 2000);
        if (slowResources.length) captureMetric('slow_resource_count', slowResources.length);
      }, 0);
    }, { once: true });
  }

  function flushPerformance() {
    state.performanceValues.forEach((value, name) => captureMetric(name, value));
  }

  function setupLifecycleTracking() {
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.setInterval(updateActiveTime, 1000);
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      if (state.quote.started && !state.quote.submitted) {
        persistQuoteState();
        if (Date.now() - state.quote.startedAt >= QUOTE_ABANDONMENT_MIN_MS) {
          sendSafeEvent('quote_form_abandoned', {
            furthest_step_viewed: state.quote.furthestStepViewed,
            furthest_step_completed: state.quote.furthestStepCompleted,
            duration_ms: Date.now() - state.quote.startedAt,
            validation_count: state.quote.validationCount,
            estimate_was_viewed: state.quote.estimateViewed,
            selected_service_count: state.quote.services.size,
            trigger: 'page_exit',
          }, { dedupeKey: `abandoned:${state.journeyId}:${state.pageViewId}` });
        }
      }
      flushPerformance();
      pageEngaged();
    });
    document.addEventListener('visibilitychange', () => {
      updateActiveTime();
      if (document.visibilityState === 'visible') recordActivity();
    });
  }

  function setupMutationSafety() {
    if (typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver((mutations) => {
      state.mutationCount += mutations.length;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof window.Element) markSensitiveSurfaces(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function setupBehaviorTracking() {
    if (state.trackingSetup) return;
    state.trackingSetup = true;
    setupSectionTracking();
    setupScrollTracking();
    setupClickTracking();
    setupQuoteTracking();
    setupSubscriptionTracking();
    setupReliabilityTracking();
    setupLifecycleTracking();
  }

  function bootstrap() {
    state.consent = readConsent();
    state.persistedDedupe = new Set(storageRead(window.localStorage, DEDUPE_KEY, []));
    markSensitiveSurfaces(document);
    setupMutationSafety();
    if (state.consent === 'accepted') startCaptureIfAllowed();
  }

  const runtime = Object.freeze({
    capture: sendSafeEvent,
    setConsent,
    markInternal,
    beginQuoteSubmission,
    quoteSubmitted,
    quoteSubmissionFailed,
    subscriptionCompleted,
    getLeadContext,
    getStatus() {
      return Object.freeze({
        consent: state.consent,
        configured: Boolean(state.config && state.config.enabled),
        environment: state.config ? state.config.environment : inferEnvironment(),
        posthogReady: state.posthogReady,
        captureStarted: state.captureStarted,
        disabledReason: state.disabledReason,
        internalTraffic: isInternalTraffic(),
        doNotTrack: isDoNotTrackEnabled(),
      });
    },
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();

  return { core, runtime };
});

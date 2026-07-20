(() => {
  document.documentElement.classList.add('js-enabled');

  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
  const FORM_SESSION_STARTED_AT = Date.now();
  const QUALITY_CLASSES = ['quality-high', 'quality-medium', 'quality-low'];
  const JOB_TYPE_CLASSES = ['job-type-standard', 'job-type-moderate', 'job-type-premium-access', 'job-type-large-site'];
  const ACCURACY_CLASSES = ['accuracy-high', 'accuracy-medium', 'accuracy-low'];
  const MAX_UPLOAD_FILES = 5;
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  const COOKIE_CONSENT_KEY = 'tac_cookie_consent_v1';
  let analyticsEnabled = false;
  const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  const GA_SCRIPT_ATTRIBUTE = 'data-tac-ga';
  let gaScriptRequested = false;
  const GIVEAWAY_CONFIG = {
    unlockEntryTarget: 50,
    minimumEligibleJobValueExGst: 495,
    campaignName: 'Monthly Client Giveaway',
    startsAt: '2026-07-20T07:30:00+10:00',
    endsAt: '2026-08-21T20:30:00+10:00',
    entryStatusFallback: 'Verified entry totals will appear when live status is connected.',
  };

  function getGiveawayCampaignPhase(referenceDate = new Date()) {
    const now = referenceDate instanceof Date ? referenceDate.getTime() : Date.parse(referenceDate);
    const start = Date.parse(GIVEAWAY_CONFIG.startsAt);
    const end = Date.parse(GIVEAWAY_CONFIG.endsAt);

    if (![now, start, end].every(Number.isFinite) || start >= end) return 'unconfigured';
    if (now < start) return 'upcoming';
    if (now <= end) return 'active';
    return 'closed';
  }

  function isGiveawayCampaignOpen(referenceDate = new Date()) {
    return getGiveawayCampaignPhase(referenceDate) === 'active';
  }

  function formatGiveawayDate(timestamp) {
    const formatted = new Intl.DateTimeFormat('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Brisbane',
    }).format(new Date(timestamp));
    return `${formatted.replace(' at ', ', ')} AEST`;
  }

  function loadAnalyticsScript() {
    if (gaScriptRequested) {
      return;
    }

    const configuredId =
      typeof window.__GA_MEASUREMENT_ID__ === 'string' && window.__GA_MEASUREMENT_ID__.trim()
        ? window.__GA_MEASUREMENT_ID__.trim()
        : GA_MEASUREMENT_ID;
    if (configuredId === 'G-XXXXXXXXXX' || !/^G-[A-Z0-9]+$/i.test(configuredId)) {
      return;
    }

    if (document.querySelector(`script[${GA_SCRIPT_ATTRIBUTE}=\"true\"]`)) {
      gaScriptRequested = true;
      return;
    }

    const gaScript = document.createElement('script');
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${configuredId}`;
    gaScript.async = true;
    gaScript.setAttribute(GA_SCRIPT_ATTRIBUTE, 'true');
    document.head.appendChild(gaScript);
    gaScriptRequested = true;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    gaScript.addEventListener('load', () => {
      window.gtag('js', new Date());
      window.gtag('config', configuredId, {
        anonymize_ip: true,
      });
    });
  }

  function setCookieConsentState(enabled) {
    analyticsEnabled = Boolean(enabled);
    if (analyticsEnabled) {
      loadAnalyticsScript();
    }
    if (typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('consent', 'update', {
      analytics_storage: analyticsEnabled ? 'granted' : 'denied',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
  }

  function getCookieConsent() {
    if (!(typeof localStorage === 'object')) {
      return null;
    }

    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (parsed === 'accepted' || parsed === 'denied') {
        return parsed;
      }

      if (parsed && typeof parsed === 'object' && (parsed.state === 'accepted' || parsed.state === 'denied')) {
        return parsed.state;
      }
      return null;
    } catch {
      return null;
    }
  }

  function storeCookieConsent(state) {
    if (!(typeof localStorage === 'object')) {
      return;
    }

    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({
          state,
          timestamp: Date.now(),
        })
      );
    } catch {
      // localStorage can fail in restricted environments; proceed without persisting.
    }
  }

  function trackEvent(eventName, params) {
    if (!analyticsEnabled || typeof window.gtag !== 'function') {
      return;
    }

    const eventParams = {
      ...(params || {}),
    };

    if (
      typeof window.__GA_MEASUREMENT_ID__ === 'string' &&
      window.__GA_MEASUREMENT_ID__ !== 'G-XXXXXXXXXX' &&
      /^G-[A-Z0-9]+$/.test(window.__GA_MEASUREMENT_ID__)
    ) {
      eventParams.send_to = window.__GA_MEASUREMENT_ID__;
    }

    window.gtag('event', eventName, eventParams);
  }

  // ===== Editable Smart Estimate Pricing Config (EX GST) =====
  const SMART_ESTIMATE_CONFIG = {
    gstRate: 0.1,
    minimumExGst: 250,
    rangeByComplexity: {
      simple: { spread: 0.065, accuracy: 'High' },
      moderate: { spread: 0.12, accuracy: 'Medium' },
      complex: { spread: 0.2, accuracy: 'Low' },
    },
    discountRates: {
      none: 0,
      pensioner: 0.05,
      disability: 0.05,
      military: 0.05,
      subcontractor: 0.1,
    },
    windowBaseByRoomsExGst: {
      small: { min: 300, max: 380 },
      medium: { min: 400, max: 480 },
      large: { min: 500, max: 650 },
      xl: { min: 650, max: 780 },
    },
    windowAICalibratedBaseExGst: {
      small: {
        interior: { min: 285, max: 335 },
        exterior: { min: 295, max: 345 },
        both: { min: 305, max: 365 },
      },
      medium: {
        interior: { min: 355, max: 415 },
        exterior: { min: 365, max: 425 },
        both: { min: 380, max: 440 },
      },
    },
    nonWindowBaseByServiceExGst: {
      'Pressure Washing': { small: 320, medium: 460, large: 620, xl: 840 },
      'Roof Cleaning': { small: 680, medium: 890, large: 1120, xl: 1450 },
      'Builder Clean': { small: 350, medium: 480, large: 620, xl: 820 },
      'Gutter Cleaning': { small: 280, medium: 360, large: 470, xl: 620 },
      'Solar Panel Cleaning': { small: 260, medium: 330, large: 420, xl: 560 },
      'Carpet Cleaning': { small: 300, medium: 420, large: 550, xl: 730 },
      'Upholstery Cleaning': { small: 280, medium: 390, large: 520, xl: 700 },
      'Tile & Grout Cleaning': { small: 390, medium: 560, large: 760, xl: 980 },
      'Bin Cleaning': { small: 250, medium: 280, large: 340, xl: 420 },
    },
    builderCleanAdjustment: { min: 0.4, max: 0.8, reason: 'Builder clean scope loading (+40–80%)' },
    propertyAdjustments: {
      residential: { min: 0, max: 0, reason: 'Residential scope' },
      apartment: { min: 0, max: 0, reason: 'Apartment interior + accessible balcony scope' },
      commercial: { min: 0.25, max: 0.5, reason: 'Commercial pricing profile' },
      strata: { min: 0.4, max: 0.8, reason: 'Strata/body corporate scope complexity' },
      building: { min: 0.4, max: 0.8, reason: 'Building-level scope complexity' },
    },
    storiesAdjustments: {
      '1': { min: 0, max: 0, reason: 'Single-storey baseline' },
      '2': { min: 0.2, max: 0.2, reason: 'Two-storey loading (+20%)' },
      '3': { min: 0.3, max: 0.3, reason: 'Three-storey loading (+30%)' },
      building: { min: 0.4, max: 0.6, reason: 'Building-height loading (+40–60%)' },
    },
    serviceAreaWindowAdjustments: {
      interior: { min: -0.08, max: -0.06, reason: 'Interior-only window scope' },
      exterior: { min: -0.02, max: 0.03, reason: 'Exterior-only window scope' },
      both: { min: 0.05, max: 0.1, reason: 'Interior + exterior window scope' },
    },
    accessAdjustments: {
      easy: { min: 0, max: 0, reason: 'Easy site access' },
      standard: { min: 0, max: 0, reason: 'Standard site access' },
      difficult: { min: 0.1, max: 0.15, reason: 'Difficult access loading (+10–15%)' },
    },
    conditionAdjustments: {
      light: { min: 0, max: 0, reason: 'Light condition profile' },
      standard: { min: 0, max: 0, reason: 'Standard condition profile' },
      heavy: { min: 0.15, max: 0.25, reason: 'Heavy condition loading (+15–25%)' },
    },
    firstCleanAdjustment: { min: 0.2, max: 0.3, reason: 'First-clean loading (+20–30%)' },
    addonExGst: {
      'tracks & screens': { min: 50, max: 100 },
      'gutter cleaning': { min: 95, max: 240 },
      'solar panel cleaning': { min: 90, max: 220 },
      'tile & grout cleaning': { min: 130, max: 320 },
      'bin cleaning': { min: 45, max: 120 },
      'upholstery cleaning': { min: 120, max: 280 },
    },
    simpleWindowTargetsExGst: {
      small: { min: 300, max: 360 },
      medium: { min: 380, max: 435 },
      large: { min: 500, max: 610 },
      xl: { min: 650, max: 760 },
    },
    standardWindowCeilingExGst: 480,
    giveawayThresholdMinExGst: GIVEAWAY_CONFIG.minimumEligibleJobValueExGst,
    vagueNotesPattern: /^(na|n\/a|none|no|nil|same|ok)$/i,
  };

  function getApiBase() {
    if (window.__API_BASE__) {
      return String(window.__API_BASE__).replace(/\/$/, '');
    }

    const { protocol, hostname, port } = window.location;
    if (protocol === 'file:') {
      return 'http://localhost:3000';
    }

    if (LOCAL_HOSTS.has(hostname) && port && port !== '3000') {
      return 'http://localhost:3000';
    }

    return '';
  }

  const API_BASE = getApiBase();
  const QUOTE_SUBMIT_TIMEOUT_MS = 22_000;

  async function fetchWithTimeout(url, options = {}, timeoutMs = QUOTE_SUBMIT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function toText(value) {
    return String(value ?? '').trim();
  }

  function normalize(value) {
    return toText(value).toLowerCase();
  }

  function toTitleCase(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function roundToNearestTen(value) {
    return Math.round(value / 10) * 10;
  }

  function roundToNearestFive(value) {
    return Math.round(value / 5) * 5;
  }

  function toCurrency(value) {
    return `$${Number(value || 0).toLocaleString('en-AU')}`;
  }

  function formatMoneyRange(min, max) {
    return `${toCurrency(min)} - ${toCurrency(max)} (incl. GST)`;
  }

  function uniqueReasons(reasons) {
    return Array.from(new Set(reasons.filter(Boolean)));
  }

  function normalizeAddons(addons) {
    if (!Array.isArray(addons)) {
      return [];
    }

    return addons
      .map((item) => toText(item))
      .filter(Boolean);
  }

  function toSentenceList(items) {
    const clean = items.map((item) => toText(item).toLowerCase()).filter(Boolean);
    if (!clean.length) {
      return '';
    }
    if (clean.length === 1) {
      return clean[0];
    }
    if (clean.length === 2) {
      return `${clean[0]} and ${clean[1]}`;
    }
    return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
  }

  function mapRoomsToSizeTier(rooms) {
    const key = normalize(rooms);
    if (key === '3-4') {
      return 'medium';
    }
    if (key === '5-6') {
      return 'large';
    }
    if (key === '7+') {
      return 'xl';
    }
    return 'small';
  }

  function normalizePropertyType(value) {
    const key = normalize(value);
    if (key.includes('apartment')) {
      return 'apartment';
    }
    if (key.includes('commercial')) {
      return 'commercial';
    }
    if (key.includes('strata') || key.includes('body corporate')) {
      return 'strata';
    }
    if (key.includes('building')) {
      return 'building';
    }
    return 'residential';
  }

  function normalizeStories(value) {
    const key = normalize(value);
    if (key === '2') {
      return '2';
    }
    if (key === '3') {
      return '3';
    }
    if (key.includes('building')) {
      return 'building';
    }
    return '1';
  }

  function normalizeServiceArea(value) {
    const key = normalize(value);
    if (key.includes('both')) {
      return 'both';
    }
    if (key.includes('exterior')) {
      return 'exterior';
    }
    return 'interior';
  }

  function normalizeAccess(value) {
    const key = normalize(value);
    if (key.includes('difficult')) {
      return 'difficult';
    }
    if (key.includes('standard')) {
      return 'standard';
    }
    return 'easy';
  }

  function normalizeCondition(value) {
    const key = normalize(value);
    if (key.includes('heavy')) {
      return 'heavy';
    }
    if (key.includes('standard')) {
      return 'standard';
    }
    return 'light';
  }

  function normalizeDiscount(value) {
    const key = normalize(value);
    if (key.includes('pension')) {
      return 'pensioner';
    }
    if (key.includes('disability') || key.includes('ndis')) {
      return 'disability';
    }
    if (key.includes('military') || key.includes('veteran')) {
      return 'military';
    }
    if (key.includes('subcontractor') || key.includes('trade partner')) {
      return 'subcontractor';
    }
    return 'none';
  }

  function isFirstClean(lastCleaned) {
    const key = normalize(lastCleaned);
    return key.includes('1+ years') || key.includes('never') || key.includes('12 months');
  }

  function applyAdjustment(bucket, rule, reasons) {
    if (!rule) {
      return;
    }
    bucket.min += Number(rule.min || 0);
    bucket.max += Number(rule.max || 0);
    if (rule.reason) {
      reasons.push(rule.reason);
    }
  }

  function resolveServiceProfile(service) {
    const normalizedService = normalize(service);

    if (normalizedService.includes('window')) {
      return {
        canonicalService: 'Window Cleaning',
        isWindowService: true,
        isBuilderClean: false,
      };
    }

    if (normalizedService.includes('builder')) {
      return {
        canonicalService: 'Builder Clean',
        isWindowService: false,
        isBuilderClean: true,
      };
    }

    if (normalizedService.includes('pressure')) {
      return {
        canonicalService: 'Pressure Washing',
        isWindowService: false,
        isBuilderClean: false,
      };
    }

    if (normalizedService.includes('roof')) {
      return {
        canonicalService: 'Roof Cleaning',
        isWindowService: false,
        isBuilderClean: false,
      };
    }

    if (normalizedService.includes('tile') || normalizedService.includes('grout')) {
      return {
        canonicalService: 'Tile & Grout Cleaning',
        isWindowService: false,
        isBuilderClean: false,
      };
    }

    if (normalizedService.includes('upholstery')) {
      return {
        canonicalService: 'Upholstery Cleaning',
        isWindowService: false,
        isBuilderClean: false,
      };
    }

    return {
      canonicalService: 'Pressure Washing',
      isWindowService: false,
      isBuilderClean: false,
    };
  }

  function getServiceBaseRangeExGst(serviceProfile, sizeTier) {
    if (serviceProfile.isWindowService) {
      const tier =
        SMART_ESTIMATE_CONFIG.windowBaseByRoomsExGst[sizeTier] ||
        SMART_ESTIMATE_CONFIG.windowBaseByRoomsExGst.small;
      return {
        min: Number(tier.min || 300),
        max: Number(tier.max || 380),
        isWindowService: true,
        isBuilderClean: false,
        reason: 'Window cleaning room-tier baseline',
      };
    }

    const table =
      SMART_ESTIMATE_CONFIG.nonWindowBaseByServiceExGst[serviceProfile.canonicalService] ||
      SMART_ESTIMATE_CONFIG.nonWindowBaseByServiceExGst['Pressure Washing'];
    const base = Number(table[sizeTier] || table.small || 320);

    return {
      min: base,
      max: base,
      isWindowService: false,
      isBuilderClean: serviceProfile.isBuilderClean,
      reason: `${serviceProfile.canonicalService || 'Selected service'} pricing baseline`,
    };
  }

  function getAIWindowBaseRangeExGst(normalizedLead, serviceProfile) {
    if (!serviceProfile.isWindowService) {
      return null;
    }

    const isSmallOrMedium = normalizedLead.sizeTier === 'small' || normalizedLead.sizeTier === 'medium';
    const isResidentialScope = normalizedLead.propertyType === 'residential' || normalizedLead.propertyType === 'apartment';
    if (!isSmallOrMedium || !isResidentialScope) {
      return null;
    }

    const sizeTable = SMART_ESTIMATE_CONFIG.windowAICalibratedBaseExGst[normalizedLead.sizeTier];
    if (!sizeTable) {
      return null;
    }

    const areaKey = normalizedLead.serviceArea === 'both' || normalizedLead.serviceArea === 'exterior'
      ? normalizedLead.serviceArea
      : 'interior';
    const profile = sizeTable[areaKey] || sizeTable.interior;
    if (!profile) {
      return null;
    }

    return {
      min: Number(profile.min || 300),
      max: Number(profile.max || 380),
      isWindowService: true,
      isBuilderClean: false,
      reason: 'AI-calibrated local window baseline for small/medium scope',
    };
  }

  function deriveComplexity(lead, normalizedLead) {
    const simpleProperty = normalizedLead.propertyType === 'residential' || normalizedLead.propertyType === 'apartment';
    const simpleStoreys = normalizedLead.stories === '1' || normalizedLead.stories === '2';
    const simpleAccess = normalizedLead.access === 'easy' || normalizedLead.access === 'standard';
    const simpleCondition = normalizedLead.condition === 'light' || normalizedLead.condition === 'standard';
    const simpleProfile = simpleProperty && simpleStoreys && simpleAccess && simpleCondition;

    let score = 0;
    if (normalizedLead.propertyType === 'commercial') {
      score += 2;
    }
    if (normalizedLead.propertyType === 'strata' || normalizedLead.propertyType === 'building') {
      score += 4;
    }
    if (normalize(lead.service).includes('builder')) {
      score += 3;
    }
    if (normalizedLead.stories === '2') {
      score += 1;
    }
    if (normalizedLead.stories === '3') {
      score += 2;
    }
    if (normalizedLead.stories === 'building') {
      score += 3;
    }
    if (normalizedLead.sizeTier === 'medium') {
      score += 1;
    }
    if (normalizedLead.sizeTier === 'large') {
      score += 2;
    }
    if (normalizedLead.sizeTier === 'xl') {
      score += 3;
    }
    if (normalizedLead.serviceArea === 'both') {
      score += 2;
    }
    if (normalizedLead.access === 'difficult') {
      score += 3;
    }
    if (normalizedLead.condition === 'heavy') {
      score += 2;
    }
    if (isFirstClean(lead.lastCleaned)) {
      score += 2;
    }
    if (normalizeAddons(lead.addons).length >= 2) {
      score += 2;
    }
    if (normalizeAddons(lead.addons).length >= 4) {
      score += 2;
    }

    if (simpleProfile && score <= 5) {
      return 'simple';
    }
    if (score <= 4) {
      return 'simple';
    }
    if (score <= 10) {
      return 'moderate';
    }
    return 'complex';
  }

  function calculateJobType(normalizedLead, complexity) {
    if (
      normalizedLead.propertyType === 'strata' ||
      normalizedLead.propertyType === 'building' ||
      normalizedLead.stories === 'building'
    ) {
      return 'Large Site';
    }

    if (normalizedLead.access === 'difficult') {
      return 'Premium Access';
    }

    if (complexity === 'moderate') {
      return 'Moderate';
    }

    return 'Standard';
  }

  function getJobTypeClass(jobType) {
    const normalizedType = normalize(jobType).replace(/\s+/g, '-');
    if (normalizedType.includes('large')) {
      return 'job-type-large-site';
    }
    if (normalizedType.includes('premium')) {
      return 'job-type-premium-access';
    }
    if (normalizedType.includes('moderate')) {
      return 'job-type-moderate';
    }
    return 'job-type-standard';
  }

  function estimateLeadSmart(lead) {
    if (window.TAPricing && typeof window.TAPricing.calculateEstimate === 'function') {
      return window.TAPricing.calculateEstimate(lead);
    }
    const service = toText(lead.service);
    const addons = normalizeAddons(lead.addons);
    const firstClean = isFirstClean(lead.lastCleaned);
    const serviceProfile = resolveServiceProfile(service);

    const normalizedLead = {
      propertyType: normalizePropertyType(lead.propertyType),
      stories: normalizeStories(lead.storeys),
      sizeTier: mapRoomsToSizeTier(lead.rooms),
      serviceArea: normalizeServiceArea(lead.serviceArea),
      access: normalizeAccess(lead.accessDifficulty),
      condition: normalizeCondition(lead.conditionLevel),
    };

    if (serviceProfile.isBuilderClean) {
      normalizedLead.condition = 'heavy';
    }

    const aiWindowBaseRange = getAIWindowBaseRangeExGst(normalizedLead, serviceProfile);
    const baseRange = aiWindowBaseRange || getServiceBaseRangeExGst(serviceProfile, normalizedLead.sizeTier);
    const reasons = [baseRange.reason];
    const adjustment = { min: 0, max: 0 };

    applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.propertyAdjustments[normalizedLead.propertyType], reasons);
    applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.storiesAdjustments[normalizedLead.stories], reasons);

    if (baseRange.isWindowService) {
      applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.serviceAreaWindowAdjustments[normalizedLead.serviceArea], reasons);
    }
    if (normalizedLead.access === 'difficult') {
      applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.accessAdjustments[normalizedLead.access], reasons);
    }
    if (normalizedLead.condition === 'heavy') {
      applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.conditionAdjustments[normalizedLead.condition], reasons);
    }
    if (firstClean) {
      applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.firstCleanAdjustment, reasons);
    }
    if (serviceProfile.isBuilderClean) {
      applyAdjustment(adjustment, SMART_ESTIMATE_CONFIG.builderCleanAdjustment, reasons);
      reasons.push('Builder clean jobs are treated as heavy-condition scope');
    }

    let addonsMin = 0;
    let addonsMax = 0;
    addons.forEach((addon) => {
      const addonRule = SMART_ESTIMATE_CONFIG.addonExGst[normalize(addon)] || { min: 45, max: 120 };
      addonsMin += Number(addonRule.min || 0);
      addonsMax += Number(addonRule.max || 0);
    });
    if (addons.length >= 2) {
      reasons.push('Multiple add-ons selected');
    }

    const discountKey = normalizeDiscount(lead.discountEligibility);
    const discountRate = Number(SMART_ESTIMATE_CONFIG.discountRates[discountKey] || 0);
    if (discountRate > 0) {
      reasons.push(`${toTitleCase(discountKey)} discount applied (${Math.round(discountRate * 100)}% off ex GST)`);
    }

    const complexity = deriveComplexity(lead, normalizedLead);
    const rangeProfile = SMART_ESTIMATE_CONFIG.rangeByComplexity[complexity];

    const preDiscountMinEx = baseRange.min * (1 + adjustment.min) + addonsMin;
    const preDiscountMaxEx = baseRange.max * (1 + adjustment.max) + addonsMax;
    const discountedMinEx = preDiscountMinEx * (1 - discountRate);
    const discountedMaxEx = preDiscountMaxEx * (1 - discountRate);
    const centreEx = (discountedMinEx + discountedMaxEx) / 2;

    let estimateMinExGst = centreEx * (1 - rangeProfile.spread);
    let estimateMaxExGst = centreEx * (1 + rangeProfile.spread);

  const shouldClampSimpleWindow =
      serviceProfile.isWindowService &&
      complexity === 'simple' &&
      (normalizedLead.propertyType === 'residential' || normalizedLead.propertyType === 'apartment') &&
      normalizedLead.stories === '1' &&
      normalizedLead.access !== 'difficult' &&
      normalizedLead.condition !== 'heavy' &&
      !firstClean &&
      addons.length === 0;

    if (shouldClampSimpleWindow) {
      const target =
        SMART_ESTIMATE_CONFIG.simpleWindowTargetsExGst[normalizedLead.sizeTier] ||
        SMART_ESTIMATE_CONFIG.simpleWindowTargetsExGst.small;
      estimateMinExGst = Math.max(SMART_ESTIMATE_CONFIG.minimumExGst, target.min * (1 - discountRate));
      estimateMaxExGst = Math.max(estimateMinExGst + 45, target.max * (1 - discountRate));
      reasons.push('Tight calibrated range for straightforward residential scope');
    }

    const shouldApplyMediumResidentialCeiling =
      serviceProfile.isWindowService &&
      normalizedLead.propertyType === 'residential' &&
      normalizedLead.stories === '1' &&
      normalizedLead.sizeTier === 'medium' &&
      normalizedLead.access === 'standard' &&
      normalizedLead.condition === 'standard' &&
      !firstClean &&
      addons.length === 0;

    if (shouldApplyMediumResidentialCeiling) {
      estimateMaxExGst = Math.min(estimateMaxExGst, SMART_ESTIMATE_CONFIG.standardWindowCeilingExGst);
      estimateMinExGst = Math.min(estimateMinExGst, estimateMaxExGst - 40);
      reasons.push('Standard 3–4 room residential ceiling applied');
    }

    const shouldApplySmallMediumWindowGuardrail =
      serviceProfile.isWindowService &&
      (normalizedLead.propertyType === 'residential' || normalizedLead.propertyType === 'apartment') &&
      (normalizedLead.sizeTier === 'small' || normalizedLead.sizeTier === 'medium') &&
      normalizedLead.access !== 'difficult' &&
      addons.length === 0;

    if (shouldApplySmallMediumWindowGuardrail) {
      let aiCap = Number.POSITIVE_INFINITY;

      if (normalizedLead.sizeTier === 'small' && normalizedLead.stories === '1' && normalizedLead.condition !== 'heavy' && !firstClean) {
        aiCap = 380;
      } else if (normalizedLead.sizeTier === 'small' && normalizedLead.stories === '2' && normalizedLead.condition !== 'heavy' && !firstClean) {
        aiCap = 460;
      } else if (normalizedLead.sizeTier === 'medium' && normalizedLead.stories === '1' && normalizedLead.condition !== 'heavy' && !firstClean) {
        aiCap = SMART_ESTIMATE_CONFIG.standardWindowCeilingExGst;
      } else if (normalizedLead.sizeTier === 'medium' && normalizedLead.stories === '2' && normalizedLead.condition !== 'heavy' && !firstClean) {
        aiCap = 540;
      }

      if (Number.isFinite(aiCap)) {
        estimateMaxExGst = Math.min(estimateMaxExGst, aiCap);
        estimateMinExGst = Math.min(estimateMinExGst, estimateMaxExGst - 45);
        reasons.push('AI guardrail applied to keep small/medium window estimate competitive');
      }
    }

    estimateMinExGst = roundToNearestTen(Math.max(SMART_ESTIMATE_CONFIG.minimumExGst, estimateMinExGst));
    estimateMaxExGst = roundToNearestTen(Math.max(estimateMinExGst + 40, estimateMaxExGst));

    const estimateMinIncGst = roundToNearestTen(estimateMinExGst * (1 + SMART_ESTIMATE_CONFIG.gstRate));
    const estimateMaxIncGst = roundToNearestTen(estimateMaxExGst * (1 + SMART_ESTIMATE_CONFIG.gstRate));

    const tailoredQuoteRecommended =
      (normalizedLead.propertyType === 'strata' || normalizedLead.propertyType === 'building') &&
      (normalizedLead.stories === 'building' ||
        normalizedLead.access === 'difficult' ||
        normalizedLead.sizeTier === 'xl' ||
        complexity === 'complex');

    if (normalizedLead.propertyType === 'apartment') {
      reasons.push('Apartment jobs priced as interior + accessible balcony scope');
    }

    if (tailoredQuoteRecommended) {
      reasons.push('Complex building/strata profile requires tailored confirmation');
    }

    const estimatedJobType = calculateJobType(normalizedLead, complexity);

    return {
      estimateMin: estimateMinExGst,
      estimateMax: estimateMaxExGst,
      estimateMinIncGst,
      estimateMaxIncGst,
      estimateLabel: formatMoneyRange(estimateMinIncGst, estimateMaxIncGst),
      estimateReasons: uniqueReasons(reasons).slice(0, 9),
      estimatedJobType,
      tailoredQuoteRecommended,
      estimateGuidance: tailoredQuoteRecommended
        ? 'This appears to be a larger or more complex project. We recommend a tailored quote. Final pricing confirmed after site inspection.'
        : 'Final pricing confirmed after site inspection.',
      accuracyLevel: rangeProfile.accuracy,
      eligibleForGiveaway: isGiveawayCampaignOpen() && estimateMinExGst >= SMART_ESTIMATE_CONFIG.giveawayThresholdMinExGst,
    };
  }

  function isInformativeNotes(notes) {
    const text = toText(notes);
    if (!text) {
      return false;
    }

    if (SMART_ESTIMATE_CONFIG.vagueNotesPattern.test(text.toLowerCase())) {
      return false;
    }

    const words = text.split(/\s+/).filter(Boolean);
    return words.length >= 4 && text.length >= 18;
  }

  function scoreLeadQuality(lead) {
    const requiredFields = [
      'firstName',
      'phone',
      'email',
      'address',
      'service',
      'propertyType',
      'storeys',
      'rooms',
      'serviceArea',
      'accessDifficulty',
      'conditionLevel',
      'preferredTime',
    ];
    const completedRequired = requiredFields.filter((field) => toText(lead[field])).length;

    const normalizedLeadAddons = normalizeAddons(lead.addons);
    const detailsScore = [
      isInformativeNotes(lead.notes) ? 2 : 0,
      normalizedLeadAddons.length >= 2 ? 2 : normalizedLeadAddons.length >= 1 ? 1 : 0,
      toText(lead.rooms) ? 1 : 0,
      toText(lead.preferredDate) ? 1 : 0,
      toText(lead.paymentPreference) ? 1 : 0,
      Array.isArray(lead.photoUploads) && lead.photoUploads.length ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);

    if (completedRequired === requiredFields.length && detailsScore >= 5) {
      return 'high';
    }

    if (completedRequired >= 6 && detailsScore >= 2) {
      return 'medium';
    }

    return 'low';
  }

  function generateAISummary(lead, estimate) {
    const segments = [];
    const service = toText(lead.service) || 'cleaning service';
    const propertyType = toText(lead.propertyType) || 'property';
    const serviceArea = toText(lead.serviceArea) || 'service';
    const addons = normalizeAddons(lead.addons);

    segments.push(`${propertyType} property requiring ${service.toLowerCase()} across ${serviceArea.toLowerCase()} areas.`);
    segments.push(`Site profile: ${toText(lead.storeys)} storey, ${toText(lead.rooms)} rooms, ${toText(lead.accessDifficulty).toLowerCase()} access, ${toText(lead.conditionLevel).toLowerCase()} condition.`);

    if (addons.length) {
      segments.push(`Add-ons selected: ${toSentenceList(addons)}.`);
    }

    if (toText(lead.notes)) {
      segments.push(`Customer notes: ${toText(lead.notes).replace(/\s+/g, ' ')}.`);
    }

    if (toText(lead.preferredDate) || toText(lead.preferredTime)) {
      segments.push(`Preferred booking: ${toText(lead.preferredDate) || 'next available date'} (${toText(lead.preferredTime) || 'flexible time window'}).`);
    }

    segments.push(`Quote range prepared: ${toText(estimate.estimateLabel)}. Confidence level: ${toText(estimate.accuracyLevel)}.`);
    return segments.join(' ');
  }

  function setCurrentYear() {
    document.querySelectorAll('[data-year]').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function setupMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-nav]');

    if (!toggle || !nav) {
      return;
    }

    function closeMenu() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!nav.contains(target) && target !== toggle && !toggle.contains(target)) {
        closeMenu();
      }
    });
  }

  function setupRevealAnimations() {
    const nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function setupHeroAmbientMotion() {
    const hero = document.querySelector('.hero');
    if (!(hero instanceof HTMLElement)) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const desktopWidth = window.matchMedia('(min-width: 1101px)').matches;
    if (!finePointer || !desktopWidth) {
      return;
    }

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;

    const applyMotion = () => {
      hero.style.setProperty('--hero-mouse-x', targetX.toFixed(3));
      hero.style.setProperty('--hero-mouse-y', targetY.toFixed(3));
      rafId = 0;
    };

    hero.addEventListener(
      'mousemove',
      (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        targetX = (x - 0.5) * 0.8;
        targetY = (y - 0.5) * 0.8;

        if (!rafId) {
          rafId = window.requestAnimationFrame(applyMotion);
        }
      },
      { passive: true }
    );

    hero.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) {
        rafId = window.requestAnimationFrame(applyMotion);
      }
    });
  }

  function initCookieConsent() {
    const consentBanner = document.getElementById('cookie-consent');
    const acceptButton = document.getElementById('cookie-accept');
    const denyButton = document.getElementById('cookie-decline');

    if (!consentBanner || !acceptButton || !denyButton) {
      setCookieConsentState(false);
      return;
    }

    const savedConsent = getCookieConsent();
    if (savedConsent === 'accepted') {
      setCookieConsentState(true);
      consentBanner.setAttribute('hidden', 'hidden');
      return;
    }

    if (savedConsent === 'denied') {
      setCookieConsentState(false);
      consentBanner.setAttribute('hidden', 'hidden');
      return;
    }

    consentBanner.removeAttribute('hidden');
    setCookieConsentState(false);

    acceptButton.addEventListener('click', () => {
      setCookieConsentState(true);
      storeCookieConsent('accepted');
      consentBanner.setAttribute('hidden', 'hidden');
      trackEvent('cookie_consent', {
        consent_state: 'accepted',
      });
    });

    denyButton.addEventListener('click', () => {
      setCookieConsentState(false);
      storeCookieConsent('denied');
      consentBanner.setAttribute('hidden', 'hidden');
      trackEvent('cookie_consent', {
        consent_state: 'denied',
      });
    });
  }

  function setFormMessage(message, tone = 'info') {
    const node = document.getElementById('formMessage');
    if (!node) {
      return;
    }

    node.textContent = message;
    if (tone === 'error') {
      node.style.color = '#b91c1c';
      return;
    }
    if (tone === 'success') {
      node.style.color = '#0f766e';
      return;
    }
    node.style.color = '#007fbe';
  }

  function setButtonLabel(button, label) {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const labelNode = button.querySelector('[data-button-label]');
    if (labelNode) {
      labelNode.textContent = label;
      return;
    }

    button.textContent = label;
  }

  function updateUploadNote(message, tone = 'info') {
    const node = document.getElementById('photoUploadNote');
    if (!node) {
      return;
    }

    node.textContent = message;
    if (tone === 'error') {
      node.style.color = '#b91c1c';
      return;
    }
    if (tone === 'success') {
      node.style.color = '#0f766e';
      return;
    }
    node.style.color = '#4e5f77';
  }

  function applyJobTypeBadge(node, type) {
    if (!node) {
      return;
    }

    const className = getJobTypeClass(type);
    node.classList.remove(...JOB_TYPE_CLASSES);
    node.classList.add(className);
  }

  function getAccuracyClass(level) {
    const key = normalize(level);
    if (key === 'high') {
      return 'accuracy-high';
    }
    if (key === 'low') {
      return 'accuracy-low';
    }
    return 'accuracy-medium';
  }

  function applyAccuracyBadge(node, level) {
    if (!node) {
      return;
    }

    node.classList.remove(...ACCURACY_CLASSES);
    node.classList.add(getAccuracyClass(level));
  }

  function renderEstimatePreview(result) {
    const panel = document.querySelector('[data-estimate-preview]');
    const rangeNode = document.querySelector('[data-preview-range]');
    const typeNode = document.querySelector('[data-preview-job-type]');
    const accuracyNode = document.querySelector('[data-preview-accuracy]');
    const noteNode = document.querySelector('[data-preview-note]');
    const reasonsNode = document.querySelector('[data-preview-reasons]');
    const breakdownNode = document.querySelector('[data-preview-breakdown]');

    if (!panel || !rangeNode || !typeNode || !accuracyNode || !noteNode || !reasonsNode) {
      return;
    }

    rangeNode.textContent = String(result.recommendedEstimateLabel || result.estimateLabel || '$0 incl. GST');
    typeNode.textContent = String(result.estimatedJobType || 'Standard');
    accuracyNode.textContent = `Pricing Confidence: ${toText(result.accuracyLevel || 'Medium')}`;
    noteNode.textContent = String(result.estimateGuidance || 'Final pricing confirmed after site inspection.');
    renderCalculationBreakdown(breakdownNode, result.calculationBreakdown);

    applyJobTypeBadge(typeNode, result.estimatedJobType);
    applyAccuracyBadge(accuracyNode, result.accuracyLevel);

    reasonsNode.innerHTML = '';
    (Array.isArray(result.estimateReasons) ? result.estimateReasons : []).slice(0, 7).forEach((reason) => {
      const item = document.createElement('li');
      item.textContent = String(reason);
      reasonsNode.appendChild(item);
    });

    panel.hidden = false;
  }

  function hideEstimatePreview() {
    const panel = document.querySelector('[data-estimate-preview]');
    if (!panel) {
      return;
    }
    panel.hidden = true;
  }

  function renderQuoteResult(result) {
    const panel = document.querySelector('[data-result-panel]');
    const rangeNode = document.querySelector('[data-result-range]');
    const typeNode = document.querySelector('[data-result-job-type]');
    const accuracyNode = document.querySelector('[data-result-accuracy]');
    const noteNode = document.querySelector('[data-result-note]');
    const reasonsNode = document.querySelector('[data-result-reasons]');
    const summaryNode = document.querySelector('[data-result-summary]');
    const qualityNode = document.querySelector('[data-result-quality]');
    const giveawayNode = document.querySelector('[data-result-giveaway]');
    const breakdownNode = document.querySelector('[data-result-breakdown]');

    if (!panel || !rangeNode || !typeNode || !accuracyNode || !noteNode || !reasonsNode || !summaryNode || !qualityNode || !giveawayNode) {
      return;
    }

    rangeNode.textContent = String(result.recommendedEstimateLabel || result.estimateLabel || '$0 incl. GST');

    const jobTypeText = String(result.estimatedJobType || 'Standard');
    typeNode.textContent = `Service Scope: ${jobTypeText}`;
    applyJobTypeBadge(typeNode, jobTypeText);

    const accuracyText = String(result.accuracyLevel || 'Medium');
    accuracyNode.textContent = `Pricing Confidence: ${accuracyText}`;
    applyAccuracyBadge(accuracyNode, accuracyText);

    noteNode.textContent = String(result.estimateGuidance || 'Final pricing confirmed after site inspection.');
    renderCalculationBreakdown(breakdownNode, result.calculationBreakdown);

    reasonsNode.innerHTML = '';
    const reasons = Array.isArray(result.estimateReasons) && result.estimateReasons.length
      ? result.estimateReasons
      : ['Service type and property details were used to generate this estimate.'];

    reasons.forEach((reason) => {
      const item = document.createElement('li');
      item.textContent = String(reason);
      reasonsNode.appendChild(item);
    });

    summaryNode.textContent = String(result.aiSummary || 'Quote summary unavailable.');

    const qualityRaw = String(result.leadQuality || 'medium').toLowerCase();
    qualityNode.classList.remove(...QUALITY_CLASSES);
    qualityNode.classList.add(`quality-${qualityRaw}`);
    qualityNode.textContent = `Detail Level: ${toTitleCase(qualityRaw)}`;

    const giveawayPhase = getGiveawayCampaignPhase();
    if (giveawayPhase === 'upcoming') {
      giveawayNode.textContent = `Giveaway entries open ${formatGiveawayDate(GIVEAWAY_CONFIG.startsAt)}. Requests submitted before then are not counted.`;
    } else if (giveawayPhase === 'closed') {
      giveawayNode.textContent = `This giveaway closed ${formatGiveawayDate(GIVEAWAY_CONFIG.endsAt)}.`;
    } else if (result.eligibleForGiveaway) {
      giveawayNode.textContent = 'Eligible quote requests may be reviewed for the current monthly giveaway after the team confirms scope and campaign requirements.';
    } else {
      giveawayNode.textContent = 'Eligible quote requests may be reviewed for the current monthly giveaway; giveaway participation is separate from quote approval and booking.';
    }

    panel.hidden = false;
  }

  function setupPackageButtons() {
    const packageInput = document.getElementById('subscriptionPackage');
    if (!(packageInput instanceof HTMLInputElement)) {
      return;
    }

    document.querySelectorAll('[data-package]').forEach((link) => {
      link.addEventListener('click', () => {
        const value = String(link.getAttribute('data-package') || '').trim();
        packageInput.value = value;
        trackEvent('package_prefill', {
          package_name: value || 'unknown',
        });
      });
    });
  }

  function renderCalculationBreakdown(container, breakdown) {
    if (!(container instanceof HTMLElement)) return;
    container.replaceChildren();
    if (!breakdown || !Array.isArray(breakdown.lines) || !breakdown.lines.length) return;

    const title = document.createElement('h4');
    title.textContent = 'Price calculation';
    container.appendChild(title);

    breakdown.lines.forEach((line) => {
      const row = document.createElement('div');
      row.className = 'estimate-calc-row estimate-calc-service';
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = line.label;
      const detail = document.createElement('span');
      const rateText = line.unitRateExGst !== null && line.unitRateExGst !== undefined && Number.isFinite(Number(line.unitRateExGst))
        ? ` x ${window.TAPricing.money(line.unitRateExGst)} ex GST`
        : line.pricingNote ? ` - ${line.pricingNote}` : '';
      detail.textContent = `${line.quantity} ${line.unitLabel}${rateText}`;
      copy.append(name, detail);
      const amount = document.createElement('b');
      amount.textContent = window.TAPricing.money(line.subtotalExGst);
      row.append(copy, amount);
      container.appendChild(row);

      if (Number(line.minimumExGst || 0) > 0) {
        const minimum = document.createElement('p');
        minimum.className = 'estimate-calc-minimum';
        minimum.textContent = `Service minimum: ${window.TAPricing.money(line.minimumExGst)} ex GST (applied once per category)`;
        container.appendChild(minimum);
      }
    });

    (Array.isArray(breakdown.adjustments) ? breakdown.adjustments : []).forEach((adjustment) => {
      const row = document.createElement('div');
      row.className = 'estimate-calc-row';
      const label = document.createElement('span');
      label.textContent = adjustment.label;
      const amount = document.createElement('b');
      const value = Number(adjustment.amountExGst || 0);
      amount.textContent = `${value < 0 ? '-' : '+'}${window.TAPricing.money(Math.abs(value))}`;
      row.append(label, amount);
      container.appendChild(row);
    });

    const totals = [
      ['Subtotal ex GST', breakdown.subtotalExGst],
      ['GST (10%)', breakdown.gst],
      ['Total incl. GST', breakdown.totalIncGst],
    ];
    totals.forEach(([labelText, value], index) => {
      const row = document.createElement('div');
      row.className = `estimate-calc-row ${index === totals.length - 1 ? 'estimate-calc-total' : ''}`;
      const label = document.createElement(index === totals.length - 1 ? 'strong' : 'span');
      label.textContent = labelText;
      const amount = document.createElement('b');
      amount.textContent = window.TAPricing.money(value);
      row.append(label, amount);
      container.appendChild(row);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function serializePhotoUploads(fileInput) {
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files || !fileInput.files.length) {
      return { uploads: [], warnings: [] };
    }

    const files = Array.from(fileInput.files).slice(0, MAX_UPLOAD_FILES);
    const uploads = [];
    const warnings = [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        warnings.push(`${file.name} was skipped (over 4MB).`);
        continue;
      }
      if (!String(file.type || '').startsWith('image/')) {
        warnings.push(`${file.name} was skipped (not an image).`);
        continue;
      }

      const dataUrl = await readFileAsDataUrl(file);
      uploads.push({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    }

    return { uploads, warnings };
  }

  function buildBasePayload(form) {
    const formData = new FormData(form);
    return {
      firstName: toText(formData.get('firstName')),
      phone: toText(formData.get('phone')),
      email: toText(formData.get('email')),
      address: toText(formData.get('address')),
      service: toText(formData.get('service')) ? toText(form.querySelector('#service')?.selectedOptions?.[0]?.textContent) : '',
      serviceGroup: toText(formData.get('service')),
      pricingItemCode: toText(formData.get('pricingItemCode')),
      lineItems: collectPricingLineItems(form),
      propertyType: toText(formData.get('propertyType')),
      storeys: toText(formData.get('storeys')),
      rooms: toText(formData.get('rooms')),
      serviceArea: toText(formData.get('serviceArea')),
      scopeQuantity: Math.max(0, Math.round(Number(formData.get('scopeQuantity') || 0))),
      scopeUnit: toText(formData.get('scopeUnit')),
      scopeDetail: toText(formData.get('scopeDetail')),
      accessDifficulty: toText(formData.get('accessDifficulty')),
      conditionLevel: toText(formData.get('conditionLevel')),
      recurringFrequency: toText(formData.get('recurringFrequency')) || 'one_off',
      timingLoading: toText(formData.get('timingLoading')) || 'standard',
      travelBand: toText(formData.get('travelBand')) || 'within25',
      discountEligibility: toText(formData.get('discountEligibility')) || 'None',
      parking: toText(formData.get('parking')),
      lastCleaned: toText(formData.get('lastCleaned')),
      preferredDate: toText(formData.get('preferredDate')),
      preferredTime: toText(formData.get('preferredTime')),
      paymentPreference: toText(formData.get('paymentPreference')),
      notes: toText(formData.get('notes')),
      website: toText(formData.get('website')),
      subscriptionPackage: toText(formData.get('subscriptionPackage')),
      addons: formData.getAll('addons').map((value) => toText(value)).filter(Boolean),
      agree: Boolean(formData.get('agree')),
      formElapsedMs: Math.max(0, Date.now() - FORM_SESSION_STARTED_AT),
      clientSubmittedAt: new Date().toISOString(),
      deliveryTargets: {
        email: 'tandaprocleaning@gmail.com',
        commandCentre: 'T & A Quote Desk',
      },
    };
  }

  async function buildPayload(form) {
    const payload = buildBasePayload(form);
    const fileInput = form.querySelector('#photoUpload');
    const { uploads, warnings } = await serializePhotoUploads(fileInput);
    payload.photoUploads = uploads;
    payload.uploadWarnings = warnings;
    return payload;
  }

  function hasPreviewData(payload) {
    return Boolean(
      toText(payload.service) &&
      toText(payload.pricingItemCode) &&
      Number(payload.scopeQuantity || 0) > 0 &&
      toText(payload.propertyType) &&
      toText(payload.storeys) &&
      toText(payload.rooms) &&
      toText(payload.serviceArea)
    );
  }

  function buildLocalResult(payload) {
    const estimate = estimateLeadSmart(payload);
    return {
      ...estimate,
      aiSummary: generateAISummary(payload, estimate),
      leadQuality: scoreLeadQuality(payload),
      eligibleForGiveaway: estimate.eligibleForGiveaway,
    };
  }

  function normalizeApiResult(apiResult, fallbackResult) {
    const merged = {
      ...fallbackResult,
      ...(apiResult && typeof apiResult === 'object' ? apiResult : {}),
    };

    merged.estimateMin = Number.isFinite(Number(merged.estimateMin)) ? Number(merged.estimateMin) : fallbackResult.estimateMin;
    merged.estimateMax = Number.isFinite(Number(merged.estimateMax)) ? Number(merged.estimateMax) : fallbackResult.estimateMax;
    merged.estimateLabel = toText(merged.estimateLabel) || fallbackResult.estimateLabel;

    if (!Array.isArray(merged.estimateReasons) || !merged.estimateReasons.length) {
      merged.estimateReasons = fallbackResult.estimateReasons;
    }

    if (!toText(merged.aiSummary)) {
      merged.aiSummary = fallbackResult.aiSummary;
    }

    if (!toText(merged.leadQuality)) {
      merged.leadQuality = fallbackResult.leadQuality;
    }

    if (!toText(merged.accuracyLevel)) {
      merged.accuracyLevel = fallbackResult.accuracyLevel;
    }

    const explicitEligible = typeof merged.eligibleForGiveaway === 'boolean' ? merged.eligibleForGiveaway : null;
    merged.eligibleForGiveaway = explicitEligible !== null
      ? explicitEligible
      : merged.estimateMin >= SMART_ESTIMATE_CONFIG.giveawayThresholdMinExGst;

    merged.estimatedJobType = toText(merged.estimatedJobType) || fallbackResult.estimatedJobType;
    merged.tailoredQuoteRecommended = typeof merged.tailoredQuoteRecommended === 'boolean'
      ? merged.tailoredQuoteRecommended
      : Boolean(fallbackResult.tailoredQuoteRecommended);
    merged.estimateGuidance = toText(merged.estimateGuidance) || fallbackResult.estimateGuidance;

    return merged;
  }

  function bumpGiveawayCounterIfEligible(isEligible) {
    if (!isEligible) {
      return;
    }

    window.setTimeout(() => loadGiveawayStatus(), 500);
  }

  function setupSmartEstimatePreview(form) {
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    let rafId = 0;

    const runPreview = () => {
      rafId = 0;
      const payload = buildBasePayload(form);

      if (!hasPreviewData(payload)) {
        hideEstimatePreview();
        return;
      }

      renderEstimatePreview(estimateLeadSmart(payload));
    };

    const queuePreview = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(runPreview);
    };

    form.addEventListener('input', queuePreview, { passive: true });
    form.addEventListener('change', queuePreview, { passive: true });
  }

  function setupScopeQuantityFields(form) {
    const service = form.querySelector('#service');
    const pricingItem = form.querySelector('#pricingItemCode');
    const quantity = form.querySelector('#scopeQuantity');
    const unit = form.querySelector('#scopeUnit');
    const unitLabel = form.querySelector('[data-scope-unit-label]');
    const unitSummary = form.querySelector('[data-scope-unit-summary]');
    const quantityHelp = form.querySelector('[data-quantity-help]');
    const quantityField = form.querySelector('[data-quantity-field]');
    const scopeMeasurement = form.querySelector('[data-scope-measurement]');
    const addButton = form.querySelector('[data-add-service]');
    const additionalContainer = form.querySelector('[data-additional-service-items]');
    const engine = window.TAPricing;
    if (!engine || !(service instanceof HTMLSelectElement) || !(pricingItem instanceof HTMLSelectElement) || !(quantity instanceof HTMLInputElement) || !(unit instanceof HTMLInputElement) || !(additionalContainer instanceof HTMLElement)) {
      return;
    }

    const addOption = (select, value, label) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    };

    const populateGroups = (select) => {
      select.replaceChildren();
      addOption(select, '', 'What would you like cleaned?');
      engine.getGroups().forEach((group) => addOption(select, group.id, group.label));
    };

    const populateItems = (groupSelect, itemSelect, includeAddons = false) => {
      itemSelect.replaceChildren();
      const groupItems = engine.getItemsForGroup(groupSelect.value);
      const items = includeAddons ? groupItems : groupItems.filter((entry) => !entry.addonOnly);
      addOption(itemSelect, '', items.length ? 'Choose the closest job' : 'Choose a service first');
      items.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.code;
        option.textContent = `${entry.label}${entry.addonOnly ? ' (add-on)' : ''}${entry.manual ? ' (inspection)' : ''}`;
        itemSelect.appendChild(option);
      });
      itemSelect.disabled = !items.length;
    };

    const syncUnit = (itemSelect, quantityInput, unitNode, clearQuantity = false) => {
      const entry = engine.getItem(itemSelect.value);
      const isPrimaryItem = unitNode === unit;
      if (clearQuantity) quantityInput.value = '';
      if (!entry) {
        if (unitNode instanceof HTMLInputElement) unitNode.value = '';
        else if (unitNode) unitNode.textContent = 'Choose a job';
        quantityInput.placeholder = 'Choose a job first';
        if (isPrimaryItem) {
          if (quantityHelp) quantityHelp.textContent = 'Choose a job above and we will tell you what to count.';
          if (quantityField instanceof HTMLElement) quantityField.hidden = false;
          if (unitSummary instanceof HTMLElement) unitSummary.hidden = true;
          if (scopeMeasurement instanceof HTMLElement) scopeMeasurement.classList.remove('is-fixed');
        }
        return;
      }
      const isFixed = entry.mode === 'fixed' || entry.manual;
      if (isFixed) quantityInput.value = '1';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.inputMode = 'numeric';
      quantityInput.placeholder = `Enter ${engine.unitLabel(entry.unit, 2)}`;
      if (unitNode instanceof HTMLInputElement) unitNode.value = entry.unit;
      else if (unitNode) unitNode.textContent = engine.unitLabel(entry.unit, 2);
      if (isPrimaryItem) {
        if (quantityField instanceof HTMLElement) quantityField.hidden = isFixed;
        if (unitSummary instanceof HTMLElement) unitSummary.hidden = isFixed;
        if (scopeMeasurement instanceof HTMLElement) scopeMeasurement.classList.toggle('is-fixed', isFixed);
        if (unitLabel) unitLabel.textContent = engine.unitLabel(entry.unit, 2);
        if (quantityHelp) quantityHelp.textContent = `Enter the approximate number of ${engine.unitLabel(entry.unit, 2)}.`;
      }
    };

    const createAdditionalRow = ({ groupId = '', itemCode = '', generatedByPicker = false } = {}) => {
      if (additionalContainer.children.length >= 8) return;
      const row = document.createElement('div');
      row.className = 'additional-service-row';

      const groupSelect = document.createElement('select');
      groupSelect.className = 'additional-service-group';
      groupSelect.setAttribute('aria-label', 'Additional service type');
      populateGroups(groupSelect);

      const itemSelect = document.createElement('select');
      itemSelect.className = 'additional-service-item';
      itemSelect.setAttribute('aria-label', 'Additional exact service item');
      populateItems(groupSelect, itemSelect, true);

      const quantityInput = document.createElement('input');
      quantityInput.className = 'additional-service-quantity';
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.inputMode = 'numeric';
      quantityInput.placeholder = 'Quantity';
      quantityInput.setAttribute('aria-label', 'Additional service quantity');

      const unitText = document.createElement('span');
      unitText.className = 'additional-service-unit';
      unitText.textContent = 'Select an item';

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'additional-service-remove';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', 'Remove additional service');

      groupSelect.addEventListener('change', () => {
        populateItems(groupSelect, itemSelect, true);
        quantityInput.value = '';
        syncUnit(itemSelect, quantityInput, unitText);
      });
      itemSelect.addEventListener('change', () => syncUnit(itemSelect, quantityInput, unitText, true));
      removeButton.addEventListener('click', () => {
        if (row.dataset.pickerGenerated === 'true' && row.dataset.pickerCode) {
          selectedItems.delete(row.dataset.pickerCode);
          refreshJobPicker();
          applySelectedItems();
          return;
        }
        row.remove();
        form.dispatchEvent(new Event('change', { bubbles: true }));
      });

      row.append(groupSelect, itemSelect, quantityInput, unitText, removeButton);
      additionalContainer.appendChild(row);
      if (groupId) {
        groupSelect.value = groupId;
        populateItems(groupSelect, itemSelect, true);
      }
      if (itemCode) {
        itemSelect.value = itemCode;
        syncUnit(itemSelect, quantityInput, unitText, true);
      }
      if (generatedByPicker) {
        row.dataset.pickerGenerated = 'true';
        row.dataset.pickerCode = itemCode;
        const compactSummary = document.createElement('div');
        compactSummary.className = 'additional-service-summary';
        const compactGroup = document.createElement('span');
        compactGroup.textContent = engine.getGroups().find((group) => group.id === groupId)?.label || 'Selected service';
        const compactItem = document.createElement('strong');
        compactItem.textContent = engine.getItem(itemCode)?.label || 'Selected job';
        compactSummary.append(compactGroup, compactItem);
        row.prepend(compactSummary);
      }
      if (!generatedByPicker) groupSelect.focus();
      return row;
    };

    const normalizeWholeNumber = (input) => {
      if (!(input instanceof HTMLInputElement) || !input.value) return;
      const value = Number(input.value);
      if (Number.isFinite(value)) input.value = String(Math.max(1, Math.round(value)));
    };

    quantity.addEventListener('change', () => normalizeWholeNumber(quantity));
    additionalContainer.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.classList.contains('additional-service-quantity')) {
        normalizeWholeNumber(event.target);
      }
    });

    const createPickerShell = (select, placeholder, instruction) => {
      select.classList.add('scope-native-select');
      select.tabIndex = -1;

      const picker = document.createElement('div');
      picker.className = 'scope-check-picker';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'scope-picker-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const summary = document.createElement('span');
      summary.className = 'scope-picker-summary';
      summary.textContent = placeholder;
      toggle.appendChild(summary);

      const panel = document.createElement('div');
      panel.className = 'scope-picker-panel';
      panel.hidden = true;

      const guidance = document.createElement('p');
      guidance.className = 'scope-picker-instruction';
      guidance.textContent = instruction;

      const options = document.createElement('div');
      options.className = 'scope-picker-options';

      const footer = document.createElement('div');
      footer.className = 'scope-picker-footer';

      const count = document.createElement('span');
      count.className = 'scope-picker-count';
      count.textContent = 'Nothing selected';

      const done = document.createElement('button');
      done.type = 'button';
      done.className = 'scope-picker-done';
      done.textContent = 'Done';

      footer.append(count, done);
      panel.append(guidance, options, footer);
      picker.append(toggle, panel);
      select.insertAdjacentElement('beforebegin', picker);

      const close = () => {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      };
      const open = () => {
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
      };

      toggle.addEventListener('click', () => panel.hidden ? open() : close());
      document.addEventListener('click', (event) => {
        if (!picker.contains(event.target)) close();
      });
      picker.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          close();
          toggle.focus();
        }
      });

      return { picker, toggle, panel, options, done, count, summary, close, open };
    };

    const groups = engine.getGroups();
    const itemGroupByCode = new Map();
    groups.forEach((group) => {
      engine.getItemsForGroup(group.id).forEach((entry) => itemGroupByCode.set(entry.code, group.id));
    });

    const selectedGroups = new Set();
    const selectedItems = new Set();
    const servicePicker = createPickerShell(service, 'Choose one or more services', 'Tick every service you would like included, then press Done.');
    const jobPicker = createPickerShell(pricingItem, 'Choose one or more job types', 'Tick the closest job variations for your property, then press Done.');
    jobPicker.toggle.disabled = true;
    const serviceLabel = form.querySelector('label[for="service"]');
    const jobLabel = form.querySelector('label[for="pricingItemCode"]');
    if (serviceLabel instanceof HTMLLabelElement) {
      serviceLabel.addEventListener('click', (event) => {
        event.preventDefault();
        servicePicker.open();
      });
    }
    if (jobLabel instanceof HTMLLabelElement) {
      jobLabel.addEventListener('click', (event) => {
        event.preventDefault();
        if (!jobPicker.toggle.disabled) jobPicker.open();
      });
    }

    const updatePickerSummary = (picker, labels, emptyText) => {
      if (!labels.length) {
        picker.summary.textContent = emptyText;
        picker.count.textContent = 'Nothing selected';
        picker.picker.classList.remove('has-selection');
        return;
      }
      picker.summary.textContent = labels.length === 1 ? labels[0] : `${labels[0]} + ${labels.length - 1} more`;
      picker.count.textContent = `${labels.length} selected`;
      picker.picker.classList.add('has-selection');
    };

    const makeCheckOption = (value, label, selectedSet, onChange) => {
      const option = document.createElement('label');
      option.className = 'scope-check-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = value;
      checkbox.checked = selectedSet.has(value);
      const text = document.createElement('span');
      text.textContent = label;
      option.append(checkbox, text);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedSet.add(value);
        else selectedSet.delete(value);
        onChange();
      });
      return option;
    };

    const selectedGroupLabels = () => groups.filter((group) => selectedGroups.has(group.id)).map((group) => group.label);
    const selectedItemEntries = () => {
      const entries = [];
      groups.forEach((group) => {
        engine.getItemsForGroup(group.id).forEach((entry) => {
          if (selectedItems.has(entry.code)) entries.push(entry);
        });
      });
      return entries;
    };

    const refreshServicePicker = () => {
      servicePicker.options.replaceChildren();
      groups.forEach((group) => {
        servicePicker.options.appendChild(makeCheckOption(group.id, group.label, selectedGroups, () => {
          updatePickerSummary(servicePicker, selectedGroupLabels(), 'Choose one or more services');
        }));
      });
      updatePickerSummary(servicePicker, selectedGroupLabels(), 'Choose one or more services');
    };

    const refreshJobPicker = () => {
      jobPicker.options.replaceChildren();
      const activeGroups = groups.filter((group) => selectedGroups.has(group.id));
      activeGroups.forEach((group) => {
        const section = document.createElement('section');
        section.className = 'scope-picker-option-group';
        const heading = document.createElement('h4');
        heading.textContent = group.label;
        section.appendChild(heading);
        engine.getItemsForGroup(group.id).filter((entry) => !entry.addonOnly).forEach((entry) => {
          section.appendChild(makeCheckOption(entry.code, entry.label, selectedItems, () => {
            updatePickerSummary(jobPicker, selectedItemEntries().map((item) => item.label), 'Choose one or more job types');
          }));
        });
        jobPicker.options.appendChild(section);
      });
      updatePickerSummary(jobPicker, selectedItemEntries().map((item) => item.label), 'Choose one or more job types');
    };

    const applySelectedItems = () => {
      const entries = selectedItemEntries();
      const disclosure = additionalContainer.closest('details');
      const disclosureSummary = disclosure?.querySelector('[data-additional-summary]');
      additionalContainer.querySelectorAll('[data-picker-generated="true"]').forEach((row) => row.remove());

      if (!entries.length) {
        if (disclosureSummary instanceof HTMLElement) disclosureSummary.textContent = 'Add another service or extra';
        pricingItem.value = '';
        quantity.value = '';
        syncUnit(pricingItem, quantity, unit);
        form.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      const primary = entries[0];
      const primaryGroup = itemGroupByCode.get(primary.code) || '';
      service.value = primaryGroup;
      populateItems(service, pricingItem);
      pricingItem.value = primary.code;
      syncUnit(pricingItem, quantity, unit, true);

      entries.slice(1).forEach((entry) => {
        createAdditionalRow({
          groupId: itemGroupByCode.get(entry.code) || '',
          itemCode: entry.code,
          generatedByPicker: true,
        });
      });

      if (disclosureSummary instanceof HTMLElement) {
        const additionalCount = Math.max(0, entries.length - 1);
        disclosureSummary.textContent = additionalCount
          ? `${additionalCount} additional job type${additionalCount === 1 ? '' : 's'} selected`
          : 'Add another service or extra';
      }
      if (disclosure instanceof HTMLDetailsElement && entries.length > 1) disclosure.open = true;
      form.dispatchEvent(new Event('change', { bubbles: true }));
    };

    refreshServicePicker();
    refreshJobPicker();

    servicePicker.done.addEventListener('click', () => {
      const activeGroups = groups.filter((group) => selectedGroups.has(group.id));
      if (!activeGroups.length) {
        servicePicker.count.textContent = 'Select at least one service';
        return;
      }

      const allowedGroups = new Set(activeGroups.map((group) => group.id));
      [...selectedItems].forEach((code) => {
        if (!allowedGroups.has(itemGroupByCode.get(code))) selectedItems.delete(code);
      });
      service.value = activeGroups[0].id;
      populateItems(service, pricingItem);
      pricingItem.value = '';
      quantity.value = '';
      syncUnit(pricingItem, quantity, unit);
      jobPicker.toggle.disabled = false;
      refreshJobPicker();
      applySelectedItems();
      servicePicker.close();
      jobPicker.toggle.focus();
    });

    jobPicker.done.addEventListener('click', () => {
      if (!selectedItems.size) {
        jobPicker.count.textContent = 'Select at least one job type';
        return;
      }
      applySelectedItems();
      jobPicker.close();
      const nextField = quantityField instanceof HTMLElement && quantityField.hidden
        ? form.querySelector('#serviceArea')
        : quantity;
      if (nextField instanceof HTMLElement) nextField.focus();
    });

    populateGroups(service);
    populateItems(service, pricingItem);
    service.addEventListener('change', () => {
      populateItems(service, pricingItem);
      quantity.value = '';
      syncUnit(pricingItem, quantity, unit);
    });
    pricingItem.addEventListener('change', () => syncUnit(pricingItem, quantity, unit, true));
    if (addButton instanceof HTMLButtonElement) addButton.addEventListener('click', () => createAdditionalRow());
    syncUnit(pricingItem, quantity, unit);
  }

  function collectPricingLineItems(form) {
    const lines = [];
    const primaryCode = toText(form.querySelector('#pricingItemCode')?.value);
    if (primaryCode) {
      lines.push({ code: primaryCode, quantity: Math.max(0, Math.round(Number(form.querySelector('#scopeQuantity')?.value) || 0)) });
    }
    form.querySelectorAll('.additional-service-row').forEach((row) => {
      const code = toText(row.querySelector('.additional-service-item')?.value);
      const quantity = Math.max(0, Math.round(Number(row.querySelector('.additional-service-quantity')?.value) || 0));
      if (code) lines.push({ code, quantity });
    });
    return lines;
  }

  function setupMobileQuoteSteps(form) {
    const propertyCard = form.querySelector('.property-details-card');
    const serviceCard = form.querySelector('.service-scope-card');
    const propertySummary = form.querySelector('[data-mobile-property-summary]');
    const serviceSummary = form.querySelector('[data-mobile-service-summary]');
    const progressSteps = Array.from(form.querySelectorAll('[data-mobile-progress-step]'));

    if (!(propertyCard instanceof HTMLElement) || !(serviceCard instanceof HTMLElement)) return;

    const validateSection = (section) => {
      const requiredFields = Array.from(section.querySelectorAll('[required]'))
        .filter((field) => field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)
        .filter((field) => !field.disabled && !field.hidden && field.getClientRects().length > 0);
      const invalidField = requiredFields.find((field) => !field.checkValidity());
      if (!invalidField) return true;
      invalidField.reportValidity();
      invalidField.focus();
      return false;
    };

    const updateReview = () => {
      const firstName = toText(form.querySelector('#firstName')?.value);
      const suburb = toText(form.querySelector('#address')?.value);
      const propertyType = toText(form.querySelector('#propertyType')?.selectedOptions?.[0]?.textContent);
      if (propertySummary instanceof HTMLElement) {
        propertySummary.textContent = [firstName, propertyType, suburb].filter(Boolean).join(' - ') || 'Property details ready';
      }

      const pickerSummaries = Array.from(serviceCard.querySelectorAll('.scope-picker-summary'))
        .map((item) => toText(item.textContent))
        .filter(Boolean);
      if (serviceSummary instanceof HTMLElement) {
        serviceSummary.textContent = pickerSummaries.join(' - ') || 'Service details ready';
      }
    };

    const showStep = (step) => {
      const safeStep = Math.min(3, Math.max(1, Number(step) || 1));
      form.dataset.mobileStep = String(safeStep);
      progressSteps.forEach((item) => {
        const active = item.dataset.mobileProgressStep === String(safeStep);
        item.classList.toggle('is-active', active);
        if (active) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      if (safeStep === 3) updateReview();
      if (window.matchMedia('(max-width: 760px)').matches) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    form.querySelectorAll('[data-mobile-quote-next]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextStep = Number(button.dataset.mobileQuoteNext);
        const currentStep = Number(form.dataset.mobileStep || 1);
        const currentSection = currentStep === 1 ? propertyCard : serviceCard;
        if (!validateSection(currentSection)) return;
        showStep(nextStep);
      });
    });

    form.querySelectorAll('[data-mobile-quote-back], [data-mobile-quote-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        showStep(button.dataset.mobileQuoteBack || button.dataset.mobileQuoteEdit);
      });
    });

    showStep(1);
  }

  function setupQuoteForm() {
    const form = document.getElementById('quoteForm');
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    hideEstimatePreview();
    setupImproveDescriptionButton(form);
    setupSmartEstimatePreview(form);
    setupScopeQuantityFields(form);
    setupMobileQuoteSteps(form);

    const notesCard = form.querySelector('.quote-notes-card');
    const notesToggle = form.querySelector('[data-mobile-notes-toggle]');
    if (notesCard instanceof HTMLElement && notesToggle instanceof HTMLButtonElement) {
      notesToggle.addEventListener('click', () => {
        const isOpen = notesCard.classList.toggle('is-open');
        notesToggle.setAttribute('aria-expanded', String(isOpen));
        notesToggle.textContent = isOpen ? 'Hide details' : 'Add details';
      });
    }

    const photoInput = form.querySelector('#photoUpload');
    if (photoInput instanceof HTMLInputElement) {
      photoInput.addEventListener('change', () => {
        if (!photoInput.files || !photoInput.files.length) {
          updateUploadNote('Optional: upload up to 5 photos (max 4MB each).');
          return;
        }
        const count = Math.min(photoInput.files.length, MAX_UPLOAD_FILES);
        updateUploadNote(`${count} photo${count > 1 ? 's' : ''} selected.`, 'success');
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const button = form.querySelector('button[type="submit"]');

      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        setButtonLabel(button, 'Preparing quote...');
      }

      setFormMessage('Reviewing your details and preparing a quote range...', 'info');

      try {
        const payload = await buildPayload(form);
        if (payload.uploadWarnings.length) {
          updateUploadNote(payload.uploadWarnings.join(' '), 'error');
        }
        trackEvent('quote_submit_attempt', {
          service: payload.service || 'unknown',
          property_type: payload.propertyType || 'unknown',
          has_subscription_package: Boolean(payload.subscriptionPackage),
        });

        const localResult = buildLocalResult(payload);

        const response = await fetchWithTimeout(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(String(result.error || 'Unable to process your request right now.'));
        }

        const mergedResult = normalizeApiResult(result, localResult);
        renderQuoteResult(mergedResult);
        const emailDelivery = String(result?.deliveryStatus?.email || '');
        const emailSent = emailDelivery.startsWith('Sent to ');
        setFormMessage(
          emailSent
            ? 'Your quote request has been sent to the T & A team. We will contact you to confirm the final scope.'
            : 'Your quote request was saved, but email delivery is delayed. Please call 0466 224 927 or email tandaprocleaning@gmail.com if your job is urgent.',
          emailSent ? 'success' : 'error',
        );
        trackEvent('quote_submit_success', {
          event_category: 'quote',
          event_label: 'api_success',
        });
        bumpGiveawayCounterIfEligible(mergedResult.eligibleForGiveaway);
        await loadStats();
      } catch (error) {
        const fallbackPayload = buildBasePayload(form);
        const fallbackResult = buildLocalResult(fallbackPayload);
        renderQuoteResult(fallbackResult);
        bumpGiveawayCounterIfEligible(fallbackResult.eligibleForGiveaway);

        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        const message = timedOut
          ? 'The connection took too long, so the form stopped waiting. Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com so we can confirm your request.'
          : error instanceof Error
            ? `${error.message} Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com if you do not receive a response.`
            : 'We could not send the request automatically. Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com.';
        setFormMessage(message, 'error');
        trackEvent('quote_submit_fallback', {
          event_category: 'quote',
          event_label: 'fallback_used',
        });
      } finally {
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          setButtonLabel(button, 'Get a Free Quote');
        }
      }
    });
  }

  function buildImprovedDescription(payload) {
    const lines = [];
    lines.push('Customer requested a free quote estimate.');
    lines.push(`Primary scope: ${payload.service} for a ${payload.propertyType} property with ${payload.serviceArea.toLowerCase()} coverage.`);
    lines.push(`Site profile: ${payload.storeys} storey, ${payload.rooms} rooms, ${payload.accessDifficulty.toLowerCase()} access, ${payload.conditionLevel.toLowerCase()} condition.`);

    if (Number(payload.scopeQuantity || 0) > 0 && payload.scopeUnit) {
      lines.push(`Measured scope supplied: approximately ${Number(payload.scopeQuantity)} ${formatScopeUnit(payload.scopeUnit, Number(payload.scopeQuantity))}.`);
    }

    const scopeDetailRule = getScopeDetailRule(payload);
    if (scopeDetailRule) {
      lines.push(`Surface or scope detail: ${scopeDetailRule.label}.`);
    }

    if (payload.addons.length) {
      lines.push(`Requested add-ons include ${toSentenceList(payload.addons)}.`);
    }
    if (payload.lastCleaned) {
      lines.push(`Last cleaned: ${payload.lastCleaned.toLowerCase()}.`);
    }
    if (payload.preferredDate || payload.preferredTime) {
      lines.push(`Preferred booking window: ${payload.preferredDate || 'next available date'} (${payload.preferredTime || 'flexible time window'}).`);
    }
    if (payload.discountEligibility && normalize(payload.discountEligibility) !== 'none') {
      lines.push(`Discount eligibility submitted: ${payload.discountEligibility}.`);
    }
    if (payload.notes) {
      lines.push(`Customer notes retained: ${payload.notes.replace(/\s+/g, ' ').trim()}.`);
    }

    return lines.join(' ');
  }

  function setupImproveDescriptionButton(form) {
    const button = document.getElementById('improveDescriptionBtn');
    const notesField = form.querySelector('textarea[name="notes"]');
    if (!(button instanceof HTMLButtonElement) || !(notesField instanceof HTMLTextAreaElement)) {
      return;
    }

    button.addEventListener('click', () => {
      const payload = buildBasePayload(form);
      if (!payload.service || !payload.propertyType || !payload.storeys || !payload.rooms || !payload.serviceArea) {
        setFormMessage('Please choose service, property type, stories, rooms and service area first.', 'error');
        return;
      }

      notesField.value = buildImprovedDescription(payload);
      notesField.dispatchEvent(new Event('input', { bubbles: true }));
      trackEvent('ai_notes_improved', {
        service: payload.service || 'unknown',
        property_type: payload.propertyType || 'unknown',
      });
      setFormMessage('Description improved and added to notes.', 'success');
    });
  }

  const REALISTIC_ESTIMATE_CONFIG = {
    gstRate: 0.1,
    minimumExGst: 90,
    marketCalibrationVersion: 'SEQ-2026-07',
    giveawayThresholdMinExGst: GIVEAWAY_CONFIG.minimumEligibleJobValueExGst,
    vagueNotesPattern: /^(na|n\/a|none|no|nil|same|ok|need cleaning)$/i,
    discountRates: {
      none: 0,
      pensioner: 0.05,
      disability: 0.05,
      military: 0.05,
      subcontractor: 0.1,
    },
    windowRangesExGst: {
      single: {
        compact: { interior: { min: 150, max: 240 }, exterior: { min: 160, max: 260 }, both: { min: 220, max: 330 }, bothTracks: { min: 290, max: 420 } },
        small: { interior: { min: 160, max: 260 }, exterior: { min: 180, max: 290 }, both: { min: 230, max: 350 }, bothTracks: { min: 300, max: 430 } },
        standard: { interior: { min: 220, max: 330 }, exterior: { min: 250, max: 380 }, both: { min: 300, max: 440 }, bothTracks: { min: 380, max: 560 } },
        large: { interior: { min: 320, max: 480 }, exterior: { min: 380, max: 580 }, both: { min: 460, max: 700 }, bothTracks: { min: 580, max: 900 } },
        xl: { interior: { min: 450, max: 700 }, exterior: { min: 550, max: 900 }, both: { min: 700, max: 1150 }, bothTracks: { min: 850, max: 1450 } },
        unknown: { interior: { min: 180, max: 300 }, exterior: { min: 220, max: 350 }, both: { min: 260, max: 400 }, bothTracks: { min: 330, max: 520 } },
      },
      double: {
        compact: { interior: { min: 240, max: 380 }, exterior: { min: 320, max: 500 }, both: { min: 400, max: 600 }, bothTracks: { min: 520, max: 760 } },
        small: { interior: { min: 250, max: 400 }, exterior: { min: 330, max: 520 }, both: { min: 410, max: 620 }, bothTracks: { min: 530, max: 780 } },
        standard: { interior: { min: 320, max: 500 }, exterior: { min: 420, max: 650 }, both: { min: 500, max: 750 }, bothTracks: { min: 640, max: 950 } },
        large: { interior: { min: 420, max: 650 }, exterior: { min: 560, max: 850 }, both: { min: 700, max: 1100 }, bothTracks: { min: 850, max: 1350 } },
        xl: { interior: { min: 580, max: 900 }, exterior: { min: 760, max: 1200 }, both: { min: 980, max: 1650 }, bothTracks: { min: 1200, max: 2100 } },
        unknown: { interior: { min: 280, max: 450 }, exterior: { min: 390, max: 600 }, both: { min: 470, max: 700 }, bothTracks: { min: 580, max: 880 } },
      },
      high: {
        interior: { min: 320, max: 520 },
        exterior: { min: 440, max: 760 },
        both: { min: 520, max: 850 },
        bothTracks: { min: 650, max: 1050 },
      },
    },
    serviceRangesExGst: {
      'Pressure Washing': {
        compact: { min: 150, max: 250 },
        small: { min: 250, max: 450 },
        standard: { min: 450, max: 750 },
        large: { min: 750, max: 1400 },
        xl: { min: 1000, max: 1800 },
        unknown: { min: 250, max: 500 },
      },
      'Driveway Cleaning': {
        compact: { min: 150, max: 250 },
        small: { min: 250, max: 450 },
        standard: { min: 450, max: 750 },
        large: { min: 750, max: 1400 },
        xl: { min: 1000, max: 1800 },
        unknown: { min: 250, max: 500 },
      },
      'Soft Washing': {
        compact: { min: 350, max: 550 },
        small: { min: 500, max: 750 },
        standard: { min: 750, max: 1200 },
        large: { min: 1200, max: 2000 },
        xl: { min: 1500, max: 2600 },
        unknown: { min: 500, max: 900 },
      },
      'Gutter Cleaning': {
        compact: { min: 165, max: 260 },
        small: { min: 220, max: 380 },
        standard: { min: 350, max: 650 },
        large: { min: 650, max: 1050 },
        xl: { min: 850, max: 1450 },
        unknown: { min: 220, max: 450 },
      },
      'Solar Panel Cleaning': {
        compact: { min: 150, max: 220 },
        small: { min: 190, max: 300 },
        standard: { min: 280, max: 450 },
        large: { min: 450, max: 750 },
        xl: { min: 600, max: 1000 },
        unknown: { min: 180, max: 360 },
      },
      'Carpet Cleaning': {
        compact: { min: 100, max: 180 },
        small: { min: 135, max: 260 },
        standard: { min: 220, max: 400 },
        large: { min: 320, max: 600 },
        xl: { min: 450, max: 850 },
        unknown: { min: 120, max: 250 },
      },
      'Roof Cleaning': {
        compact: { min: 450, max: 800 },
        small: { min: 650, max: 1200 },
        standard: { min: 1000, max: 2000 },
        large: { min: 1600, max: 3000 },
        xl: { min: 2400, max: 4500 },
        unknown: { min: 650, max: 1500 },
      },
      'Tile & Grout Cleaning': {
        compact: { min: 220, max: 420 },
        small: { min: 350, max: 650 },
        standard: { min: 550, max: 950 },
        large: { min: 850, max: 1500 },
        xl: { min: 1300, max: 2200 },
        unknown: { min: 350, max: 800 },
      },
      'Upholstery Cleaning': {
        compact: { min: 120, max: 200 },
        small: { min: 180, max: 280 },
        standard: { min: 260, max: 380 },
        large: { min: 360, max: 560 },
        xl: { min: 500, max: 800 },
        unknown: { min: 160, max: 340 },
      },
      'Bin Cleaning': {
        compact: { min: 80, max: 120 },
        small: { min: 100, max: 150 },
        standard: { min: 140, max: 210 },
        large: { min: 200, max: 300 },
        xl: { min: 280, max: 420 },
        unknown: { min: 90, max: 180 },
      },
    },
    manualRangesExGst: {
      compact: { min: 600, max: 1200 },
      small: { min: 800, max: 1800 },
      standard: { min: 1200, max: 2800 },
      large: { min: 2000, max: 4500 },
      xl: { min: 3500, max: 7000 },
      unknown: { min: 900, max: 2500 },
    },
    addonExGst: {
      'gutter cleaning': { min: 110, max: 210, reason: 'Gutter cleaning add-on selected' },
      'solar panel cleaning': { min: 130, max: 250, reason: 'Solar panel cleaning add-on selected' },
      'tile & grout cleaning': { min: 250, max: 500, reason: 'Tile and grout add-on selected' },
      'bin cleaning': { min: 60, max: 100, reason: 'Bin cleaning add-on selected' },
      'upholstery cleaning': { min: 120, max: 230, reason: 'Upholstery cleaning add-on selected' },
    },
    quantityRatesExGst: {
      'Window Cleaning': { unit: 'panes', minimum: 160, rates: { interior: 6.25, exterior: 6.75, both: 10.5 }, tracksScreensPerUnit: 3.25, storyMultipliers: { double: 1.18, high: 1.35 } },
      'Pressure Washing': { unit: 'square-metres', minimum: 150, rate: 4.5 },
      'Driveway Cleaning': { unit: 'square-metres', minimum: 150, rate: 4.5 },
      'Soft Washing': { unit: 'square-metres', minimum: 325, rate: 4.5, storyMultipliers: { double: 1.08, high: 1.18 } },
      'Roof Cleaning': { unit: 'square-metres', minimum: 450, rate: 5.5, storyMultipliers: { double: 1.12, high: 1.25 } },
      'Gutter Cleaning': { unit: 'linear-metres', minimum: 165, rate: 8.5, storyMultipliers: { double: 1.15, high: 1.3 } },
      'Solar Panel Cleaning': { unit: 'solar-panels', minimum: 150, rate: 12.5, storyMultipliers: { double: 1.12, high: 1.25 } },
      'Carpet Cleaning': { unit: 'carpeted-rooms', minimum: 100, rate: 45 },
      'Tile & Grout Cleaning': { unit: 'square-metres', minimum: 220, rate: 28 },
      'Upholstery Cleaning': { unit: 'upholstery-seats', minimum: 120, rate: 40 },
      'Bin Cleaning': { unit: 'bins', minimum: 80, rate: 40 },
    },
    scopeDetailRules: {
      'standard-glass': { multiplier: 1, label: 'Standard glass' },
      'divided-small-panes': { multiplier: 1.18, label: 'Many small or divided panes' },
      'hard-water-staining': { multiplier: 1.3, label: 'Hard-water or mineral staining' },
      'plain-concrete': { multiplier: 1, label: 'Plain concrete' },
      'exposed-aggregate': { multiplier: 1.2, label: 'Exposed aggregate' },
      'pavers-cobblestone': { multiplier: 1.4, label: 'Pavers or cobblestone' },
      'painted-render': { multiplier: 1, label: 'Painted render or cladding' },
      'brick-masonry': { multiplier: 1.1, label: 'Brick or masonry' },
      'heavy-organic-growth': { multiplier: 1.25, label: 'Heavy mould or organic growth' },
      'metal-roof': { multiplier: 0.9, label: 'Metal roof' },
      'concrete-tiles': { multiplier: 1, label: 'Concrete roof tiles' },
      'terracotta-tiles': { multiplier: 1.15, label: 'Terracotta roof tiles' },
      'light-debris': { multiplier: 0.9, label: 'Light gutter debris' },
      'standard-debris': { multiplier: 1, label: 'Standard gutter debris' },
      'heavy-debris': { multiplier: 1.3, label: 'Heavy or compacted gutter debris' },
      'standard-soiling': { multiplier: 1, label: 'Standard panel soiling' },
      'heavy-bird-soiling': { multiplier: 1.2, label: 'Heavy bird or organic soiling' },
      'standard-bedroom': { multiplier: 1, label: 'Standard bedroom-sized rooms' },
      'large-room': { multiplier: 1.3, label: 'Large rooms or living areas' },
      'stairs-hallways': { multiplier: 1.4, label: 'Stairs or hallways' },
      'standard-ceramic': { multiplier: 1, label: 'Standard ceramic or porcelain tile' },
      'heavy-grout': { multiplier: 1.2, label: 'Heavy grout staining' },
      'natural-stone': { multiplier: 1.35, label: 'Natural stone or specialist surface' },
      'standard-fabric': { multiplier: 1, label: 'Standard upholstery fabric' },
      'delicate-light-fabric': { multiplier: 1.2, label: 'Delicate or light-coloured fabric' },
      'leather-specialist': { multiplier: 1.25, label: 'Leather or specialist material' },
      'standard-bin': { multiplier: 1, label: 'Standard bin condition' },
      'heavy-bin-soiling': { multiplier: 1.25, label: 'Heavy bin soiling' },
    },
  };

  function resolveServiceProfile(service) {
    const normalizedService = normalize(service);
    const aliases = [
      { match: 'window', canonicalService: 'Window Cleaning', isWindowService: true },
      { match: 'builder', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'construction', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'strata', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'body corporate', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'commercial', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'gym', canonicalService: 'Builder Clean', isBuilderClean: true },
      { match: 'driveway', canonicalService: 'Driveway Cleaning' },
      { match: 'pressure', canonicalService: 'Pressure Washing' },
      { match: 'soft', canonicalService: 'Soft Washing' },
      { match: 'house wash', canonicalService: 'Soft Washing' },
      { match: 'roof', canonicalService: 'Roof Cleaning' },
      { match: 'gutter', canonicalService: 'Gutter Cleaning' },
      { match: 'solar', canonicalService: 'Solar Panel Cleaning' },
      { match: 'carpet', canonicalService: 'Carpet Cleaning' },
      { match: 'tile', canonicalService: 'Tile & Grout Cleaning' },
      { match: 'grout', canonicalService: 'Tile & Grout Cleaning' },
      { match: 'upholstery', canonicalService: 'Upholstery Cleaning' },
      { match: 'bin', canonicalService: 'Bin Cleaning' },
    ];

    const match = aliases.find((entry) => normalizedService.includes(entry.match));
    return {
      canonicalService: match ? match.canonicalService : 'Window Cleaning',
      isWindowService: Boolean(match && match.isWindowService),
      isBuilderClean: Boolean(match && match.isBuilderClean),
    };
  }

  function mapRoomsToPricingSizeTier(rooms) {
    const key = normalize(rooms);
    if (!key) return 'unknown';
    if (key === '1-2') return 'compact';
    if (key === '3-4') return 'small';
    if (key === '5-6') return 'standard';
    if (key === '7+') return 'large';
    return 'unknown';
  }

  function hasTracksScreens(addons) {
    return addons.some((addon) => {
      const key = normalize(addon);
      return key.includes('track') || key.includes('screen');
    });
  }

  function isManualScope(serviceProfile, normalizedLead, rawService) {
    const serviceKey = normalize(rawService);
    return Boolean(
      serviceProfile.isBuilderClean ||
        normalizedLead.propertyType === 'commercial' ||
        normalizedLead.propertyType === 'strata' ||
        normalizedLead.propertyType === 'building' ||
        serviceKey.includes('gym') ||
        serviceKey.includes('construction')
    );
  }

  function getWindowScopeKey(normalizedLead, tracksScreensSelected) {
    if (normalizedLead.serviceArea === 'both') {
      return tracksScreensSelected ? 'bothTracks' : 'both';
    }
    if (normalizedLead.serviceArea === 'exterior') {
      return 'exterior';
    }
    return 'interior';
  }

  function getWindowRange(normalizedLead, tracksScreensSelected) {
    const storeyGroup = normalizedLead.stories === 'building' || normalizedLead.stories === '3'
      ? 'high'
      : normalizedLead.stories === '2'
        ? 'double'
        : 'single';
    const scopeKey = getWindowScopeKey(normalizedLead, tracksScreensSelected);

    if (storeyGroup === 'high') {
      return REALISTIC_ESTIMATE_CONFIG.windowRangesExGst.high[scopeKey] || REALISTIC_ESTIMATE_CONFIG.windowRangesExGst.high.both;
    }

    const group = REALISTIC_ESTIMATE_CONFIG.windowRangesExGst[storeyGroup] || REALISTIC_ESTIMATE_CONFIG.windowRangesExGst.single;
    const sizeTable = group[normalizedLead.sizeTier] || group.unknown;
    return sizeTable[scopeKey] || sizeTable.both;
  }

  function getServiceRange(serviceProfile, normalizedLead) {
    const table = REALISTIC_ESTIMATE_CONFIG.serviceRangesExGst[serviceProfile.canonicalService] || REALISTIC_ESTIMATE_CONFIG.serviceRangesExGst['Pressure Washing'];
    let sizeTier = normalizedLead.sizeTier;

    if (serviceProfile.canonicalService === 'Soft Washing' && normalizedLead.stories === '2' && (sizeTier === 'compact' || sizeTier === 'small')) {
      sizeTier = 'standard';
    }
    if (serviceProfile.canonicalService === 'Gutter Cleaning' && normalizedLead.stories === '2') {
      sizeTier = sizeTier === 'compact' ? 'standard' : 'large';
    }
    if (serviceProfile.canonicalService === 'Roof Cleaning' && normalizedLead.stories === '2') {
      sizeTier = 'standard';
    }
    if (serviceProfile.canonicalService === 'Solar Panel Cleaning' && (normalizedLead.access === 'difficult' || normalizedLead.propertyType === 'commercial')) {
      sizeTier = sizeTier === 'compact' ? 'small' : 'large';
    }

    return table[sizeTier] || table.unknown || table.small;
  }

  function cloneRange(range) {
    return {
      min: Number(range && range.min ? range.min : REALISTIC_ESTIMATE_CONFIG.minimumExGst),
      max: Number(range && range.max ? range.max : Number(range && range.min ? range.min : REALISTIC_ESTIMATE_CONFIG.minimumExGst) + 100),
    };
  }

  function applyMultiplier(range, minRate, maxRate) {
    range.min *= 1 + minRate;
    range.max *= 1 + maxRate;
  }

  function addRange(range, addonRange) {
    range.min += Number(addonRange.min || 0);
    range.max += Number(addonRange.max || 0);
  }

  function buildBaseReasons(serviceProfile, normalizedLead, tracksScreensSelected) {
    const reasons = [`${serviceProfile.canonicalService} baseline`];

    if (normalizedLead.propertyType === 'residential' && normalizedLead.stories === '1' && normalizedLead.sizeTier === 'small') {
      reasons.push('Small single-storey residential property');
    } else if (normalizedLead.sizeTier === 'compact') {
      reasons.push('Small/below-standard property profile');
    } else if (normalizedLead.sizeTier === 'standard') {
      reasons.push('Standard residential property size');
    } else if (normalizedLead.sizeTier === 'large' || normalizedLead.sizeTier === 'xl') {
      reasons.push('Large property scope');
    } else {
      reasons.push('Property size not fully confirmed');
    }

    if (normalizedLead.stories === '2') reasons.push('Double-storey access profile');
    if (normalizedLead.stories === '3' || normalizedLead.stories === 'building') reasons.push('Height/access requires review');
    if (normalizedLead.serviceArea === 'both') reasons.push('Interior + exterior coverage');
    if (normalizedLead.serviceArea === 'interior') reasons.push('Interior-only coverage');
    if (normalizedLead.serviceArea === 'exterior') reasons.push('Exterior-only coverage');
    if (normalizedLead.access === 'standard') reasons.push('Standard access');
    if (normalizedLead.access === 'easy') reasons.push('Easy access');
    if (normalizedLead.access === 'difficult') reasons.push('Difficult access loading applied');
    if (normalizedLead.access === 'unknown') reasons.push('Access details not fully confirmed');
    if (normalizedLead.condition === 'standard') reasons.push('Standard condition');
    if (normalizedLead.condition === 'light') reasons.push('Light condition');
    if (normalizedLead.condition === 'heavy') reasons.push('Heavy condition loading applied');
    if (normalizedLead.condition === 'unknown') reasons.push('Condition details not fully confirmed');
    if (tracksScreensSelected) reasons.push('Tracks/screens selected');

    return reasons;
  }

  function applyRiskModifiers(range, normalizedLead, serviceProfile, lead, reasons) {
    if (normalizedLead.condition === 'heavy') {
      applyMultiplier(range, 0.18, 0.35);
    }
    if (normalizedLead.access === 'difficult') {
      applyMultiplier(range, 0.12, 0.28);
    }
    if (isFirstClean(lead.lastCleaned)) {
      applyMultiplier(range, 0.08, 0.18);
      reasons.push('First clean or long gap since last service');
    }
    if (!serviceProfile.isWindowService && normalizedLead.sizeTier === 'large' && normalizedLead.condition !== 'heavy' && normalizedLead.access !== 'difficult') {
      reasons.push('Large scope selected without heavy-condition or difficult-access loading');
    }
  }

  function applyAddons(range, addons, serviceProfile, reasons) {
    addons.forEach((addon) => {
      const key = normalize(addon);
      if (serviceProfile.isWindowService && (key.includes('track') || key.includes('screen'))) {
        return;
      }
      const rule = REALISTIC_ESTIMATE_CONFIG.addonExGst[key] || { min: 45, max: 100, reason: `${toText(addon)} add-on selected` };
      addRange(range, rule);
      if (rule.reason) reasons.push(rule.reason);
    });
  }

  function applyPricingDiscount(range, lead, reasons) {
    const discountKey = normalizeDiscount(lead.discountEligibility);
    const discountRate = Number(REALISTIC_ESTIMATE_CONFIG.discountRates[discountKey] || 0);
    if (discountRate <= 0) return;
    range.min *= 1 - discountRate;
    range.max *= 1 - discountRate;
    reasons.push(`${toTitleCase(discountKey)} discount applied`);
  }

  function normalizePricingRange(range) {
    const estimateMin = roundToNearestFive(Math.max(REALISTIC_ESTIMATE_CONFIG.minimumExGst, range.min));
    const estimateMax = roundToNearestFive(Math.max(estimateMin + 50, range.max));
    return {
      estimateMin,
      estimateMax,
      estimateMinIncGst: roundToNearestFive(estimateMin * (1 + REALISTIC_ESTIMATE_CONFIG.gstRate)),
      estimateMaxIncGst: roundToNearestFive(estimateMax * (1 + REALISTIC_ESTIMATE_CONFIG.gstRate)),
    };
  }

  function formatScopeUnit(unit, quantity) {
    const labels = {
      panes: 'window panes',
      'square-metres': 'square metres',
      'solar-panels': 'solar panels',
      'carpeted-rooms': 'carpeted rooms',
      'upholstery-seats': 'upholstery seats',
      'linear-metres': 'linear metres of gutter',
      bins: quantity === 1 ? 'bin' : 'bins',
    };
    return labels[normalize(unit)] || 'measured units';
  }

  function getScopeDetailRule(lead) {
    return REALISTIC_ESTIMATE_CONFIG.scopeDetailRules[normalize(lead.scopeDetail)] || null;
  }

  function applyScopeDetailMultiplier(range, lead, reasons) {
    const rule = getScopeDetailRule(lead);
    if (!rule) return;
    const multiplier = Number(rule.multiplier || 1);
    range.min *= multiplier;
    range.max *= multiplier;
    reasons.push(`${rule.label} selected`);
  }

  function getQuantityEstimateExGst(lead, serviceProfile, normalizedLead, addons) {
    const quantity = Number(lead.scopeQuantity || 0);
    const unit = normalize(lead.scopeUnit);
    const profile = REALISTIC_ESTIMATE_CONFIG.quantityRatesExGst[serviceProfile.canonicalService];

    if (!profile || !Number.isFinite(quantity) || quantity <= 0 || unit !== profile.unit) {
      return null;
    }

    const areaRate = profile.rates ? Number(profile.rates[normalizedLead.serviceArea] || profile.rates.both) : Number(profile.rate || 0);
    let estimate = Math.max(Number(profile.minimum || REALISTIC_ESTIMATE_CONFIG.minimumExGst), quantity * areaRate);

    if (serviceProfile.isWindowService && hasTracksScreens(addons)) {
      estimate += quantity * Number(profile.tracksScreensPerUnit || 0);
    }

    const storyMultipliers = profile.storyMultipliers || {};
    if (normalizedLead.stories === '2') estimate *= Number(storyMultipliers.double || 1);
    if (normalizedLead.stories === '3' || normalizedLead.stories === 'building') estimate *= Number(storyMultipliers.high || 1);
    const detailRule = getScopeDetailRule(lead);
    if (detailRule) estimate *= Number(detailRule.multiplier || 1);
    if (normalizedLead.access === 'difficult') estimate *= 1.15;
    if (normalizedLead.access === 'easy') estimate *= 0.97;
    if (normalizedLead.condition === 'heavy') estimate *= 1.2;
    if (normalizedLead.condition === 'light') estimate *= 0.95;
    if (isFirstClean(lead.lastCleaned)) estimate *= 1.1;

    addons.forEach((addon) => {
      const key = normalize(addon);
      if (serviceProfile.isWindowService && (key.includes('track') || key.includes('screen'))) return;
      const rule = REALISTIC_ESTIMATE_CONFIG.addonExGst[key];
      if (rule) estimate += (Number(rule.min || 0) + Number(rule.max || 0)) / 2;
    });

    estimate = Math.max(Number(profile.minimum || REALISTIC_ESTIMATE_CONFIG.minimumExGst), estimate);
    const discountRate = Number(REALISTIC_ESTIMATE_CONFIG.discountRates[normalizeDiscount(lead.discountEligibility)] || 0);
    estimate *= 1 - discountRate;
    return roundToNearestFive(Math.max(REALISTIC_ESTIMATE_CONFIG.minimumExGst, estimate));
  }

  function calculateRecommendedPricing(normalizedRange, lead, normalizedLead, serviceProfile, addons, accuracyLevel, manualScope) {
    const quantityEstimate = getQuantityEstimateExGst(lead, serviceProfile, normalizedLead, addons);
    let recommendedEstimate;
    let pricingMethod;
    let internalRange = { ...normalizedRange };

    if (Number.isFinite(quantityEstimate)) {
      recommendedEstimate = quantityEstimate;
      pricingMethod = 'Measured quantity';
      const spread = accuracyLevel === 'High' ? 0.08 : accuracyLevel === 'Low' ? 0.18 : 0.12;
      internalRange = normalizePricingRange({
        min: recommendedEstimate * (1 - spread),
        max: recommendedEstimate * (1 + spread),
      });
    } else {
      let position = manualScope ? 0.5 : 0.38;
      if (normalizedLead.condition === 'heavy') position += 0.08;
      if (normalizedLead.access === 'difficult') position += 0.06;
      if (isFirstClean(lead.lastCleaned)) position += 0.04;
      if (normalizedLead.condition === 'light') position -= 0.04;
      if (normalizedLead.access === 'easy') position -= 0.03;
      position = Math.min(0.72, Math.max(0.28, position));
      recommendedEstimate = roundToNearestFive(
        normalizedRange.estimateMin + (normalizedRange.estimateMax - normalizedRange.estimateMin) * position
      );
      pricingMethod = manualScope ? 'Structured scope midpoint' : 'Competitive structured estimate';
    }

    const recommendedEstimateIncGst = roundToNearestFive(recommendedEstimate * (1 + REALISTIC_ESTIMATE_CONFIG.gstRate));
    return {
      ...internalRange,
      recommendedEstimate,
      recommendedEstimateIncGst,
      recommendedEstimateLabel: `${toCurrency(recommendedEstimateIncGst)} incl. GST`,
      internalEstimateLabel: formatMoneyRange(internalRange.estimateMinIncGst, internalRange.estimateMaxIncGst),
      pricingMethod,
    };
  }

  function hasEstimatePhotos(lead) {
    if (Number(lead.photoUploadCount || 0) > 0) return true;
    return Array.isArray(lead.photoUploads) && lead.photoUploads.length > 0;
  }

  function isPricingInformativeNotes(notes) {
    const text = toText(notes);
    if (!text || REALISTIC_ESTIMATE_CONFIG.vagueNotesPattern.test(text.toLowerCase())) return false;
    return text.length >= 30 && text.split(/\s+/).filter(Boolean).length >= 5;
  }

  function hasDetailedMeasurement(notes) {
    return /\b\d+\s*(windows?|panels?|glass|doors?|sqm|m2|square|rooms?)\b/.test(normalize(notes));
  }

  function calculateAccuracy(lead, normalizedLead) {
    const coreValues = [lead.service, lead.propertyType, lead.storeys, lead.rooms, lead.serviceArea, lead.accessDifficulty, lead.conditionLevel];
    const completedCore = coreValues.filter((value) => toText(value)).length;
    const missingImportant =
      completedCore < 6 ||
      normalizedLead.sizeTier === 'unknown' ||
      normalizedLead.access === 'unknown' ||
      normalizedLead.condition === 'unknown' ||
      normalizedLead.stories === 'unknown';

    if (missingImportant) return 'Low';
    const hasStructuredQuantity = Number(lead.scopeQuantity || 0) > 0 && Boolean(toText(lead.scopeUnit));
    if (hasStructuredQuantity && (hasEstimatePhotos(lead) || isPricingInformativeNotes(lead.notes))) return 'High';
    if (hasEstimatePhotos(lead) && isPricingInformativeNotes(lead.notes) && hasDetailedMeasurement(lead.notes)) return 'High';
    return 'Medium';
  }

  function calculateJobType(normalizedLead, manualScope) {
    if (manualScope || normalizedLead.propertyType === 'strata' || normalizedLead.propertyType === 'building') {
      return 'Large Scope';
    }

    if (normalizedLead.access === 'difficult' || normalizedLead.stories === '3') {
      return 'Premium Standard';
    }

    if (normalizedLead.propertyType === 'commercial' || normalizedLead.sizeTier === 'large' || normalizedLead.sizeTier === 'xl') {
      return 'Large Scope';
    }

    return 'Standard';
  }

  function getNormalizedPricingLead(lead) {
    return {
      propertyType: normalizePropertyType(lead.propertyType),
      stories: normalizeStories(lead.storeys),
      sizeTier: mapRoomsToPricingSizeTier(lead.rooms),
      serviceArea: normalizeServiceArea(lead.serviceArea),
      access: normalizeAccess(lead.accessDifficulty),
      condition: normalizeCondition(lead.conditionLevel),
    };
  }

  function estimateLeadSmart(lead) {
    if (window.TAPricing && typeof window.TAPricing.calculateEstimate === 'function') {
      return window.TAPricing.calculateEstimate(lead);
    }
    const service = toText(lead.service);
    const addons = normalizeAddons(lead.addons);
    const serviceProfile = resolveServiceProfile(service);
    const normalizedLead = getNormalizedPricingLead(lead);
    const tracksScreensSelected = hasTracksScreens(addons);
    const manualScope = isManualScope(serviceProfile, normalizedLead, service);
    let range;

    if (manualScope) {
      range = cloneRange(REALISTIC_ESTIMATE_CONFIG.manualRangesExGst[normalizedLead.sizeTier] || REALISTIC_ESTIMATE_CONFIG.manualRangesExGst.unknown);
    } else if (serviceProfile.isWindowService) {
      range = cloneRange(getWindowRange(normalizedLead, tracksScreensSelected));
    } else {
      range = cloneRange(getServiceRange(serviceProfile, normalizedLead));
    }

    const reasons = buildBaseReasons(serviceProfile, normalizedLead, tracksScreensSelected);

    if (manualScope) {
      reasons.push('Manual inspection recommended before final pricing');
      reasons.push('Photos, square metres, bathrooms, glass count and recurring/one-off scope should be confirmed');
    } else {
      applyRiskModifiers(range, normalizedLead, serviceProfile, lead, reasons);
      applyScopeDetailMultiplier(range, lead, reasons);
      applyAddons(range, addons, serviceProfile, reasons);
    }

    applyPricingDiscount(range, lead, reasons);
    const normalizedRange = normalizePricingRange(range);
    const accuracyLevel = manualScope && !hasEstimatePhotos(lead) ? 'Low' : calculateAccuracy(lead, normalizedLead);
    const recommendedPricing = calculateRecommendedPricing(
      normalizedRange,
      lead,
      normalizedLead,
      serviceProfile,
      addons,
      accuracyLevel,
      manualScope
    );
    const tailoredQuoteRecommended =
      manualScope ||
      normalizedLead.stories === 'building' ||
      normalizedLead.propertyType === 'building' ||
      normalizedLead.access === 'difficult' ||
      normalizedLead.condition === 'heavy' ||
      normalizedLead.sizeTier === 'xl';

    if (normalizedLead.propertyType === 'apartment') {
      reasons.push('Apartment jobs priced as interior and safely accessible balcony scope only');
    }

    if (normalizedLead.propertyType === 'apartment' && normalizedLead.stories === 'building') {
      reasons.push('High-rise apartments exclude rope access and suspended external work');
    }

    if (Number(lead.scopeQuantity || 0) > 0 && toText(lead.scopeUnit)) {
      reasons.unshift(`Customer supplied approximately ${Number(lead.scopeQuantity)} ${formatScopeUnit(lead.scopeUnit, Number(lead.scopeQuantity))}`);
    }
    const scopeDetailRule = getScopeDetailRule(lead);
    if (scopeDetailRule) reasons.unshift(`${scopeDetailRule.label} used for pricing`);
    reasons.unshift(`${recommendedPricing.pricingMethod} used for the displayed price`);

    return {
      ...recommendedPricing,
      estimateLabel: recommendedPricing.recommendedEstimateLabel,
      estimateReasons: uniqueReasons(reasons).slice(0, 9),
      estimatedJobType: calculateJobType(normalizedLead, manualScope),
      tailoredQuoteRecommended,
      estimateGuidance: tailoredQuoteRecommended
        ? 'Recommended estimate based on the details provided. Photos, access and final scope are reviewed before the price is confirmed.'
        : 'Recommended estimate based on the details provided. Your final price is confirmed before work starts.',
      accuracyLevel,
      eligibleForGiveaway: isGiveawayCampaignOpen() && recommendedPricing.recommendedEstimate >= REALISTIC_ESTIMATE_CONFIG.giveawayThresholdMinExGst,
    };
  }

  function serviceSummaryName(service) {
    const key = normalize(service);
    if (key.includes('window')) return 'window clean';
    if (key.includes('pressure') || key.includes('driveway')) return 'pressure cleaning job';
    if (key.includes('soft')) return 'house wash/soft wash';
    if (key.includes('gutter')) return 'gutter clean';
    if (key.includes('solar')) return 'solar panel clean';
    if (key.includes('carpet')) return 'carpet clean';
    if (key.includes('builder') || key.includes('commercial') || key.includes('gym')) return 'builder/detail clean';
    return `${toText(service).toLowerCase()} service`;
  }

  function sizeSummary(normalizedLead) {
    if (normalizedLead.sizeTier === 'compact') return 'small/below-standard';
    if (normalizedLead.sizeTier === 'small') return 'small';
    if (normalizedLead.sizeTier === 'standard') return 'standard';
    if (normalizedLead.sizeTier === 'large') return 'large';
    if (normalizedLead.sizeTier === 'xl') return 'extra-large';
    return 'scope-unconfirmed';
  }

  function storeySummary(normalizedLead) {
    if (normalizedLead.stories === '1') return 'single-storey';
    if (normalizedLead.stories === '2') return 'double-storey';
    if (normalizedLead.stories === '3') return 'three-storey';
    if (normalizedLead.stories === 'building') return 'building-height';
    return 'storey-unconfirmed';
  }

  function serviceAreaSummary(normalizedLead) {
    if (normalizedLead.serviceArea === 'both') return 'interior and exterior coverage';
    if (normalizedLead.serviceArea === 'exterior') return 'exterior coverage';
    if (normalizedLead.serviceArea === 'interior') return 'interior coverage';
    return 'coverage still to be confirmed';
  }

  function generateAISummary(lead, estimate) {
    if (window.TAPricing && typeof window.TAPricing.generateSummary === 'function') {
      return window.TAPricing.generateSummary(lead, estimate || window.TAPricing.calculateEstimate(lead));
    }
    const normalizedLead = getNormalizedPricingLead(lead);
    const addons = normalizeAddons(lead.addons);
    const addonText = addons.length ? `, and selected ${toSentenceList(addons)}` : '';
    const property = normalizedLead.propertyType === 'commercial'
      ? 'commercial'
      : normalizedLead.propertyType === 'apartment'
        ? 'apartment'
        : 'residential';

    const quantityText = Number(lead.scopeQuantity || 0) > 0 && toText(lead.scopeUnit)
      ? `, using approximately ${Number(lead.scopeQuantity)} ${formatScopeUnit(lead.scopeUnit, Number(lead.scopeQuantity))}`
      : '';
    const detailRule = getScopeDetailRule(lead);
    const detailText = detailRule ? `, with ${detailRule.label.toLowerCase()}` : '';
    return `This recommended estimate is based on a ${sizeSummary(normalizedLead)} ${storeySummary(normalizedLead)} ${property} ${serviceSummaryName(lead.service)} with ${serviceAreaSummary(normalizedLead)}, ${normalizedLead.access || 'unconfirmed'} access, ${normalizedLead.condition || 'unconfirmed'} condition${quantityText}${detailText}${addonText}. Final pricing may change after photos, exact counts, access, tracks/screens and condition are reviewed.`;
  }

  function normalizeApiResult(apiResult, fallbackResult) {
    const merged = {
      ...fallbackResult,
      ...(apiResult && typeof apiResult === 'object' ? apiResult : {}),
    };

    merged.estimateMin = Number.isFinite(Number(merged.estimateMin)) ? Number(merged.estimateMin) : fallbackResult.estimateMin;
    merged.estimateMax = Number.isFinite(Number(merged.estimateMax)) ? Number(merged.estimateMax) : fallbackResult.estimateMax;
    merged.estimateMinIncGst = Number.isFinite(Number(merged.estimateMinIncGst))
      ? Number(merged.estimateMinIncGst)
      : fallbackResult.estimateMinIncGst;
    merged.estimateMaxIncGst = Number.isFinite(Number(merged.estimateMaxIncGst))
      ? Number(merged.estimateMaxIncGst)
      : fallbackResult.estimateMaxIncGst;
    merged.recommendedEstimate = Number.isFinite(Number(merged.recommendedEstimate))
      ? Number(merged.recommendedEstimate)
      : fallbackResult.recommendedEstimate;
    merged.recommendedEstimateIncGst = Number.isFinite(Number(merged.recommendedEstimateIncGst))
      ? Number(merged.recommendedEstimateIncGst)
      : fallbackResult.recommendedEstimateIncGst;
    merged.recommendedEstimateLabel = toText(merged.recommendedEstimateLabel) || fallbackResult.recommendedEstimateLabel;
    merged.internalEstimateLabel = toText(merged.internalEstimateLabel) || fallbackResult.internalEstimateLabel;
    merged.pricingMethod = toText(merged.pricingMethod) || fallbackResult.pricingMethod;
    merged.estimateLabel = merged.recommendedEstimateLabel || fallbackResult.estimateLabel;
    merged.calculationBreakdown = merged.calculationBreakdown || fallbackResult.calculationBreakdown;
    merged.internalCalculation = merged.internalCalculation || fallbackResult.internalCalculation;
    merged.manualReviewRequired = typeof merged.manualReviewRequired === 'boolean'
      ? merged.manualReviewRequired
      : Boolean(fallbackResult.manualReviewRequired);
    merged.photoRequired = typeof merged.photoRequired === 'boolean'
      ? merged.photoRequired
      : Boolean(fallbackResult.photoRequired);

    if (!Array.isArray(merged.estimateReasons) || !merged.estimateReasons.length) {
      merged.estimateReasons = fallbackResult.estimateReasons;
    }

    merged.aiSummary = toText(merged.aiSummary) || fallbackResult.aiSummary;
    merged.leadQuality = toText(merged.leadQuality) || fallbackResult.leadQuality;
    merged.accuracyLevel = toText(merged.accuracyLevel) || fallbackResult.accuracyLevel;
    merged.estimatedJobType = toText(merged.estimatedJobType) || fallbackResult.estimatedJobType;
    merged.tailoredQuoteRecommended = typeof merged.tailoredQuoteRecommended === 'boolean'
      ? merged.tailoredQuoteRecommended
      : Boolean(fallbackResult.tailoredQuoteRecommended);
    merged.estimateGuidance = toText(merged.estimateGuidance) || fallbackResult.estimateGuidance;
    merged.eligibleForGiveaway = typeof merged.eligibleForGiveaway === 'boolean'
      ? merged.eligibleForGiveaway
      : Boolean(fallbackResult.eligibleForGiveaway);

    return merged;
  }

  function formatGiveawayCount(entryCount) {
    return String(Math.max(0, Number(entryCount || 0)));
  }

  function calculateGiveawayProgress(entryCount, entryTarget) {
    const safeTarget = Math.max(1, Number(entryTarget || GIVEAWAY_CONFIG.unlockEntryTarget));
    const safeCount = Math.max(0, Number(entryCount || 0));
    return Math.min(100, Math.round((safeCount / safeTarget) * 100));
  }

  function setupGiveawayCountdown() {
    const countdowns = document.querySelectorAll('[data-giveaway-countdown]');
    if (!countdowns.length) {
      return;
    }
    const startTimestamp = Date.parse(GIVEAWAY_CONFIG.startsAt);
    const endTimestamp = Date.parse(GIVEAWAY_CONFIG.endsAt);

    countdowns.forEach((countdown) => {
      if (!(countdown instanceof HTMLElement)) return;

      const live = countdown.querySelector('[data-countdown-live]');
      const pending = countdown.querySelector('[data-countdown-pending]');
      const dateLabel = countdown.querySelector('[data-countdown-date]');
      const title = countdown.querySelector('[data-countdown-title]');

      if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp >= endTimestamp) {
        countdown.dataset.state = 'unconfigured';
        if (live instanceof HTMLElement) live.hidden = true;
        if (pending instanceof HTMLElement) pending.hidden = false;
        return;
      }

      if (live instanceof HTMLElement) live.hidden = false;
      if (pending instanceof HTMLElement) pending.hidden = true;
      if (dateLabel instanceof HTMLElement) {
        dateLabel.textContent = `${formatGiveawayDate(startTimestamp)} - ${formatGiveawayDate(endTimestamp)}`;
      }

      const updateUnit = (selector, value) => {
        const node = countdown.querySelector(selector);
        if (node instanceof HTMLElement) {
          node.textContent = String(Math.max(0, value)).padStart(2, '0');
        }
      };

      const updateCountdown = () => {
        const now = Date.now();
        const phase = getGiveawayCampaignPhase(new Date(now));
        const targetTimestamp = phase === 'upcoming' ? startTimestamp : endTimestamp;
        const remaining = Math.max(0, targetTimestamp - now);
        const totalSeconds = Math.floor(remaining / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        updateUnit('[data-countdown-days]', days);
        updateUnit('[data-countdown-hours]', hours);
        updateUnit('[data-countdown-minutes]', minutes);
        updateUnit('[data-countdown-seconds]', seconds);

        if (phase === 'upcoming') {
          countdown.dataset.state = 'upcoming';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Opens In';
          if (live instanceof HTMLElement) live.setAttribute('aria-label', 'Time remaining until giveaway entries open');
        } else if (phase === 'active') {
          countdown.dataset.state = 'active';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Closes In';
          if (live instanceof HTMLElement) live.setAttribute('aria-label', 'Time remaining until giveaway entries close');
        } else if (phase === 'closed') {
          countdown.dataset.state = 'complete';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Closed';
          if (live instanceof HTMLElement) live.hidden = true;
          if (pending instanceof HTMLElement) {
            pending.hidden = false;
            pending.textContent = `Entries closed ${formatGiveawayDate(endTimestamp)}.`;
          }
        }
      };

      updateCountdown();
      window.setInterval(updateCountdown, 1000);
    });
  }

  function renderGiveawayStatus(status) {
    const countNodes = document.querySelectorAll('[data-entry-count]');
    const statusNodes = document.querySelectorAll('[data-unlock-status]');
    const progressNodes = document.querySelectorAll('[data-giveaway-progress]');
    const labelNodes = document.querySelectorAll('[data-giveaway-progress-label]');
    const targetLabelNodes = document.querySelectorAll('[data-entry-target-label]');
    const reviewNodes = document.querySelectorAll('[data-pending-review-count]');
    const lastUpdatedNodes = document.querySelectorAll('[data-giveaway-last-updated]');
    const adminEntryNodes = document.querySelectorAll('[data-admin-giveaway-entries]');
    const adminStatusNodes = document.querySelectorAll('[data-admin-giveaway-status]');

    const target = Number(status.entryTarget || GIVEAWAY_CONFIG.unlockEntryTarget);
    const entries = Number(status.entryCount || 0);
    const progress = calculateGiveawayProgress(entries, target);
    const isUnavailable = Boolean(status.unavailable);
    const remaining = Math.max(0, target - entries);
    const campaignPhase = getGiveawayCampaignPhase();

    countNodes.forEach((node) => {
      node.textContent = isUnavailable ? 'Unavailable' : formatGiveawayCount(entries);
      node.classList.toggle('is-unavailable', isUnavailable);
    });

    targetLabelNodes.forEach((node) => {
      node.textContent = String(target);
    });

    adminEntryNodes.forEach((node) => {
      node.textContent = isUnavailable ? '0' : String(entries);
    });

    adminStatusNodes.forEach((node) => {
      node.textContent = isUnavailable ? 'Unavailable' : (status.unlocked ? 'Unlocked' : 'Locked');
    });

    statusNodes.forEach((node) => {
      if (campaignPhase === 'upcoming') {
        node.textContent = 'Only confirmed eligible entries are included in this live total.';
        return;
      }
      if (campaignPhase === 'closed') {
        node.textContent = `Entries closed ${formatGiveawayDate(GIVEAWAY_CONFIG.endsAt)}.`;
        return;
      }
      if (isUnavailable) {
        node.textContent = GIVEAWAY_CONFIG.entryStatusFallback;
        return;
      }
      if (status.unlocked) {
        node.textContent = 'Giveaway unlock target reached. Eligible entries are being reviewed for the current campaign.';
        return;
      }
      node.textContent = `${remaining} more eligible entr${remaining === 1 ? 'y' : 'ies'} needed before the monthly giveaway unlocks.`;
    });

    progressNodes.forEach((node) => {
      const track = node.closest('.giveaway-progress-track');
      if (track instanceof HTMLElement) track.hidden = isUnavailable;
      node.style.width = isUnavailable ? '0%' : `${progress}%`;
      node.setAttribute('aria-valuenow', String(isUnavailable ? 0 : progress));
      node.setAttribute('aria-valuemin', '0');
      node.setAttribute('aria-valuemax', '100');
      node.setAttribute('aria-valuetext', isUnavailable ? 'Verified progress unavailable' : `${progress}% of unlock target`);
    });

    labelNodes.forEach((node) => {
      if (isUnavailable) {
        node.textContent = 'Live verified progress is temporarily unavailable';
      } else if (campaignPhase === 'upcoming') {
        node.textContent = 'Entry counting begins 20 July 2026 at 7:30 am AEST';
      } else if (campaignPhase === 'closed') {
        node.textContent = `Final verified campaign total: ${entries}`;
      } else {
        node.textContent = `Progress toward the ${target}-entry draw: ${progress}%`;
      }
    });

    reviewNodes.forEach((node) => {
      node.textContent = String(status.pendingReview || 0);
    });

    lastUpdatedNodes.forEach((node) => {
      node.textContent = status.lastUpdated || 'Not connected yet';
    });
  }

  async function loadGiveawayStatus() {
    const countNodes = document.querySelectorAll('[data-entry-count]');
    const statusNodes = document.querySelectorAll('[data-unlock-status]');
    const progressNodes = document.querySelectorAll('[data-giveaway-progress]');

    if (!countNodes.length && !statusNodes.length && !progressNodes.length) {
      return;
    }

    try {
      if (LOCAL_HOSTS.has(window.location.hostname) && !API_BASE.includes(window.location.host)) {
        throw new Error('Local preview fallback');
      }

      const response = await fetch(`${API_BASE}/api/giveaway/status`);
      if (!response.ok) {
        throw new Error('Giveaway status unavailable');
      }

      const data = await response.json();
      renderGiveawayStatus({
        entryCount: Number(data.entryCount ?? data.giveawayEntries ?? 0),
        entryTarget: Number(data.entryTarget ?? data.giveawayThreshold ?? GIVEAWAY_CONFIG.unlockEntryTarget),
        unlocked: Boolean(data.unlocked ?? data.giveawayUnlocked),
        pendingReview: Number(data.pendingReview ?? 0),
        lastUpdated: data.lastUpdated ? String(data.lastUpdated) : ''
      });
    } catch {
      renderGiveawayStatus({
        entryCount: 0,
        entryTarget: GIVEAWAY_CONFIG.unlockEntryTarget,
        unlocked: false,
        unavailable: true,
        status: GIVEAWAY_CONFIG.entryStatusFallback,
        pendingReview: 0,
        lastUpdated: 'Live status unavailable'
      });
    }
  }

  async function loadStats() {
    await loadGiveawayStatus();
  }

  function init() {
    setCurrentYear();
    setupMobileNav();
    setupRevealAnimations();
    setupHeroAmbientMotion();
    setupGiveawayCountdown();
    initCookieConsent();
    setupPackageButtons();
    setupQuoteForm();
    loadStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

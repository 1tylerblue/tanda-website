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
  const GA_MEASUREMENT_ID = 'G-GDWFQH85WN';
  const GA_SCRIPT_ATTRIBUTE = 'data-tac-ga';
  const GOOGLE_ADS_CONVERSION_ID = 'AW-11132030271';
  const GOOGLE_ADS_QUOTE_SEND_TO = 'AW-11132030271/8PYfCNyuw9QcEL-albwp';
  const GOOGLE_ADS_PHONE_CLICK_SEND_TO = 'AW-11132030271/RBdMCMS3w9QcEL-albwp';
  const GOOGLE_TAG_SCRIPT_ATTRIBUTE = 'data-tac-google-tag';
  let gaScriptRequested = false;
  let googleTagConfigured = false;
  let quoteConversionTracked = false;
  let funnelPageViewTracked = false;
  let pageExitTracked = false;
  let highestScrollMilestone = 0;
  const trackedScrollMilestones = new Set();
  const GIVEAWAY_CONFIG = {
    unlockEntryTarget: 50,
    minimumEligibleJobValueIncGstCents: 49500,
    campaignName: 'T&A PRO Cleaning Giveaway Campaign',
    startsAt: '2026-08-24T00:00:00+10:00',
    endsAt: '2026-10-23T20:00:00+10:00',
    startsLabel: '24 August 2026',
    endsLabel: '23 October 2026 at 8:00 PM AEST',
    campaignPeriodLabel: '24 August 2026 - 23 October 2026',
    entriesCloseLabel: 'Entries close 23 October 2026 at 8:00 PM AEST.',
    entryStatusFallback: 'Verified entry totals will appear when live status is connected.',
  };

  function isGiveawayValueEligible(totalIncGst) {
    if (window.TAPricing) return window.TAPricing.isGiveawayValueEligible(totalIncGst);
    return Number.isFinite(Number(totalIncGst)) && Math.round(Number(totalIncGst) * 100) >= GIVEAWAY_CONFIG.minimumEligibleJobValueIncGstCents;
  }

  function getGiveawayCampaignPhase(referenceDate = new Date()) {
    const now = referenceDate instanceof Date ? referenceDate.getTime() : Date.parse(referenceDate);
    const start = Date.parse(GIVEAWAY_CONFIG.startsAt);
    const end = Date.parse(GIVEAWAY_CONFIG.endsAt);

    if (![now, start, end].every(Number.isFinite) || start >= end) return 'unconfigured';
    if (now < start) return 'upcoming';
    if (now < end) return 'active';
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

  function ensureGtagFunction() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  function getGaMeasurementId() {
    const configuredId =
      typeof window.__GA_MEASUREMENT_ID__ === 'string' && window.__GA_MEASUREMENT_ID__.trim()
        ? window.__GA_MEASUREMENT_ID__.trim()
        : GA_MEASUREMENT_ID;
    return /^G-[A-Z0-9]+$/i.test(configuredId) ? configuredId : '';
  }

  function applyDefaultConsent() {
    const consentConfig =
      typeof window.__GA_ANALYTICS_CONFIG__ === 'object' && window.__GA_ANALYTICS_CONFIG__ !== null
        ? window.__GA_ANALYTICS_CONFIG__
        : (window.__GA_ANALYTICS_CONFIG__ = {});

    if (consentConfig.consentDefaultApplied) {
      return;
    }

    ensureGtagFunction();
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
    consentConfig.consentDefaultApplied = true;
  }

  function ensureGoogleTagScript(configuredId) {
    if (document.querySelector(`script[${GOOGLE_TAG_SCRIPT_ATTRIBUTE}="true"], script[src^="https://www.googletagmanager.com/gtag/js"]`)) {
      return;
    }

    const googleTagScript = document.createElement('script');
    googleTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(configuredId)}`;
    googleTagScript.async = true;
    googleTagScript.setAttribute(GOOGLE_TAG_SCRIPT_ATTRIBUTE, 'true');
    document.head.appendChild(googleTagScript);
  }

  function loadGoogleAdsTag() {
    applyDefaultConsent();
    ensureGtagFunction();
    ensureGoogleTagScript(GOOGLE_ADS_CONVERSION_ID);

    if (!googleTagConfigured) {
      window.gtag('js', new Date());
      window.gtag('config', GOOGLE_ADS_CONVERSION_ID);
      googleTagConfigured = true;
    }
  }

  function loadAnalyticsScript() {
    if (gaScriptRequested) {
      return;
    }

    const configuredId = getGaMeasurementId();
    if (!configuredId) {
      return;
    }

    loadGoogleAdsTag();
    window.gtag('config', configuredId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    gaScriptRequested = true;
  }

  function setCookieConsentState(enabled) {
    analyticsEnabled = Boolean(enabled);
    loadGoogleAdsTag();
    if (typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('consent', 'update', {
      analytics_storage: analyticsEnabled ? 'granted' : 'denied',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });

    if (analyticsEnabled) {
      loadAnalyticsScript();
      trackFunnelPageView();
      captureFunnelScrollDepth();
    }
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

    const measurementId = getGaMeasurementId();
    if (measurementId) {
      eventParams.send_to = measurementId;
    }

    window.gtag('event', eventName, eventParams);
  }

  window.TandaAnalytics = { capture: trackEvent };

  function getTrackingLocation(element) {
    if (!(element instanceof Element)) return 'main';
    if (element.closest('header, nav')) return 'header';
    if (element.closest('.hero')) return 'hero';
    if (element.closest('#quote, .quote')) return 'quote';
    if (element.closest('footer')) return 'footer';
    return 'main';
  }

  function trackFunnelPageView() {
    if (!analyticsEnabled || funnelPageViewTracked) {
      return;
    }

    const path = window.location.pathname.toLowerCase().replace(/\/$/, '/index.html');
    let eventName = '';
    if (path.endsWith('/services/window-cleaning-gold-coast.html')) {
      eventName = 'window_landing_view';
    } else if (path.endsWith('/index.html')) {
      eventName = 'home_landing_view';
    }

    if (!eventName) {
      return;
    }

    trackEvent(eventName);
    funnelPageViewTracked = true;
  }

  function captureFunnelScrollDepth() {
    if (!analyticsEnabled) {
      return;
    }

    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight,
    );
    const viewportBottom = window.scrollY + window.innerHeight;
    const percentScrolled = Math.min(100, Math.round((viewportBottom / documentHeight) * 100));

    [25, 50, 75, 90].forEach((milestone) => {
      if (percentScrolled < milestone || trackedScrollMilestones.has(milestone)) {
        return;
      }
      trackedScrollMilestones.add(milestone);
      highestScrollMilestone = Math.max(highestScrollMilestone, milestone);
      trackEvent(`scroll_depth_${milestone}`);
    });
  }

  function setupFunnelTracking() {
    trackFunnelPageView();
    captureFunnelScrollDepth();

    let scrollFrameRequested = false;
    window.addEventListener(
      'scroll',
      () => {
        if (scrollFrameRequested) return;
        scrollFrameRequested = true;
        window.requestAnimationFrame(() => {
          scrollFrameRequested = false;
          captureFunnelScrollDepth();
        });
      },
      { passive: true },
    );

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target ? target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (destination.hash !== '#quote' || destination.origin !== window.location.origin) {
        return;
      }

      const destinationPath = destination.pathname.toLowerCase().replace(/\/$/, '/index.html');
      if (!destinationPath.endsWith('/index.html')) {
        return;
      }

      trackEvent(`quote_cta_${getTrackingLocation(link)}`);
    });

    window.addEventListener('pagehide', (event) => {
      if (event.persisted || pageExitTracked) {
        return;
      }

      pageExitTracked = true;
      const exitDepth = highestScrollMilestone ? `after_${highestScrollMilestone}` : 'before_25';
      trackEvent(`page_exit_${exitDepth}`, {
        transport_type: 'beacon',
      });
    });
  }

  function trackGoogleAdsConversion(sendTo, options = {}) {
    if (!sendTo || !analyticsEnabled) {
      return false;
    }

    loadGoogleAdsTag();
    const eventParams = {
      send_to: sendTo,
    };

    if (typeof options.eventCallback === 'function') {
      let callbackFinished = false;
      const finishCallback = () => {
        if (callbackFinished) {
          return;
        }
        callbackFinished = true;
        options.eventCallback();
      };
      eventParams.event_callback = finishCallback;
      eventParams.event_timeout = Number(options.eventTimeout) || 1500;
      window.setTimeout(finishCallback, eventParams.event_timeout);
    }

    window.gtag('event', 'conversion', eventParams);
    return true;
  }

  function trackQuoteSubmittedConversion() {
    if (quoteConversionTracked) {
      return;
    }

    quoteConversionTracked = true;
    trackGoogleAdsConversion(GOOGLE_ADS_QUOTE_SEND_TO);
  }

  function setupPhoneClickConversionTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target ? target.closest('a[href^="tel:"]') : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      const phoneDigits = String(link.getAttribute('href') || '').replace(/\D/g, '');
      if (phoneDigits !== '0466224927' && phoneDigits !== '61466224927') {
        return;
      }

      trackEvent(`phone_click_${getTrackingLocation(link)}`);

      const href = link.getAttribute('href');
      if (!href || event.defaultPrevented) {
        trackGoogleAdsConversion(GOOGLE_ADS_PHONE_CLICK_SEND_TO);
        return;
      }

      event.preventDefault();
      const tracked = trackGoogleAdsConversion(GOOGLE_ADS_PHONE_CLICK_SEND_TO, {
        eventCallback: () => {
          window.location.href = href;
        },
      });
      if (!tracked) {
        window.location.href = href;
      }
    });
  }

  // ===== Editable Smart Estimate Pricing Config (EX GST) =====
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

  function isInformativeNotes(notes) {
    const text = toText(notes);
    if (!text) {
      return false;
    }

    if (/^(na|n\/a|none|no|nil|same|ok)$/i.test(text.toLowerCase())) {
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
      'serviceArea',
      'accessDifficulty',
      'conditionLevel',
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
    const inclusionsNode = document.querySelector('[data-result-inclusions]');

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
    renderScopeItems(inclusionsNode, result.customerScope);
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
      giveawayNode.textContent = `Giveaway entries open ${GIVEAWAY_CONFIG.startsLabel}. Requests submitted before then are not counted.`;
    } else if (giveawayPhase === 'closed') {
      giveawayNode.textContent = `This giveaway closed ${GIVEAWAY_CONFIG.endsLabel}.`;
    } else if (result.eligibleForGiveaway) {
      giveawayNode.textContent = 'This estimate meets the $495 incl GST value threshold after discount. An entry still requires team confirmation and a paid 50% deposit (full upfront payment for any supported Afterpay booking). Cancelled or refunded qualifying deposits remove the entry.';
    } else {
      giveawayNode.textContent = 'An entry requires a confirmed final discounted total of at least $495 incl GST and a paid qualifying deposit. Sending this request does not create an entry.';
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
    title.textContent = breakdown.automaticPricingUnavailable ? 'Scope requiring inspection' : 'Price calculation';
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
      amount.textContent = breakdown.automaticPricingUnavailable ? 'Inspection required' : window.TAPricing.money(line.subtotalExGst);
      row.append(copy, amount);
      container.appendChild(row);

      if (Number(line.minimumExGst || 0) > 0) {
        const minimum = document.createElement('p');
        minimum.className = 'estimate-calc-minimum';
        minimum.textContent = `Service minimum: ${window.TAPricing.money(line.minimumExGst)} ex GST (applied once per category)`;
        container.appendChild(minimum);
      }
    });

    if (breakdown.automaticPricingUnavailable) return;

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
      ['Normal price ex GST', breakdown.normalExGst],
      [breakdown.campaign?.label || 'Campaign discount', -breakdown.discount],
      ['Discounted subtotal ex GST', breakdown.subtotalExGst],
      ['GST (10%)', breakdown.gst],
      ['Total incl. GST', breakdown.totalIncGst],
    ];
    totals.forEach(([labelText, value], index) => {
      const row = document.createElement('div');
      row.className = `estimate-calc-row ${index === totals.length - 1 ? 'estimate-calc-total' : ''}`;
      const label = document.createElement(index === totals.length - 1 ? 'strong' : 'span');
      label.textContent = labelText;
      const amount = document.createElement(labelText === 'Normal price ex GST' ? 's' : 'b');
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

  function setupAddressTravelPricing(form) {
    const addressInput = form.querySelector('#address');
    const travelBandInput = form.querySelector('#travelBand');
    const travelDistanceInput = form.querySelector('#travelDistanceKm');
    const travelFeeInput = form.querySelector('#travelFeeIncGst');
    const status = form.querySelector('[data-travel-status]');
    if (
      !(addressInput instanceof HTMLInputElement) ||
      !(travelBandInput instanceof HTMLInputElement) ||
      !(travelDistanceInput instanceof HTMLInputElement) ||
      !(travelFeeInput instanceof HTMLInputElement) ||
      !(status instanceof HTMLElement)
    ) {
      return { ensureCurrent: async () => false };
    }

    let debounceId = 0;
    let requestId = 0;
    let resolvedAddress = '';

    const setStatus = (state, message) => {
      status.dataset.state = state;
      status.textContent = message;
      status.hidden = state === 'idle' || !message;
    };

    const setUnverified = () => {
      travelBandInput.value = 'unverified';
      travelDistanceInput.value = '';
      travelFeeInput.value = '0';
      travelBandInput.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const resolveAddress = async ({ force = false } = {}) => {
      const address = toText(addressInput.value);
      if (address.length < 4) {
        resolvedAddress = '';
        setUnverified();
        setStatus('idle', '');
        return false;
      }

      if (!force && address === resolvedAddress && travelBandInput.value !== 'unverified') {
        return true;
      }

      const activeRequest = ++requestId;
      setStatus('checking', 'Checking travel distance from Biggera Waters...');

      try {
        const response = await fetchWithTimeout(
          `${API_BASE}/api/travel-distance?address=${encodeURIComponent(address)}`,
          { headers: { Accept: 'application/json' } },
          9000,
        );
        const result = await response.json().catch(() => ({}));
        if (activeRequest !== requestId) return false;
        if (!response.ok) {
          throw new Error(String(result.error || 'Travel distance could not be verified.'));
        }

        const distanceKm = Number(result.distanceKm);
        const feeApplied = Boolean(result.feeApplied);
        if (!Number.isFinite(distanceKm)) {
          throw new Error('Travel distance could not be verified.');
        }

        resolvedAddress = address;
        travelBandInput.value = feeApplied ? 'beyond50' : 'within50';
        travelDistanceInput.value = String(distanceKm);
        travelFeeInput.value = feeApplied ? '50' : '0';
        travelBandInput.dispatchEvent(new Event('change', { bubbles: true }));
        setStatus(
          feeApplied ? 'fee' : 'clear',
          feeApplied
            ? `Travel checked: normal travel charge $50 incl. GST before the 25% campaign discount (${distanceKm} km from Biggera Waters).`
            : `Travel checked: no extra fee (${distanceKm} km from Biggera Waters).`,
        );
        return true;
      } catch (error) {
        if (activeRequest !== requestId) return false;
        resolvedAddress = '';
        setUnverified();
        setStatus(
          'error',
          error instanceof Error
            ? error.message
            : 'Travel could not be checked automatically. The team will confirm it before booking.',
        );
        return false;
      }
    };

    addressInput.addEventListener('input', () => {
      window.clearTimeout(debounceId);
      if (toText(addressInput.value) !== resolvedAddress) {
        setUnverified();
      }
      if (toText(addressInput.value).length >= 4) {
        debounceId = window.setTimeout(() => resolveAddress(), 850);
      } else {
        setStatus('idle', '');
      }
    });
    addressInput.addEventListener('blur', () => {
      window.clearTimeout(debounceId);
      resolveAddress();
    });

    return {
      ensureCurrent: () => resolveAddress({ force: toText(addressInput.value) !== resolvedAddress }),
    };
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
      scopeQuantity: normalizePricingQuantity(formData.get('pricingItemCode'), formData.get('scopeQuantity')),
      scopeUnit: toText(formData.get('scopeUnit')),
      scopeDetail: toText(formData.get('scopeDetail')),
      accessDifficulty: toText(formData.get('accessDifficulty')),
      conditionLevel: toText(formData.get('conditionLevel')),
      recurringFrequency: toText(formData.get('recurringFrequency')) || 'one_off',
      timingLoading: toText(formData.get('timingLoading')) || 'standard',
      travelBand: toText(formData.get('travelBand')) || 'unverified',
      travelDistanceKm: Math.max(0, Number(formData.get('travelDistanceKm') || 0)),
      travelFeeIncGst: Math.max(0, Number(formData.get('travelFeeIncGst') || 0)),
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
      (payload.serviceGroup !== 'window-cleaning' || toText(payload.serviceArea))
    );
  }

  function buildCustomerScope(payload) {
    const engine = window.TAPricing;
    if (!engine || typeof engine.buildServiceScope !== 'function') return [];
    return engine.buildServiceScope(payload);
  }

  function renderScopeItems(listNode, scopeItems, emptyNode = null) {
    if (!(listNode instanceof HTMLElement)) return;
    const items = Array.isArray(scopeItems) ? scopeItems.filter((item) => toText(item)) : [];
    listNode.replaceChildren();
    items.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = toText(item);
      listNode.appendChild(listItem);
    });
    if (emptyNode instanceof HTMLElement) {
      emptyNode.hidden = items.length > 0;
    }
    listNode.hidden = items.length === 0;
  }

  function setupQuoteScopePreview(form) {
    const listNode = form.querySelector('[data-quote-inclusions-list]');
    const emptyNode = form.querySelector('[data-quote-inclusions-empty]');
    if (!(listNode instanceof HTMLElement)) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      renderScopeItems(listNode, buildCustomerScope(buildBasePayload(form)), emptyNode);
    };
    const queueUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    form.addEventListener('input', queueUpdate, { passive: true });
    form.addEventListener('change', queueUpdate, { passive: true });
    update();
  }

  function buildLocalResult(payload) {
    const estimate = estimateLeadSmart(payload);
    return {
      ...estimate,
      customerScope: buildCustomerScope(payload),
      aiSummary: generateAISummary(payload, estimate),
      leadQuality: scoreLeadQuality(payload),
      eligibleForGiveaway: estimate.eligibleForGiveaway,
    };
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

      const estimate = estimateLeadSmart(payload);
      renderEstimatePreview(estimate);
      const signature = JSON.stringify(estimate.calculationBreakdown);
      if (signature !== form.dataset.estimateSignature && !estimate.automaticPricingUnavailable) {
        form.dataset.estimateSignature = signature; trackEvent('estimate_calculated', { service: payload.service });
      }
    };

    const queuePreview = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(runPreview);
    };

    form.addEventListener('change', event => { if (event.target.name === 'paymentPreference') trackEvent('payment_preference_selected', { method: event.target.value }); });
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
      if (isPrimaryItem) {
        const coverage = form.querySelector('#serviceArea');
        const relevant = entry?.groupId === 'window-cleaning';
        coverage.required = relevant; coverage.disabled = !relevant; coverage.closest('.field').hidden = !relevant;
      }
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
      quantityInput.setCustomValidity('');
      quantityInput.max = '10000';
      quantityInput.min = ['square-metres', 'linear-metres', 'labour-hours'].includes(entry.unit) ? '0.01' : '1';
      quantityInput.step = ['square-metres', 'linear-metres', 'labour-hours'].includes(entry.unit) ? 'any' : '1';
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
      quantityInput.setCustomValidity('');
      quantityInput.max = '10000';
      quantityInput.min = ['square-metres', 'linear-metres', 'labour-hours'].includes(entry.unit) ? '0.01' : '1';
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
      if (input.step === 'any') return;
      input.setCustomValidity(Number.isInteger(value) && value > 0 && value <= 10000 ? '' : 'Enter a whole quantity from 1 to 10000.');
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
        ? (form.querySelector('#serviceArea').disabled ? form.querySelector('#propertyType') : form.querySelector('#serviceArea'))
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

    const requestedService = new URLSearchParams(window.location.search).get('service');
    const requestedGroup = groups.find((group) => group.id === requestedService);
    if (requestedGroup) {
      selectedGroups.add(requestedGroup.id);
      service.value = requestedGroup.id;
      populateItems(service, pricingItem);
      jobPicker.toggle.disabled = false;
      refreshServicePicker();
      refreshJobPicker();
    }
  }

  function normalizePricingQuantity(code, value) { return Number(value); }

  function collectPricingLineItems(form) {
    const lines = [];
    const primaryCode = toText(form.querySelector('#pricingItemCode')?.value);
    if (primaryCode) {
      lines.push({ code: primaryCode, quantity: normalizePricingQuantity(primaryCode, form.querySelector('#scopeQuantity')?.value) });
    }
    form.querySelectorAll('.additional-service-row').forEach((row) => {
      const code = toText(row.querySelector('.additional-service-item')?.value);
      const quantity = normalizePricingQuantity(code, row.querySelector('.additional-service-quantity')?.value);
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
        form.scrollIntoView({ behavior: 'instant', block: 'start' });
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
    const travelPricing = setupAddressTravelPricing(form);
    setupSmartEstimatePreview(form);
    setupScopeQuantityFields(form);
    setupQuoteScopePreview(form);
    setupMobileQuoteSteps(form);

    const trackedQuoteFields = new Set();
    const quoteFieldNames = new Map([
      ['firstName', 'first_name'],
      ['phone', 'phone'],
      ['email', 'email'],
      ['address', 'address'],
      ['propertyType', 'property_type'],
      ['storeys', 'storeys'],
      ['service', 'service'],
      ['pricingItemCode', 'job_type'],
      ['scopeQuantity', 'quantity'],
      ['serviceArea', 'service_area'],
      ['accessDifficulty', 'optional_details'],
      ['conditionLevel', 'optional_details'],
      ['lastCleaned', 'optional_details'],
      ['parking', 'optional_details'],
      ['recurringFrequency', 'optional_details'],
      ['paymentPreference', 'optional_details'],
      ['timingLoading', 'optional_details'],
      ['preferredDate', 'optional_details'],
      ['preferredTime', 'optional_details'],
      ['notes', 'optional_details'],
      ['photoUpload', 'optional_details'],
      ['agree', 'consent'],
    ]);
    let quoteStartTracked = false;
    let quoteSubmissionSucceeded = false;
    let quoteExitTracked = false;
    let lastQuoteField = 'form_start';
    let lastValidationField = '';
    let lastValidationAt = 0;

    const trackQuoteStart = () => {
      if (quoteStartTracked) return;
      quoteStartTracked = true;
      trackEvent('quote_form_start');
      fetchWithTimeout(`${API_BASE}/api/health`, {}, 9000).catch(() => {});
    };

    const trackQuoteField = (fieldName) => {
      if (!fieldName) return;
      trackQuoteStart();
      lastQuoteField = fieldName;
      if (trackedQuoteFields.has(fieldName)) return;
      trackedQuoteFields.add(fieldName);
      trackEvent(`quote_field_${fieldName}`);
    };

    const trackQuoteInteraction = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }
      const fieldName = quoteFieldNames.get(target.id || target.name);
      trackQuoteField(fieldName);
    };

    form.addEventListener('focusin', trackQuoteInteraction);
    form.addEventListener('input', trackQuoteInteraction);
    form.addEventListener('change', trackQuoteInteraction);

    form.addEventListener(
      'invalid',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
          return;
        }
        const fieldName = quoteFieldNames.get(target.id || target.name);
        if (!fieldName) return;

        trackQuoteStart();
        lastQuoteField = fieldName;
        const now = Date.now();
        if (fieldName === lastValidationField && now - lastValidationAt < 1000) {
          return;
        }
        lastValidationField = fieldName;
        lastValidationAt = now;
        trackEvent(`quote_error_${fieldName}`);
      },
      true,
    );

    const reviewButton = form.querySelector('[data-mobile-quote-next="3"]');
    if (reviewButton instanceof HTMLButtonElement) {
      reviewButton.addEventListener('click', () => trackQuoteField('review'));
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.addEventListener('click', () => trackQuoteField('submit_attempt'));
    }

    window.addEventListener('pagehide', (event) => {
      if (event.persisted || quoteExitTracked || !quoteStartTracked || quoteSubmissionSucceeded) {
        return;
      }
      quoteExitTracked = true;
      trackEvent(`quote_exit_after_${lastQuoteField}`, {
        transport_type: 'beacon',
      });
    });

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
      if (form.dataset.submitting === 'true') return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const button = form.querySelector('button[type="submit"]');

      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        setButtonLabel(button, 'Preparing quote...');
      }

      form.dataset.submitting = 'true';
      setFormMessage('Preparing your quote request. The first connection can take up to 45 seconds; please keep this page open.', 'info');

      try {
        await travelPricing.ensureCurrent();
        const payload = await buildPayload(form);
        if (payload.uploadWarnings.length) {
          updateUploadNote(payload.uploadWarnings.join(' '), 'error');
        }
        const pricingErrors = window.TAPricing.validateInput(payload);
        if (pricingErrors.length) throw new Error(pricingErrors.join(' '));
        const localResult = buildLocalResult(payload);

        const result = await window.TASubmissions.submit(`${API_BASE}/api/leads`, payload);

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
        quoteSubmissionSucceeded = true;
        window.TASubmissions.once(result.lead.id, () => {
          trackEvent('quote_submit_success');
          trackQuoteSubmittedConversion();
        });
        loadStats().catch(() => {});
      } catch (error) {
        const fallbackPayload = buildBasePayload(form);
        const fallbackResult = buildLocalResult(fallbackPayload);
        renderQuoteResult(fallbackResult);


        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        const message = timedOut
          ? 'The connection took too long, so the form stopped waiting. Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com so we can confirm your request.'
          : error instanceof Error
            ? `${error.message} Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com if you do not receive a response.`
            : 'We could not send the request automatically. Your estimate is shown below. Please call 0466 224 927 or email tandaprocleaning@gmail.com.';
        setFormMessage(message, 'error');
        trackEvent('quote_delivery_error', {
          event_category: 'quote',
          event_label: 'fallback_used',
        });
      } finally {
        form.dataset.submitting = 'false';
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          setButtonLabel(button, 'Get a Free Quote');
        }
      }
    });
  }

  function estimateLeadSmart(lead) {
    const estimate = window.TAPricing.calculateEstimate(lead);
    return { ...estimate, eligibleForGiveaway: isGiveawayCampaignOpen() && estimate.eligibleForGiveaway };
  }
  function generateAISummary(lead, estimate) { return window.TAPricing.generateSummary(lead, estimate); }
  function formatScopeUnit(unit, quantity) { return window.TAPricing.unitLabel(unit, quantity); }
  function getScopeDetailRule() { return null; }

  function buildImprovedDescription(payload) {
    const lines = [];
    lines.push('Customer requested a free quote estimate.');
    lines.push(`Primary scope: ${payload.service} for a ${payload.propertyType} property with ${payload.serviceArea.toLowerCase()} coverage.`);
    const roomDescription = payload.rooms ? `, ${payload.rooms} rooms` : '';
    lines.push(`Site profile: ${payload.storeys} storey${roomDescription}, ${payload.accessDifficulty.toLowerCase()} access, ${payload.conditionLevel.toLowerCase()} condition.`);

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
      if (!payload.service || !payload.propertyType || !payload.storeys) {
        setFormMessage('Please choose service, property type, stories and service area first.', 'error');
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

  function normalizeApiResult(apiResult, fallbackResult) {
    if (fallbackResult.automaticPricingUnavailable) {
      return { ...apiResult, ...fallbackResult };
    }
    const merged = {
      ...fallbackResult,
      ...(apiResult && typeof apiResult === 'object' ? apiResult : {}),
    };

    merged.estimateMin = merged.estimateMin !== null && Number.isFinite(Number(merged.estimateMin)) ? Number(merged.estimateMin) : fallbackResult.estimateMin;
    merged.estimateMax = merged.estimateMax !== null && Number.isFinite(Number(merged.estimateMax)) ? Number(merged.estimateMax) : fallbackResult.estimateMax;
    merged.estimateMinIncGst = merged.estimateMinIncGst !== null && Number.isFinite(Number(merged.estimateMinIncGst))
      ? Number(merged.estimateMinIncGst)
      : fallbackResult.estimateMinIncGst;
    merged.estimateMaxIncGst = merged.estimateMaxIncGst !== null && Number.isFinite(Number(merged.estimateMaxIncGst))
      ? Number(merged.estimateMaxIncGst)
      : fallbackResult.estimateMaxIncGst;
    merged.recommendedEstimate = merged.recommendedEstimate !== null && Number.isFinite(Number(merged.recommendedEstimate))
      ? Number(merged.recommendedEstimate)
      : fallbackResult.recommendedEstimate;
    merged.recommendedEstimateIncGst = merged.recommendedEstimateIncGst !== null && Number.isFinite(Number(merged.recommendedEstimateIncGst))
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
      const statusLabel = countdown.querySelector('[data-countdown-status]');

      if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp >= endTimestamp) {
        countdown.dataset.state = 'unconfigured';
        if (live instanceof HTMLElement) live.hidden = true;
        if (pending instanceof HTMLElement) pending.hidden = false;
        return;
      }

      if (live instanceof HTMLElement) live.hidden = false;
      if (pending instanceof HTMLElement) pending.hidden = true;
      if (dateLabel instanceof HTMLElement) {
        dateLabel.textContent = `${GIVEAWAY_CONFIG.campaignPeriodLabel}. ${GIVEAWAY_CONFIG.entriesCloseLabel}`;
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
          if (statusLabel instanceof HTMLElement) statusLabel.textContent = 'Giveaway Not Yet Open';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Opens In';
          if (live instanceof HTMLElement) live.setAttribute('aria-label', 'Time remaining until giveaway entries open');
        } else if (phase === 'active') {
          countdown.dataset.state = 'active';
          if (statusLabel instanceof HTMLElement) statusLabel.textContent = 'Giveaway Open';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Closes In';
          if (live instanceof HTMLElement) live.setAttribute('aria-label', 'Time remaining until giveaway entries close');
        } else if (phase === 'closed') {
          countdown.dataset.state = 'complete';
          if (statusLabel instanceof HTMLElement) statusLabel.textContent = 'Giveaway Closed';
          if (title instanceof HTMLElement) title.textContent = 'Campaign Closed';
          if (live instanceof HTMLElement) live.hidden = true;
          if (pending instanceof HTMLElement) {
            pending.hidden = false;
            pending.textContent = `Entries closed ${GIVEAWAY_CONFIG.endsLabel}.`;
          }
        }
      };

      updateCountdown();
      window.setInterval(updateCountdown, 1000);
    });
  }

  function syncGiveawayCampaignState() {
    const phase = getGiveawayCampaignPhase();
    const entryCtas = document.querySelectorAll('[data-giveaway-entry-cta]');

    entryCtas.forEach((cta) => {
      if (!(cta instanceof HTMLElement)) return;
      if (phase === 'closed') {
        cta.textContent = 'Get a Free Quote';
        cta.setAttribute('aria-label', 'Get a free quote from T&A Pro Cleaning');
      }
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
        node.textContent = `Entries closed ${GIVEAWAY_CONFIG.endsLabel}.`;
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
      node.textContent = `${remaining} more eligible entr${remaining === 1 ? 'y' : 'ies'} needed before the campaign unlock target is reached.`;
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
        node.textContent = `Entry counting begins ${GIVEAWAY_CONFIG.startsLabel}`;
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

      const response = await fetchWithTimeout(`${API_BASE}/api/giveaway/status`, {}, 9000);
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

  function setupInitialScrollPosition() {
    const resetToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const scrollToHashTarget = () => {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = targetId ? document.getElementById(targetId) : null;
      if (!(target instanceof HTMLElement)) return false;
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      return true;
    };

    if (window.location.hash) {
      window.requestAnimationFrame(scrollToHashTarget);
    } else {
      resetToTop();
      window.requestAnimationFrame(resetToTop);
    }

    window.addEventListener('pageshow', () => {
      if (window.location.hash) {
        scrollToHashTarget();
        window.setTimeout(scrollToHashTarget, 80);
      } else {
        resetToTop();
        window.setTimeout(resetToTop, 80);
      }
    });

    window.addEventListener('hashchange', () => {
      window.requestAnimationFrame(scrollToHashTarget);
    });
  }

  function init() {
    setupInitialScrollPosition();
    setCurrentYear();
    setupMobileNav();
    setupRevealAnimations();
    setupHeroAmbientMotion();
    syncGiveawayCampaignState();
    setupGiveawayCountdown();
    initCookieConsent();
    setupFunnelTracking();
    setupPhoneClickConversionTracking();
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

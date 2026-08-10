import { getServiceQuoteService } from './service-quote-config.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const MAX_UPLOAD_FILES = 3;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ATTRIBUTION_STORAGE_KEY = 'tac_service_quote_attribution_v1';
const QUOTE_REQUEST_TIMEOUT_MS = 22000;

function getApiBase() {
  if (window.__API_BASE__) return String(window.__API_BASE__).replace(/\/$/, '');
  if (LOCAL_HOSTS.has(window.location.hostname)) return 'http://localhost:3000';
  return '';
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `sq-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeCapture(eventName, properties = {}) {
  window.TandaAnalytics?.capture?.(eventName, properties);
}

function getTrafficSource() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid') || /(?:cpc|ppc|paid)/i.test(params.get('utm_medium') || '')) return 'google_ads';
  if (/google/i.test(params.get('utm_source') || '')) return 'google';
  if (document.referrer && !document.referrer.includes(window.location.hostname)) return 'referral';
  return 'direct';
}

function collectAttribution() {
  const params = new URLSearchParams(window.location.search);
  const current = {
    landingPagePath: window.location.pathname,
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    utmContent: params.get('utm_content') || '',
    utmTerm: params.get('utm_term') || '',
    gclid: params.get('gclid') || '',
    gbraid: params.get('gbraid') || '',
    wbraid: params.get('wbraid') || '',
    source: getTrafficSource(),
  };

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
    const merged = Object.fromEntries(Object.keys(current).map((key) => [key, current[key] || String(previous?.[key] || '')]));
    merged.landingPagePath = current.landingPagePath || previous?.landingPagePath || '/';
    merged.source = current.source === 'direct' && previous?.source ? previous.source : current.source;
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return current;
  }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('One photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function setStatus(node, text, kind = 'info') {
  if (!(node instanceof HTMLElement)) return;
  node.hidden = !text;
  node.textContent = text;
  node.dataset.status = kind;
}

function failureMessage(error) {
  const message = error instanceof Error && error.message
    ? error.message
    : 'We could not send your request.';
  return /(?:try again\.?|call 0466 224 927\.)$/i.test(message)
    ? message
    : `${message} Please try again or call 0466 224 927.`;
}

async function postQuoteRequest(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), QUOTE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${getApiBase()}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function setupServiceQuoteForm(form) {
  const serviceId = String(form.dataset.serviceId || '');
  const service = getServiceQuoteService(serviceId);
  if (!service) return;

  const startedAt = Date.now();
  const panel = form.closest('[data-service-quote-panel]') || form.parentElement;
  const status = panel?.querySelector('[data-service-quote-status]');
  const submit = form.querySelector('button[type="submit"]');
  const upload = form.querySelector('input[type="file"]');
  const stickyButtons = Array.from(document.querySelectorAll('[data-service-quote-scroll]'));
  let started = false;
  let inFlight = false;
  let submitted = false;

  form.classList.add('ph-no-capture');
  form.setAttribute('data-ph-no-autocapture', 'true');
  form.querySelector('[data-selected-service]').textContent = service.label;

  const eventProperties = (extra = {}) => ({
    service_id: serviceId,
    page_path: window.location.pathname,
    form_id: 'service_quote_form',
    form_location: 'service_hero',
    form_variant: 'compact_service_landing',
    traffic_type: getTrafficSource(),
    device_category: window.innerWidth < 700 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    ...extra,
  });

  const markStarted = () => {
    if (started) return;
    started = true;
    safeCapture('quote_form_started', eventProperties());
  };

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      safeCapture('quote_form_viewed', eventProperties({ trigger: 'viewport' }));
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(form);

    const stickyObserver = new IntersectionObserver((entries) => {
      const formIsVisible = entries.some((entry) => entry.isIntersecting);
      stickyButtons.forEach((button) => {
        button.hidden = formIsVisible;
      });
    }, { threshold: 0.2 });
    stickyObserver.observe(form);
  } else {
    stickyButtons.forEach((button) => {
      button.hidden = false;
    });
  }

  form.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) markStarted();
  });

  form.addEventListener('invalid', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    markStarted();
    const fieldId = ({ firstName: 'first_name', phone: 'mobile', address: 'suburb_or_postcode', email: 'email', agree: 'terms' })[field.name] || 'form_field';
    safeCapture('quote_validation_failed', eventProperties({
      field_id: fieldId,
      validation_category: field.validity.valueMissing ? 'required_field_missing' : field.validity.typeMismatch ? 'invalid_format' : 'invalid_value',
    }));
  }, true);

  stickyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      safeCapture('cta_clicked', eventProperties({ cta_id: 'service_quote_sticky', cta_label: 'get_a_fast_quote', placement: 'sticky_bottom' }));
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => form.querySelector('[name="firstName"]')?.focus({ preventScroll: true }), 350);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (inFlight || submitted) return;

    markStarted();
    inFlight = true;
    const submissionId = createId();
    const originalLabel = submit?.textContent || 'Get a Fast Quote';
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = true;
      submit.textContent = 'Sending your request...';
    }
    setStatus(status, 'Sending your request securely...', 'info');
    safeCapture('quote_submission_attempted', eventProperties({ submission_id: submissionId, photo_included: Boolean(upload?.files?.length) }));

    try {
      const files = Array.from(upload?.files || []);
      if (files.length > MAX_UPLOAD_FILES || files.some((file) => file.size > MAX_UPLOAD_BYTES || !ALLOWED_IMAGE_TYPES.has(file.type))) {
        throw new Error('Please use up to 3 JPG, PNG or WebP photos, each under 4 MB.');
      }
      const photoUploads = await Promise.all(files.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: await toDataUrl(file),
      })));
      const payload = {
        formVariant: 'service_landing_compact',
        serviceId,
        firstName: form.elements.firstName.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        address: form.elements.address.value.trim(),
        notes: form.elements.notes.value.trim(),
        website: form.elements.website.value.trim(),
        agree: form.elements.agree.checked,
        photoUploads,
        formElapsedMs: Date.now() - startedAt,
        clientSubmittedAt: new Date().toISOString(),
        marketingAttribution: collectAttribution(),
        analytics: window.TandaAnalytics?.getLeadContext?.() || undefined,
      };
      const response = await postQuoteRequest(payload);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(result.error || 'We could not send your request. Please try again.'), { status: response.status });

      submitted = true;
      form.setAttribute('aria-hidden', 'true');
      form.hidden = true;
      setStatus(status, 'Thanks - your quote request has been received. We will contact you to confirm the right scope for your property.', 'success');
      safeCapture('quote_submitted', eventProperties({
        submission_id: submissionId,
        analytics_lead_id: result.analyticsLeadId || '',
        http_status: response.status,
        duration_ms: Date.now() - startedAt,
        photo_included: photoUploads.length > 0,
      }));
      window.TandaGoogleAds?.trackQuoteSubmittedConversion?.();
    } catch (error) {
      const statusCode = Number(error?.status || 0);
      const category = statusCode >= 500 ? 'server_error' : statusCode >= 400 ? 'request_rejected' : error?.name === 'AbortError' ? 'timeout' : error instanceof TypeError ? 'network_error' : 'request_failed';
      setStatus(status, failureMessage(error), 'error');
      safeCapture('quote_submission_failed', eventProperties({
        submission_id: submissionId,
        http_status: statusCode || undefined,
        error_category: category,
        error_code: statusCode ? `http_${statusCode}` : error?.name === 'AbortError' ? 'request_timeout' : 'request_failed',
      }));
    } finally {
      inFlight = false;
      if (submit instanceof HTMLButtonElement && !submitted) {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    }
  });
}

function setupPage() {
  document.querySelectorAll('[data-service-quote-form]').forEach(setupServiceQuoteForm);
  document.querySelectorAll('[data-service-quote-link]').forEach((link) => {
    link.addEventListener('click', () => safeCapture('cta_clicked', {
      cta_id: 'service_quote_hero',
      cta_label: 'get_a_fast_quote',
      placement: 'hero',
      page_path: window.location.pathname,
      service_id: String(link.dataset.serviceId || ''),
    }));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupPage, { once: true });
else setupPage();

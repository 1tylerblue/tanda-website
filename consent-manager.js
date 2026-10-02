/* One first-party consent state for GTM, the Google tag and the site's own events. */
(() => {
  'use strict';

  const KEY = 'tac_cookie_consent_v2';
  const LEGACY_KEY = 'tac_cookie_consent_v1';
  const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  let choice = null;

  function validTimestamp(value) {
    return Number.isFinite(value) && value > 0 && value <= Date.now() && Date.now() - value < MAX_AGE_MS;
  }

  function readChoice() {
    try {
      const current = window.localStorage.getItem(KEY);
      if (current) {
        const value = JSON.parse(current);
        return value && value.version === 2 && typeof value.analytics === 'boolean' &&
          typeof value.advertising === 'boolean' && validTimestamp(value.timestamp) ? value : null;
      }
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (!legacy) return null;
      const value = JSON.parse(legacy);
      // The old "Accept Analytics" button did not request advertising consent.
      if (!value || typeof value !== 'object' || !validTimestamp(value.timestamp)) return null;
      if (value.state !== 'accepted' && value.state !== 'denied') return null;
      return { version: 2, analytics: value.state === 'accepted', advertising: false, timestamp: value.timestamp };
    } catch {
      return null;
    }
  }

  function googleConsent(value) {
    const analytics = value?.analytics ? 'granted' : 'denied';
    const advertising = value?.advertising ? 'granted' : 'denied';
    return {
      analytics_storage: analytics,
      ad_storage: advertising,
      ad_user_data: advertising,
      ad_personalization: advertising,
      functionality_storage: 'granted',
      security_storage: 'granted',
    };
  }

  function apply(value) {
    // The inline denied default on each page runs before this script and before GTM.
    // A saved choice is restored here, ahead of GTM's first event.
    try {
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', googleConsent(value));
    } catch {
      // A blocked Google script must never block the site's preference controls.
    }
    window.dispatchEvent(new CustomEvent('tanda:consent-change', { detail: {
      analytics: Boolean(value?.analytics), advertising: Boolean(value?.advertising),
    } }));
  }

  choice = readChoice();
  if (choice) apply(choice);

  function save(analytics, advertising) {
    choice = { version: 2, analytics: Boolean(analytics), advertising: Boolean(advertising), timestamp: Date.now() };
    try { window.localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* Session-only preference. */ }
    apply(choice);
  }

  function initControls() {
    let banner = document.getElementById('cookie-consent');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cookie-consent';
      banner.className = 'cookie-consent';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Cookie consent');
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <p class="cookie-consent-text">Choose optional analytics, Google Ads measurement and personalised advertising. Your quote and contact links work without them. <a href="/privacy.html">Privacy policy</a></p>
      <div class="cookie-consent-actions">
        <button type="button" id="cookie-accept" class="btn-secondary">Accept all</button>
        <button type="button" id="cookie-decline" class="btn-primary">Reject all</button>
        <button type="button" id="cookie-custom" class="btn-primary" aria-expanded="false" aria-controls="cookie-preferences">Preferences</button>
      </div>
      <div id="cookie-preferences" class="cookie-preferences" hidden>
        <label><input type="checkbox" id="cookie-analytics"> Analytics</label>
        <label><input type="checkbox" id="cookie-advertising"> Google Ads measurement &amp; personalised ads</label>
        <button type="button" id="cookie-save" class="btn-secondary">Save choices</button>
      </div>`;

    const preferences = banner.querySelector('#cookie-preferences');
    const custom = banner.querySelector('#cookie-custom');
    const analytics = banner.querySelector('#cookie-analytics');
    const advertising = banner.querySelector('#cookie-advertising');
    function close() { banner.hidden = true; preferences.hidden = true; custom.setAttribute('aria-expanded', 'false'); }
    function open() {
      analytics.checked = Boolean(choice?.analytics);
      advertising.checked = Boolean(choice?.advertising);
      banner.hidden = false;
      banner.querySelector('#cookie-accept').focus();
    }
    banner.querySelector('#cookie-accept').addEventListener('click', () => { save(true, true); close(); });
    banner.querySelector('#cookie-decline').addEventListener('click', () => { save(false, false); close(); });
    banner.querySelector('#cookie-save').addEventListener('click', () => { save(analytics.checked, advertising.checked); close(); });
    custom.addEventListener('click', () => {
      preferences.hidden = !preferences.hidden;
      custom.setAttribute('aria-expanded', String(!preferences.hidden));
      if (!preferences.hidden) analytics.focus();
    });

    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'cookie-settings-trigger';
    settings.textContent = 'Cookie settings';
    settings.addEventListener('click', open);
    (document.querySelector('footer') || document.body).appendChild(settings);
    banner.hidden = Boolean(choice);

    const style = document.createElement('style');
    style.textContent = `
      .cookie-consent{flex-wrap:wrap}
      .cookie-consent a{color:#9edcff}
      .cookie-preferences{display:flex;align-items:center;justify-content:center;gap:14px;width:100%;color:#fff;font-size:.85rem}
      .cookie-preferences[hidden]{display:none}
      .cookie-preferences label{display:inline-flex;align-items:center;gap:5px}
      .cookie-preferences input{width:17px;height:17px}
      .cookie-preferences button{min-height:38px;padding:0 14px;border:1px solid #39b8ff;border-radius:8px;background:#0a7fff;color:#fff;font-weight:700}
      .cookie-settings-trigger{display:block;margin:12px auto;padding:8px 12px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;cursor:pointer}
      .cookie-settings-trigger:focus-visible{outline:3px solid #9edcff;outline-offset:2px}
      @media(max-width:760px){.cookie-consent-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important}.cookie-consent-actions button{padding:4px;font-size:.72rem}.cookie-preferences{flex-wrap:wrap}}
    `;
    document.head.appendChild(style);
  }

  window.TandaConsent = Object.freeze({
    allowsAnalytics: () => Boolean(choice?.analytics),
    allowsAdvertising: () => Boolean(choice?.advertising),
    getChoice: () => choice && { ...choice },
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initControls, { once: true });
  else initControls();
})();

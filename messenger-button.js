(function initMessengerButton() {
  'use strict';

  const BUTTON_ID = 'tandaMessengerButton';
  const STYLE_ID = 'tandaMessengerButtonStyles';
  const MESSENGER_URL = 'https://m.me/tandaprocleaningservices';
  const ACCESSIBLE_LABEL = 'Chat with T&A Pro Cleaning on Messenger';
  const COOKIE_CONSENT_KEY = 'tac_cookie_consent_v1';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tanda-messenger-contact {
        --tanda-messenger-bottom-offset: 22px;
        position: fixed;
        right: max(18px, env(safe-area-inset-right));
        bottom: calc(var(--tanda-messenger-bottom-offset) + env(safe-area-inset-bottom));
        z-index: 1100;
        display: inline-flex;
        min-width: 52px;
        min-height: 52px;
        max-width: calc(100vw - 36px);
        align-items: center;
        justify-content: center;
        gap: 10px;
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 999px;
        background: linear-gradient(135deg, #0786e8 0%, #00b7ff 100%);
        color: #ffffff;
        box-shadow: 0 16px 34px rgba(0, 77, 140, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.32);
        font: 800 0.92rem/1.1 Inter, Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
        padding: 0 18px 0 14px;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }

      .tanda-messenger-contact:hover {
        transform: translateY(-1px);
        background: linear-gradient(135deg, #006fd1 0%, #05c3ff 100%);
        box-shadow: 0 18px 38px rgba(0, 77, 140, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.36);
      }

      .tanda-messenger-contact:active {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 10px 24px rgba(0, 77, 140, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }

      .tanda-messenger-contact:focus-visible {
        outline: 3px solid #9edcff;
        outline-offset: 4px;
      }

      .tanda-messenger-contact__icon {
        width: 25px;
        height: 25px;
        flex: 0 0 auto;
        display: block;
      }

      .tanda-messenger-contact__label {
        white-space: nowrap;
      }

      .tanda-messenger-contact.is-compact-placement {
        width: 52px;
        height: 52px;
        padding: 0;
      }

      .tanda-messenger-contact.is-hidden-for-nav {
        display: none;
      }

      .tanda-messenger-contact.is-compact-placement .tanda-messenger-contact__label {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @media (max-width: 620px) {
        .tanda-messenger-contact {
          right: max(14px, env(safe-area-inset-right));
          min-width: 52px;
          width: 52px;
          height: 52px;
          padding: 0;
        }

        .tanda-messenger-contact__label {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tanda-messenger-contact {
          transition: none;
        }
      }

      @media print {
        .tanda-messenger-contact {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    let current = element;
    while (current instanceof HTMLElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      current = current.parentElement;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function updateOffset(button) {
    const isCompact = window.matchMedia('(max-width: 620px)').matches;
    button.classList.remove('is-compact-placement');

    const openMobileNav = document.querySelector('.site-nav.is-open');
    const shouldHideForNav = isCompact && isVisible(openMobileNav);
    button.classList.toggle('is-hidden-for-nav', shouldHideForNav);
    if (shouldHideForNav) return;

    if (!isCompact) {
      const serviceQuoteForm = document.querySelector('[data-service-quote-form]');
      if (isVisible(serviceQuoteForm)) {
        const formRect = serviceQuoteForm.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const verticalOverlap = buttonRect.bottom > formRect.top && buttonRect.top < formRect.bottom;
        if (verticalOverlap && buttonRect.left < formRect.right + 10) {
          button.classList.add('is-compact-placement');
        }
      }
    }

    let offset = isCompact ? 16 : 22;

    const cookieBanner = document.getElementById('cookie-consent');
    if (isVisible(cookieBanner)) {
      offset += Math.ceil(cookieBanner.getBoundingClientRect().height) + 12;
    }

    const serviceQuoteSticky = document.querySelector('.service-quote-sticky:not([hidden])');
    if (isVisible(serviceQuoteSticky)) {
      offset += Math.ceil(serviceQuoteSticky.getBoundingClientRect().height) + 12;
    }

    const interactiveObstacles = Array.from(document.querySelectorAll(
      'input, select, textarea, button, a.btn, a[href^="tel:"], a[href^="mailto:"], a[href*="#quote"], a[data-service-quote-link], .inner-meta-pill, .service-chip, .service-scope-inline span'
    ));

    for (let attempt = 0; attempt < 4; attempt += 1) {
      button.style.setProperty('--tanda-messenger-bottom-offset', `${offset}px`);
      const buttonRect = button.getBoundingClientRect();
      const overlappingControls = interactiveObstacles
        .filter((element) => {
          if (!isVisible(element)) return false;
          if (element === button || element.closest(`#${BUTTON_ID}`)) return false;
          if (element.closest('.cookie-consent, [data-nav-toggle]')) return false;
          if (element.classList.contains('service-quote-sticky')) return false;
          const rect = element.getBoundingClientRect();
          return !(buttonRect.right <= rect.left || buttonRect.left >= rect.right || buttonRect.bottom <= rect.top || buttonRect.top >= rect.bottom);
        });

      if (!overlappingControls.length) break;
      const topEdge = Math.min(...overlappingControls.map((element) => element.getBoundingClientRect().top));
      const requiredOffset = Math.ceil(window.innerHeight - topEdge + 12);
      if (requiredOffset <= offset) break;
      offset = requiredOffset;
    }
  }

  function messengerIcon() {
    return `
      <svg class="tanda-messenger-contact__icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M16 2.9C8.5 2.9 2.8 8.3 2.8 15.6c0 4 1.8 7.5 4.6 9.8v4.1c0 .7.8 1.1 1.4.7l3.6-2c1.1.3 2.3.4 3.6.4 7.5 0 13.2-5.4 13.2-12.7S23.5 2.9 16 2.9Z"/>
        <path fill="#ffffff" d="M8.8 19.6 13 13c.5-.8 1.6-1 2.4-.4l3.1 2.3c.3.2.8.2 1.1-.1l3.8-3.7-4.2 6.6c-.5.8-1.6 1-2.4.4l-3.1-2.3c-.3-.2-.8-.2-1.1.1l-3.8 3.7Z"/>
      </svg>
    `;
  }

  function hasAcceptedAnalyticsConsent() {
    if (!(typeof window.localStorage === 'object')) return false;

    try {
      const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed === 'accepted') return true;
      return Boolean(parsed && typeof parsed === 'object' && parsed.state === 'accepted');
    } catch {
      return false;
    }
  }

  function captureClick() {
    const eventProperties = {
      cta_id: 'messenger_bottom_right',
      cta_label: 'message_us',
      placement: 'floating_contact',
      destination_type: 'social',
      contact_type: 'messenger',
      page_path: window.location.pathname,
      device_category: window.matchMedia('(max-width: 620px)').matches ? 'mobile' : 'desktop',
    };

    if (window.TandaAnalytics?.capture) {
      window.TandaAnalytics.capture('messenger_button_clicked', eventProperties);
      return;
    }

    if (hasAcceptedAnalyticsConsent() && typeof window.gtag === 'function') {
      window.gtag('event', 'messenger_button_clicked', eventProperties);
    }
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) return;
    injectStyles();

    const button = document.createElement('a');
    button.id = BUTTON_ID;
    button.className = 'tanda-messenger-contact';
    button.href = MESSENGER_URL;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.setAttribute('aria-label', ACCESSIBLE_LABEL);
    button.setAttribute('data-ph-no-autocapture', '');
    button.setAttribute('data-messenger-contact', '');
    button.innerHTML = `${messengerIcon()}<span class="tanda-messenger-contact__label">Message us</span>`;
    button.addEventListener('click', captureClick, { passive: true });

    document.body.appendChild(button);
    updateOffset(button);

    const update = () => updateOffset(button);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.setTimeout(update, 250);

    const observer = new MutationObserver(update);
    const cookieBanner = document.getElementById('cookie-consent');
    if (cookieBanner) observer.observe(cookieBanner, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    document.querySelectorAll('.service-quote-sticky').forEach((element) => {
      observer.observe(element, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    });
    const mobileNav = document.querySelector('.site-nav');
    if (mobileNav) observer.observe(mobileNav, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountButton, { once: true });
  } else {
    mountButton();
  }
})();

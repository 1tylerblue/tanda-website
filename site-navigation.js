(() => {
  'use strict';
  let initialized = false;
  function init() {
    if (initialized) return;
    const header = document.querySelector('.site-header');
    const toggle = header?.querySelector('[data-nav-toggle]');
    const panel = header?.querySelector('[data-nav-panel]');
    const nav = header?.querySelector('[data-nav]');
    const close = header?.querySelector('[data-nav-close]');
    const backdrop = header?.querySelector('[data-nav-backdrop]');
    if (!toggle || !panel || !nav || !close || !backdrop) return;
    initialized = true;
    document.documentElement.classList.add('navigation-ready');
    const mobile = window.matchMedia('(max-width: 1279px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let opened = false;
    let scroll = null;
    const inertStates = new Map();
    const root = document.documentElement;
    const body = document.body;
    const spacer = document.createElement('div');
    spacer.className = 'site-nav-spacer'; spacer.hidden = true; spacer.setAttribute('aria-hidden','true');
    header.before(spacer);
    function measureHeader() { root.style.setProperty('--site-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`); }
    function suspendBackground() {
      [...body.children, header.querySelector('.brand')].forEach(element => {
        if (!(element instanceof HTMLElement) || element === header || element.contains(header) || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)) return;
        if (!inertStates.has(element)) inertStates.set(element, element.inert);
        element.inert = true;
      });
    }
    function resumeBackground() { inertStates.forEach((inert, element) => { element.inert = inert; }); inertStates.clear(); }
    function lockScroll() {
      const names = ['position','top','left','right','width','overflow','padding-right'];
      scroll = { x: window.scrollX, y: window.scrollY, properties: names.map(name => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]) };
      const scrollbar = window.innerWidth - root.clientWidth;
      const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.position = 'fixed'; body.style.top = `-${scroll.y}px`; body.style.left = '0'; body.style.right = '0'; body.style.width = '100%'; body.style.overflow = 'hidden';
      if (scrollbar > 0) body.style.paddingRight = `${padding + scrollbar}px`;
    }
    function unlockScroll() {
      if (!scroll) return;
      const saved = scroll; scroll = null;
      saved.properties.forEach(([name,value,priority]) => value ? body.style.setProperty(name,value,priority) : body.style.removeProperty(name));
      // Restore synchronously before any selected anchor is processed. No deferred restoration.
      window.scrollTo({left:saved.x, top:saved.y, behavior:'instant'});
    }
    function closeMenu({ returnFocus = true } = {}) {
      if (!opened) return;
      opened = false; root.classList.remove('site-menu-open'); spacer.hidden = true; nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open main navigation');
      panel.hidden = mobile.matches; panel.inert = mobile.matches; backdrop.hidden = true;
      panel.removeAttribute('aria-modal'); resumeBackground(); unlockScroll();
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
    }
    function openMenu() {
      if (!mobile.matches || opened) return;
      measureHeader(); spacer.style.height = `${header.getBoundingClientRect().height}px`; lockScroll(); spacer.hidden = false; opened = true;
      root.classList.add('site-menu-open'); panel.hidden = false; panel.inert = false; backdrop.hidden = false;
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','siteNavTitle');
      nav.classList.add('is-open'); toggle.setAttribute('aria-expanded','true'); toggle.setAttribute('aria-label','Close main navigation');
      suspendBackground(); panel.scrollTop = 0; close.focus({preventScroll:true});
    }
    function focusable() { return [...panel.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')].filter(element => element.getClientRects().length && !element.closest('[inert]')); }
    function anchorTarget(hash) {
      if (!hash || hash === '#') return null;
      try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
    }
    function focusTarget(target) {
      if (!(target instanceof HTMLElement)) return;
      const destination = target.matches('h1,h2,h3,input,button,a,select,textarea') ? target : target.querySelector('h1,h2,h3') || target;
      const previous = destination.getAttribute('tabindex');
      if (previous === null) { destination.setAttribute('tabindex','-1'); destination.addEventListener('blur',()=>destination.removeAttribute('tabindex'),{once:true}); }
      destination.focus({preventScroll:true});
    }
    function samePage(url) {
      const normalize = value => value.replace(/\/index\.html$/, '/');
      return url.origin === location.origin && normalize(url.pathname) === normalize(location.pathname) && url.search === location.search;
    }
    toggle.addEventListener('click',()=>opened ? closeMenu() : openMenu());
    close.addEventListener('click',()=>closeMenu());
    backdrop.addEventListener('click',()=>closeMenu());
    document.addEventListener('keydown',event=>{
      if (!opened) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const elements = focusable(); const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    });
    document.addEventListener('focusin',event=>{ if (opened && !panel.contains(event.target)) close.focus({preventScroll:true}); });
    nav.addEventListener('click',event=>{
      const link = event.target.closest('a[href]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href,location.href);
      const target = samePage(url) && anchorTarget(url.hash);
      if (opened) closeMenu({returnFocus:url.protocol === 'tel:'});
      if (target) {
        event.preventDefault();
        if (location.hash !== url.hash) history.pushState(null,'',url.hash);
        target.scrollIntoView({block:'start',behavior:motion.matches ? 'instant' : 'smooth'}); focusTarget(target);
      }
    });
    function syncLayout() {
      const hadFocus = panel.contains(document.activeElement);
      if (opened) closeMenu({returnFocus:false});
      panel.hidden = mobile.matches; panel.inert = mobile.matches; backdrop.hidden = true;
      toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open main navigation');
      if (mobile.matches) { panel.setAttribute('role','dialog'); panel.setAttribute('aria-labelledby','siteNavTitle'); if (hadFocus) toggle.focus({preventScroll:true}); }
      else {
        panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); panel.removeAttribute('aria-labelledby');
        // Do not leave keyboard focus on the now-hidden mobile close control.
        if (hadFocus && !document.activeElement.getClientRects().length) nav.querySelector('a[href]')?.focus({preventScroll:true});
      }
      measureHeader();
    }
    mobile.addEventListener('change',syncLayout);
    window.addEventListener('resize',measureHeader,{passive:true});
    window.visualViewport?.addEventListener('resize',measureHeader,{passive:true});
    new ResizeObserver(measureHeader).observe(header);
    new MutationObserver(()=>{ if (opened) suspendBackground(); }).observe(body,{childList:true});
    window.addEventListener('hashchange',()=>focusTarget(anchorTarget(location.hash)));
    const initialHashFocus = ()=>focusTarget(anchorTarget(location.hash));
    if (document.readyState === 'complete') initialHashFocus(); else window.addEventListener('load',initialHashFocus,{once:true});
    nav.querySelectorAll('a').forEach(link=>{
      const url = new URL(link.href,location.href);
      if (!url.hash && samePage(url)) link.setAttribute('aria-current','page');
    });
    syncLayout();
  }
  window.TANavigation = { init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();

/* Keep supporting content expanded on desktop and explicitly discoverable on phones. */
(() => {
  const breakpoint = window.matchMedia('(max-width: 760px)');
  const disclosures = [...document.querySelectorAll('[data-mobile-disclosure]')];

  const updateLayout = () => {
    disclosures.forEach((disclosure) => {
      const summary = disclosure.querySelector(':scope > summary');
      if (breakpoint.matches && disclosure.contains(document.activeElement) && document.activeElement !== summary) {
        summary?.focus();
      }
      disclosure.open = !breakpoint.matches;
    });
  };

  updateLayout();
  // A viewport-height change from the keyboard must not reset an opened disclosure.
  breakpoint.addEventListener('change', updateLayout);
})();

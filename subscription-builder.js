(function () {
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
  const MAX_UPLOAD_FILES = 5;
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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

  const SUBSCRIPTION_ENDPOINT = `${getApiBase()}/api/subscriptions`;

  const SUBSCRIPTION_PRICING_CONFIG = window.TASubscriptionPricing.config;

  const form = document.getElementById('subscriptionBuilderForm');
  const serviceSelectionGrid = document.getElementById('serviceSelectionGrid');
  const liveFirstClean = document.getElementById('liveFirstClean');
  const liveRecurring = document.getElementById('liveRecurring');
  const liveAnnual = document.getElementById('liveAnnual');
  const liveSummaryList = document.getElementById('liveSummaryList');
  const builderMessage = document.getElementById('builderMessage');
  const builderResult = document.getElementById('builderResult');
  const pricingConfig = SUBSCRIPTION_PRICING_CONFIG;
  let stagePriceFirst = null;
  let stagePriceMonthly = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function value(id, fallback = '') {
    const node = byId(id);
    return node && 'value' in node ? node.value : fallback;
  }

  function toNumber(id, fallback = 0) {
    const parsed = Number(value(id, String(fallback)));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function yes(id) {
    return value(id) === 'yes';
  }

  function checked(id) {
    const node = byId(id);
    return node instanceof HTMLInputElement && node.checked;
  }

  function selectedRadio(name, fallback) {
    const node = form.querySelector(`input[name="${name}"]:checked`);
    return node instanceof HTMLInputElement ? node.value : fallback;
  }

  function setupProgressiveBuilder() {
    const sections = Array.from(form.children).filter((node) => node.classList && node.classList.contains('builder-step'));
    if (sections.length < 16) return;

    const stages = [
      { title: 'Plan & property', sections: sections.slice(0, 2) },
      { title: 'Contact & property details', sections: sections.slice(2, 5) },
      { title: 'Access & services', sections: sections.slice(5, 10) },
      { title: 'Schedule & preferences', sections: sections.slice(10, 15) },
      { title: 'Review & submit', sections: sections.slice(15, 16) }
    ];
    let currentStage = 0;

    const progress = document.createElement('div');
    progress.className = 'builder-progress';
    progress.setAttribute('aria-label', 'Subscription builder progress');
    progress.innerHTML = `
      <div class="builder-progress-meta">
        <span data-builder-step-label>Step 1 of ${stages.length}</span>
        <strong data-builder-stage-title>${stages[0].title}</strong>
      </div>
      <div class="builder-progress-track" aria-hidden="true"><span data-builder-progress-bar></span></div>
      <div class="builder-stage-price" aria-live="polite">
        <span>First clean: <strong data-builder-first-price>$0 + GST</strong></span>
        <span>Monthly: <strong data-builder-monthly-price>$0/month + GST</strong></span>
      </div>
    `;
    form.prepend(progress);

    const actions = document.createElement('div');
    actions.className = 'builder-stage-actions';
    actions.innerHTML = `
      <button type="button" class="builder-stage-button" data-builder-back>Back</button>
      <button type="button" class="builder-stage-button primary" data-builder-next>Continue</button>
    `;
    form.append(actions);

    const stepLabel = progress.querySelector('[data-builder-step-label]');
    const stageTitle = progress.querySelector('[data-builder-stage-title]');
    const progressBar = progress.querySelector('[data-builder-progress-bar]');
    const backButton = actions.querySelector('[data-builder-back]');
    const nextButton = actions.querySelector('[data-builder-next]');
    stagePriceFirst = progress.querySelector('[data-builder-first-price]');
    stagePriceMonthly = progress.querySelector('[data-builder-monthly-price]');

    function validateStage() {
      const requiredFields = stages[currentStage].sections.flatMap((section) =>
        Array.from(section.querySelectorAll('[required]'))
      );
      const invalidField = requiredFields.find((field) =>
        field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement
          ? !field.disabled && !field.checkValidity()
          : false
      );
      if (!invalidField) return true;
      invalidField.reportValidity();
      invalidField.focus();
      return false;
    }

    function renderStage(shouldScroll) {
      stages.forEach((stage, stageIndex) => {
        stage.sections.forEach((section) => {
          section.hidden = stageIndex !== currentStage;
        });
      });
      stepLabel.textContent = `Step ${currentStage + 1} of ${stages.length}`;
      stageTitle.textContent = stages[currentStage].title;
      progressBar.style.width = `${((currentStage + 1) / stages.length) * 100}%`;
      backButton.hidden = currentStage === 0;
      nextButton.hidden = currentStage === stages.length - 1;
      progress.setAttribute('aria-label', `Step ${currentStage + 1} of ${stages.length}: ${stages[currentStage].title}`);

      if (currentStage === stages.length - 1) {
        renderFinalSummary(calculatePricing());
      } else {
        builderResult.classList.add('hidden');
      }

      if (shouldScroll) {
        const top = form.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }

    backButton.addEventListener('click', () => {
      currentStage = Math.max(0, currentStage - 1);
      renderStage(true);
    });

    nextButton.addEventListener('click', () => {
      if (!validateStage()) return;
      currentStage = Math.min(stages.length - 1, currentStage + 1);
      renderStage(true);
    });

    renderStage(false);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function serializeSubscriptionPhotos() {
    const photos = byId('subscriptionPhotos');
    const files = photos instanceof HTMLInputElement && photos.files ? Array.from(photos.files).slice(0, MAX_UPLOAD_FILES) : [];
    const warnings = [];
    const uploads = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        warnings.push(`${file.name} was skipped because it is not an image.`);
        continue;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        warnings.push(`${file.name} was skipped because it is larger than 4MB.`);
        continue;
      }

      uploads.push({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: await fileToDataUrl(file)
      });
    }

    return { uploads, warnings };
  }

  function selectedPlanKey() {
    return selectedRadio('plan', 'bronze');
  }

  function selectedPropertyType() {
    return selectedRadio('propertyType', 'house');
  }

  function plan() {
    return pricingConfig.plans[selectedPlanKey()] || pricingConfig.plans.bronze;
  }

  function formatMoney(amount) {
    return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function propertyTypeLabel(key) {
    const labels = {
      house: 'House',
      townhouse: 'Townhouse / Duplex',
      apartment: 'Apartment / Unit',
      highrise: 'High-rise Apartment',
      strata: 'Strata / Body Corporate',
      commercial: 'Commercial / Other'
    };
    return labels[key] || key;
  }

  function buildServiceRows() {
    const fragment = document.createDocumentFragment();

    pricingConfig.services.forEach((service) => {
      const row = document.createElement('div');
      row.className = 'service-row';
      row.innerHTML = `
        <label>
          <input type="checkbox" data-service-id="${service.id}" data-role="service-checkbox" />
          ${service.label}
        </label>
        <select data-service-id="${service.id}" data-role="service-frequency" aria-label="${service.label} frequency" disabled>
          ${Object.keys(service.monthly).map((freq) => `<option value="${freq}">${freq}</option>`).join('')}
        </select>
        <div class="service-note">
          <label>
            Notes for ${service.label}
            <input type="text" data-service-id="${service.id}" data-role="service-note" placeholder="Optional service notes" />
          </label>
        </div>
      `;
      fragment.appendChild(row);
    });

    serviceSelectionGrid.appendChild(fragment);
  }

  function setServiceState(serviceId, included, frequency) {
    const checkbox = form.querySelector(`[data-role="service-checkbox"][data-service-id="${serviceId}"]`);
    const select = form.querySelector(`[data-role="service-frequency"][data-service-id="${serviceId}"]`);
    const row = checkbox ? checkbox.closest('.service-row') : null;

    if (checkbox instanceof HTMLInputElement) checkbox.checked = included;
    if (select instanceof HTMLSelectElement) {
      select.disabled = !included;
      if (frequency && Array.from(select.options).some((option) => option.value === frequency)) {
        select.value = frequency;
      }
    }
    if (row) row.classList.toggle('is-selected', included);
  }

  function clearServices() {
    form.querySelectorAll('[data-role="service-checkbox"]').forEach((checkbox) => {
      if (!(checkbox instanceof HTMLInputElement)) return;
      setServiceState(checkbox.getAttribute('data-service-id'), false);
    });
  }

  function applyPlanDefaults(planKey) {
    clearServices();
    const selectedPlan = pricingConfig.plans[planKey] || pricingConfig.plans.bronze;
    Object.entries(selectedPlan.defaults).forEach(([serviceId, frequency]) => {
      setServiceState(serviceId, true, frequency);
    });
  }

  function applyPlanFromQuery() {
    const queryPlan = new URLSearchParams(window.location.search).get('plan');
    if (!queryPlan || !pricingConfig.plans[queryPlan]) return;
    const planRadio = form.querySelector(`input[name="plan"][value="${queryPlan}"]`);
    if (planRadio instanceof HTMLInputElement) planRadio.checked = true;
  }

  function togglePropertySections() {
    const type = selectedPropertyType();
    byId('houseFields').classList.toggle('hidden', !(type === 'house' || type === 'townhouse'));
    byId('apartmentFields').classList.toggle('hidden', !(type === 'apartment' || type === 'highrise'));
    byId('strataFields').classList.toggle('hidden', !(type === 'strata' || type === 'commercial'));
  }

  function selectedServices() {
    const selected = [];

    form.querySelectorAll('[data-role="service-checkbox"]').forEach((checkbox) => {
      if (!(checkbox instanceof HTMLInputElement) || !checkbox.checked) return;
      const serviceId = checkbox.getAttribute('data-service-id');
      const service = pricingConfig.services.find((item) => item.id === serviceId);
      if (!service) return;

      const frequencyNode = form.querySelector(`[data-role="service-frequency"][data-service-id="${serviceId}"]`);
      const noteNode = form.querySelector(`[data-role="service-note"][data-service-id="${serviceId}"]`);
      const frequency = frequencyNode instanceof HTMLSelectElement ? frequencyNode.value : Object.keys(service.monthly)[0];
      const notes = noteNode instanceof HTMLInputElement ? noteNode.value.trim() : '';

      selected.push({
        serviceName: service.label,
        serviceId,
        included: true,
        frequency,
        notes,
        firstAdd: Number(service.firstAdd || 0),
        recurringAdd: Number(service.monthly[frequency] || 0)
      });
    });

    return selected;
  }

  function pricingInput() {
    const fields = {};
    window.TASubscriptionPricing.FIELD_IDS.forEach(id => {
      const node = byId(id);
      if (node) fields[id] = node.type === 'checkbox' ? node.checked : node.value;
    });
    return { planKey: selectedPlanKey(), propertyType: selectedPropertyType(), fields, services: selectedServices().map(({serviceId, frequency, notes}) => ({serviceId, frequency, notes})) };
  }
  function calculatePricing() { return window.TASubscriptionPricing.calculatePricing(pricingInput()); }

  function buildAccessSummary() {
    const pieces = [
      `Parking: ${byId('parkingType').selectedOptions[0].text}`,
      `Access: ${byId('accessDifficulty').selectedOptions[0].text}`
    ];
    if (yes('gateAccess')) pieces.push('gate access');
    if (yes('keyPickup')) pieces.push('key pickup');
    if (yes('accessCode')) pieces.push('access code');
    if (yes('restrictedHours')) pieces.push('restricted hours');
    if (yes('bodyCorporateBooking')) pieces.push('body corporate booking');
    if (yes('petsOnProperty') || yes('housePets')) pieces.push('pets on property');
    return pieces.join(', ');
  }

  function frequencyLines(result) {
    if (result.services.length) {
      return result.services.map((item) => `${item.serviceName}: ${item.frequency}${item.notes ? ` - ${item.notes}` : ''}`);
    }
    return result.plan.frequencySummary;
  }

  function escapeText(text) { const node = document.createElement('span'); node.textContent = text; return node.innerHTML; }
  function renderPromotion(node, breakdown, suffix = '') {
    node.replaceChildren();
    const old = document.createElement('s'); old.textContent = `Normal ${formatMoney(breakdown.normalExGst)} ex GST`;
    const sale = document.createElement('strong'); sale.textContent = `${formatMoney(breakdown.totalIncGst)}${suffix} incl. GST`;
    const details = document.createElement('small'); details.textContent = `10% off: −${formatMoney(breakdown.discount)}; ${formatMoney(breakdown.subtotalExGst)} ex GST + ${formatMoney(breakdown.gst)} GST`;
    node.append(old, document.createElement('br'), sale, document.createElement('br'), details);
  }

  function renderLiveSummary(result) {
    renderPromotion(liveFirstClean, result.firstBreakdown);
    renderPromotion(liveRecurring, result.recurringBreakdown, '/month');
    if (liveAnnual) liveAnnual.textContent = `${formatMoney(result.annualRecurring)}/year + GST`;
    if (stagePriceFirst) stagePriceFirst.textContent = `${formatMoney(result.firstClean)} + GST`;
    if (stagePriceMonthly) stagePriceMonthly.textContent = `${formatMoney(result.recurring)}/month + GST`;

    byId('visitDurationHint').value = `${result.worker.visitDuration.toFixed(1)} hours (calculated)`;
    byId('calculatedFirstClean').value = String(result.firstClean);
    byId('calculatedRecurring').value = String(result.recurring);
    byId('calculatedWorkerStructure').value = `${result.worker.workerText}, ${result.worker.visitDuration.toFixed(1)}h/visit`;
    byId('calculatedMonthlyLabour').value = `${result.worker.monthlyLabour.toFixed(1)} hours/month`;

    const serviceSummary = escapeText(frequencyLines(result).slice(0, 3).concat(result.notes.slice(0, 2)).join('; '));
    liveSummaryList.innerHTML = `
      <li>Plan: ${result.plan.label}</li>
      <li>Property: ${propertyTypeLabel(result.propertyType)}</li>
      <li>Workers: ${result.worker.workerText}</li>
      <li>Visits: ${result.worker.visits}</li>
      <li>Monthly labour: ${result.worker.monthlyLabour.toFixed(1)} hours</li>
      <li>Services: ${serviceSummary}</li>
    `;
  }

  function renderFinalSummary(result) {
    renderPromotion(byId('resultFirstClean'), result.firstBreakdown);
    renderPromotion(byId('resultRecurring'), result.recurringBreakdown, '/month');
    byId('resultAnnual').textContent = `${formatMoney(result.annualRecurring)}/year + GST`;
    byId('resultPlan').textContent = result.plan.label;
    byId('resultPropertyType').textContent = propertyTypeLabel(result.propertyType);
    byId('resultWorkerStructure').textContent = `${result.worker.workerText}, ${result.worker.visitDuration.toFixed(1)}h per visit, ${result.worker.monthlyLabour.toFixed(1)}h/month`;
    byId('resultAccessSummary').textContent = buildAccessSummary();
    byId('resultServices').innerHTML = frequencyLines(result).concat(result.notes).map((line) => `<li>${escapeText(line)}</li>`).join('');
    builderResult.classList.remove('hidden');
  }

  function validateForm() {
    builderMessage.className = 'builder-step-note';
    const requiredIds = ['fullName', 'phone', 'email', 'streetAddress', 'suburb', 'postcode'];
    const missing = requiredIds.filter((id) => !value(id).trim());
    const email = value('email').trim();
    const photos = byId('subscriptionPhotos');

    if (missing.length) {
      builderMessage.textContent = 'Please complete your name, phone, email, street address, suburb and postcode before submitting.';
      builderMessage.classList.add('builder-message-error');
      byId(missing[0]).focus();
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      builderMessage.textContent = 'Please enter a valid email address.';
      builderMessage.classList.add('builder-message-error');
      byId('email').focus();
      return false;
    }
    if (photos instanceof HTMLInputElement && photos.files && photos.files.length > MAX_UPLOAD_FILES) {
      builderMessage.textContent = `Please upload no more than ${MAX_UPLOAD_FILES} photos.`;
      builderMessage.classList.add('builder-message-error');
      photos.focus();
      return false;
    }
    return true;
  }

  function buildPayload(result) {
    const photos = byId('subscriptionPhotos');
    const photoNames = photos instanceof HTMLInputElement && photos.files ? Array.from(photos.files).map((file) => file.name) : [];
    const modifiers = pricingConfig.modifiers;
    const panels = toNumber('balconyPanels', 0);
    const extraPanelCount = Math.max(0, panels - modifiers.balconyIncludedPanels);

    return {
      type: 'subscription_builder',
      pricingInput: pricingInput(),
      plan: {
        selectedPlan: result.plan.label,
        workers: result.worker.workerText,
        visits: result.worker.visits,
        firstCleanPrice: result.firstClean,
        recurringMonthlyPrice: result.recurring,
        annualRecurringPrice: result.annualRecurring,
        gstNote: result.gstNote
      },
      customer: {
        fullName: value('fullName').trim(),
        phone: value('phone').trim(),
        email: value('email').trim(),
        preferredContactMethod: value('preferredContact')
      },
      property: {
        propertyType: propertyTypeLabel(result.propertyType),
        address: value('streetAddress').trim(),
        suburb: value('suburb').trim(),
        postcode: value('postcode').trim(),
        bedrooms: result.propertyType === 'house' || result.propertyType === 'townhouse' ? toNumber('houseBedrooms', 0) : toNumber('apartmentBedrooms', 0),
        bathrooms: result.propertyType === 'house' || result.propertyType === 'townhouse' ? toNumber('houseBathrooms', 0) : toNumber('apartmentBathrooms', 0),
        storeys: toNumber('houseStoreys', 0),
        pool: value('housePool'),
        balcony: result.propertyType === 'house' || result.propertyType === 'townhouse' ? value('houseBalcony') : value('apartmentBalcony'),
        floorLevel: toNumber('floorLevel', 0),
        units: toNumber('strataUnits', 0),
        floors: toNumber('strataFloors', 0),
        commonAreaSize: value('strataAreaSize')
      },
      access: {
        parkingType: value('parkingType'),
        heightClearance: value('heightClearance'),
        gateAccess: yes('gateAccess'),
        keyPickupRequired: yes('keyPickup'),
        accessCodeRequired: yes('accessCode'),
        restrictedHours: yes('restrictedHours'),
        liftAccess: yes('logisticsLiftAccess') || yes('apartmentLiftAccess'),
        stairOnlyAccess: yes('logisticsStairsOnly') || yes('apartmentStairsOnly'),
        bodyCorporateBookingRequired: yes('bodyCorporateBooking') || yes('strataBookingRequired'),
        pets: yes('petsOnProperty') || yes('housePets'),
        waterSourceAccess: value('waterSource'),
        powerAccess: value('powerAccess'),
        safeEquipmentAccess: value('safeEquipmentAccess'),
        accessDifficulty: value('accessDifficulty')
      },
      services: result.services.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        included: item.included,
        frequency: item.frequency,
        notes: item.notes
      })),
      addOns: {
        extraGeneralClean: checked('extraGeneralClean'),
        priorityResponse: checked('priorityResponse'),
        eventReady: checked('eventReadyClean'),
        deepRotation: checked('deepRotation'),
        swaps: {
          poolForGeneralCleaning: checked('swapPoolGeneral'),
          poolForWindows: checked('swapPoolWindows'),
          customSwap: checked('customSwap')
        },
        removals: {
          poolService: checked('removePoolService')
        }
      },
      apartmentBalcony: {
        balconyGlassSelected: yes('accessibleBalconyGlass'),
        panelCount: panels,
        includedPanels: modifiers.balconyIncludedPanels,
        extraPanelCount,
        glassDoorCount: toNumber('glassDoors', 0),
        noRopeAccessAcknowledged: true
      },
      scheduling: {
        preferredDay: value('preferredDay'),
        preferredTimeWindow: value('preferredTimeWindow'),
        fixedRecurringDayPreferred: value('fixedRecurringDay'),
        canServiceWhileAway: value('serviceWhileAway'),
        preferredStartDate: value('preferredStartDate'),
        urgency: value('urgency')
      },
      billing: {
        preferredPaymentMethod: value('paymentMethod'),
        preferredBillingDate: value('preferredBillingDate'),
        monthlyBillingPreference: value('billingPreference'),
        autoDebitConsent: yes('autoDebitConsent')
      },
      giveaway: {
        wantsGiveawayConsideration: checked('giveawayConsideration'),
        eligibilityStatus: 'pending_review'
      },
      notes: value('specialNotes').trim(),
      photos: photoNames,
      meta: {
        source: 'subscription-builder.html',
        submittedAt: new Date().toISOString(),
        userAgent: window.navigator.userAgent
      }
    };
  }

  function updateAll() {
    togglePropertySections();
    const result = calculatePricing();
    renderLiveSummary(result);
  }

  buildServiceRows();
  applyPlanFromQuery();
  applyPlanDefaults(selectedPlanKey());
  setupProgressiveBuilder();
  byId('builderYear').textContent = String(new Date().getFullYear());
  updateAll();

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.getAttribute('name') === 'plan') {
      applyPlanDefaults(selectedPlanKey());
    }

    if (target.getAttribute('data-role') === 'service-checkbox') {
      const checkbox = target;
      const serviceId = checkbox.getAttribute('data-service-id');
      setServiceState(serviceId, checkbox instanceof HTMLInputElement && checkbox.checked);
    }

    window.TandaAnalytics?.capture('subscription_enquiry');
    if (target.id === 'paymentMethod') window.TandaAnalytics?.capture('payment_preference_selected', { method: target.value });
    updateAll();
  });

  form.addEventListener('input', updateAll);
  form.addEventListener('focusin', () => { fetch(`${getApiBase()}/api/health`, { signal: AbortSignal.timeout(9000) }).catch(() => {}); }, { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;
    const result = calculatePricing();
    renderLiveSummary(result);
    renderFinalSummary(result);

    if (!validateForm()) return;

    form.dataset.submitting = 'true';
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending Subscription Request...';
    }

    builderMessage.textContent = 'Sending your subscription request. The first connection can take up to 45 seconds; please keep this page open.';
    builderMessage.className = 'builder-step-note builder-message-success';

    try {
      const payload = buildPayload(result);
      const { uploads, warnings } = await serializeSubscriptionPhotos();
      payload.photoUploads = uploads;
      payload.uploadWarnings = warnings;

      const apiResult = await window.TASubmissions.submit(SUBSCRIPTION_ENDPOINT, payload);
      renderLiveSummary(apiResult.subscription.pricing);
      renderFinalSummary(apiResult.subscription.pricing);
      window.TASubmissions.once(apiResult.subscription.id, () => window.TandaAnalytics?.capture('subscription_submit_success'));

      const warningText = warnings.length ? ` ${warnings.join(' ')}` : '';
      builderMessage.textContent = `Subscription request sent to the T & A team. We can now review the exact calculated pricing, access details, selected services and recurring schedule before confirming the first service.${warningText}`;
      builderMessage.className = 'builder-step-note builder-message-success';
    } catch (error) {
      builderMessage.textContent = error instanceof Error ? error.message : 'Subscription request could not be submitted. Please try again or contact the team.';
      builderMessage.className = 'builder-step-note builder-message-error';
    } finally {
      form.dataset.submitting = 'false';
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Subscription Request';
      }
    }
  });
})();

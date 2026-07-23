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

  const SUBSCRIPTION_PRICING_CONFIG = {
    gstRate: 0.1,
    plans: {
      bronze: {
        label: 'Bronze',
        firstClean: 599,
        recurring: 399,
        workers: '1 worker',
        workerCount: 1,
        visits: '1 visit per month',
        visitsPerMonth: 1,
        visitHours: 2.2,
        defaults: {
          'interior-windows': 'Bi-monthly',
          'bin-cleaning': 'Monthly'
        },
        frequencySummary: [
          'Interior windows: every 2 months',
          'Bin cleaning: monthly',
          'Property condition check: every visit',
          'Light upkeep allocation: monthly',
          'Workers: 1 worker',
          'Visits: 1 visit/month'
        ]
      },
      silver: {
        label: 'Silver',
        firstClean: 799,
        recurring: 549,
        workers: '1-2 workers',
        workerCount: 1,
        visits: '1-2 visits per month',
        visitsPerMonth: 1.5,
        visitHours: 3.1,
        defaults: {
          'general-cleaning': 'Monthly',
          'interior-windows': 'Bi-monthly',
          'exterior-windows': 'Bi-monthly',
          'bin-cleaning': 'Monthly'
        },
        frequencySummary: [
          'General cleaning support: monthly where selected',
          'Interior windows: every 2 months',
          'Exterior windows: every 2 months where accessible',
          'Pool cleaning: monthly where selected',
          'Bin cleaning: monthly',
          'Workers: 1-2 workers',
          'Visits: 1-2 visits/month'
        ]
      },
      gold: {
        label: 'Gold',
        firstClean: 1099,
        recurring: 749,
        workers: '2 workers',
        workerCount: 2,
        visits: '2 visits per month',
        visitsPerMonth: 2,
        visitHours: 3.8,
        defaults: {
          'general-cleaning': 'Monthly',
          'interior-windows': 'Bi-monthly',
          'exterior-windows': 'Monthly',
          'gutter-cleaning': 'Monthly',
          'solar-panel-cleaning': 'Quarterly'
        },
        frequencySummary: [
          'General cleaning: monthly where selected',
          'Pool cleaning: monthly where selected',
          'Exterior cleaning: monthly where accessible',
          'Gutter cleaning: monthly where applicable',
          'Windows: every 2 months',
          'Solar panels: quarterly where applicable',
          'Workers: 2 workers',
          'Visits: 2 visits/month'
        ]
      },
      platinum: {
        label: 'Platinum',
        firstClean: 1599,
        recurring: 1199,
        workers: '2 workers',
        workerCount: 2,
        visits: '2-3 visits per month',
        visitsPerMonth: 2.5,
        visitHours: 4.8,
        defaults: {
          'general-cleaning': 'Fortnightly',
          'interior-windows': 'Bi-monthly',
          'exterior-windows': 'Monthly',
          'gutter-cleaning': 'Monthly',
          'pressure-washing': 'Quarterly',
          'roof-cleaning': 'Annually',
          'pest-control': '6 monthly',
          'tile-grout': '6 monthly'
        },
        frequencySummary: [
          'General cleaning: 1-2x monthly where selected',
          'Pool cleaning: monthly where selected',
          'Exterior cleaning: monthly where accessible',
          'Gutter cleaning: monthly where applicable',
          'Pressure / soft washing: quarterly',
          'Roof cleaning: annually',
          'Pest control: 6 monthly',
          'Tile & grout: 4-6 monthly',
          'Workers: 2 workers',
          'Visits: 2-3 visits/month'
        ]
      },
      custom: {
        label: 'Custom / Build Your Own',
        firstClean: 799,
        recurring: 549,
        workers: 'Custom scope',
        workerCount: 2,
        visits: 'Built around selected schedule',
        visitsPerMonth: 2,
        visitHours: 3.5,
        defaults: {},
        frequencySummary: [
          'Custom services and frequencies selected by client',
          'Workers: calculated from scope',
          'Visits: calculated from selected schedule'
        ]
      }
    },
    modifiers: {
      includedBedrooms: 4,
      extraBedroomRecurring: 50,
      extraBedroomFirstClean: 75,
      extraStoreyRecurring: 150,
      extraStoreyFirstClean: 200,
      poolRecurring: 120,
      poolFirstClean: 150,
      extraGeneralCleanRecurring: 180,
      extraGeneralCleanFirstClean: 220,
      priorityResponseRecurring: 60,
      eventReadyRecurring: 90,
      deepRotationRecurring: 120,
      apartmentBaseDiscountRecurring: 50,
      apartmentBaseDiscountFirstClean: 75,
      balconyAddOnBaseRecurring: 50,
      balconyAddOnBaseFirstClean: 75,
      balconyIncludedPanels: 10,
      extraBalconyPanelRecurring: 5,
      extraBalconyPanelFirstClean: 5,
      glassDoorRecurring: 10,
      glassDoorFirstClean: 10,
      strataUnitBaseIncluded: 4,
      extraStrataUnitRecurring: 40,
      extraStrataUnitFirstClean: 60,
      strataFloorBaseIncluded: 2,
      extraStrataFloorRecurring: 120,
      extraStrataFloorFirstClean: 180,
      commonAreaMediumRecurring: 180,
      commonAreaMediumFirstClean: 250,
      commonAreaLargeRecurring: 350,
      commonAreaLargeFirstClean: 500,
      controlledAccessRecurring: 80,
      controlledAccessFirstClean: 100,
      difficultAccessRecurring: 150,
      difficultAccessFirstClean: 200,
      noReliableParkingRecurring: 80,
      noReliableParkingFirstClean: 100,
      heavyConditionFirstClean: 250,
      firstProfessionalCleanFirstClean: 350
    },
    services: [
      { id: 'general-cleaning', label: 'General cleaning', firstAdd: 85, monthly: { Weekly: 520, Fortnightly: 300, Monthly: 170 } },
      { id: 'interior-windows', label: 'Interior windows', firstAdd: 55, monthly: { Monthly: 90, 'Bi-monthly': 52, Quarterly: 35 } },
      { id: 'exterior-windows', label: 'Exterior windows', firstAdd: 65, monthly: { Monthly: 110, 'Bi-monthly': 65, Quarterly: 45 } },
      { id: 'balcony-glass', label: 'Balcony glass', firstAdd: 40, monthly: { Monthly: 70, 'Bi-monthly': 42, Quarterly: 28 } },
      { id: 'pool-cleaning', label: 'Pool cleaning', firstAdd: 65, monthly: { Weekly: 360, Fortnightly: 220, Monthly: 145 } },
      { id: 'bin-cleaning', label: 'Bin cleaning', firstAdd: 20, monthly: { Weekly: 90, Fortnightly: 55, Monthly: 35 } },
      { id: 'carpet-cleaning', label: 'Carpet cleaning', firstAdd: 95, monthly: { 'Bi-monthly': 120, Quarterly: 85, '6 monthly': 48 } },
      { id: 'upholstery-cleaning', label: 'Upholstery cleaning', firstAdd: 90, monthly: { Quarterly: 74, '6 monthly': 44, Annually: 24 } },
      { id: 'gutter-cleaning', label: 'Gutter cleaning', firstAdd: 95, monthly: { Monthly: 140, 'Bi-monthly': 85, Quarterly: 58 } },
      { id: 'solar-panel-cleaning', label: 'Solar panel cleaning', firstAdd: 75, monthly: { Quarterly: 55, '6 monthly': 30 } },
      { id: 'driveway-paths', label: 'Driveway / paths', firstAdd: 90, monthly: { Monthly: 140, Quarterly: 58, '6 monthly': 34 } },
      { id: 'pressure-washing', label: 'Pressure washing', firstAdd: 110, monthly: { Quarterly: 85, '6 monthly': 46, Annually: 25 } },
      { id: 'soft-washing', label: 'Soft washing', firstAdd: 110, monthly: { Quarterly: 90, '6 monthly': 50, Annually: 28 } },
      { id: 'roof-cleaning', label: 'Roof cleaning', firstAdd: 180, monthly: { Annually: 35, '6 monthly': 70 } },
      { id: 'pest-control', label: 'Pest control', firstAdd: 105, monthly: { '6 monthly': 45, Annually: 23 } },
      { id: 'tile-grout', label: 'Tile & grout', firstAdd: 95, monthly: { Quarterly: 90, '6 monthly': 52, Annually: 30 } },
      { id: 'common-area-cleaning', label: 'Common area cleaning', firstAdd: 110, monthly: { Weekly: 420, Fortnightly: 250, Monthly: 150 } },
      { id: 'common-area-pressure', label: 'Common area pressure washing', firstAdd: 120, monthly: { Monthly: 160, Quarterly: 95, '6 monthly': 56 } },
      { id: 'event-ready-clean', label: 'Event-ready clean', firstAdd: 120, monthly: { Monthly: 90, Quarterly: 42, '6 monthly': 24 } },
      { id: 'priority-response-clean', label: 'Priority response clean', firstAdd: 80, monthly: { Monthly: 60, Quarterly: 28, '6 monthly': 16 } }
    ]
  };

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
    return `$${Math.round(amount).toLocaleString('en-AU')}`;
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

  function propertyAdjustments(type) {
    const modifiers = pricingConfig.modifiers;
    let firstClean = 0;
    let recurring = 0;
    const notes = [];

    if (type === 'house' || type === 'townhouse') {
      const bedrooms = toNumber('houseBedrooms', 3);
      const storeys = toNumber('houseStoreys', 1);
      firstClean += Math.max(0, bedrooms - modifiers.includedBedrooms) * modifiers.extraBedroomFirstClean;
      recurring += Math.max(0, bedrooms - modifiers.includedBedrooms) * modifiers.extraBedroomRecurring;
      firstClean += Math.max(0, storeys - 1) * modifiers.extraStoreyFirstClean;
      recurring += Math.max(0, storeys - 1) * modifiers.extraStoreyRecurring;

      if (yes('housePool') && !checked('removePoolService')) {
        firstClean += modifiers.poolFirstClean;
        recurring += modifiers.poolRecurring;
      }
      if (yes('houseBalcony')) {
        firstClean += 75;
        recurring += 50;
      }
      if (yes('houseOutdoor')) {
        firstClean += 75;
        recurring += 55;
      }
      if (yes('houseGarage')) {
        firstClean += 55;
        recurring += 35;
      }
    }

    if (type === 'apartment' || type === 'highrise') {
      const bedrooms = toNumber('apartmentBedrooms', 2);
      firstClean -= modifiers.apartmentBaseDiscountFirstClean;
      recurring -= modifiers.apartmentBaseDiscountRecurring;
      firstClean += Math.max(0, bedrooms - 2) * 60;
      recurring += Math.max(0, bedrooms - 2) * 40;

      if (yes('apartmentStairsOnly')) {
        firstClean += modifiers.controlledAccessFirstClean;
        recurring += modifiers.controlledAccessRecurring;
      }

      if (yes('accessibleBalconyGlass')) {
        const panels = toNumber('balconyPanels', 0);
        const doors = toNumber('glassDoors', 0);
        const extraPanels = Math.max(0, panels - modifiers.balconyIncludedPanels);
        firstClean += modifiers.balconyAddOnBaseFirstClean + extraPanels * modifiers.extraBalconyPanelFirstClean + doors * modifiers.glassDoorFirstClean;
        recurring += modifiers.balconyAddOnBaseRecurring + extraPanels * modifiers.extraBalconyPanelRecurring + doors * modifiers.glassDoorRecurring;
        notes.push(`Balcony glass: ${modifiers.balconyIncludedPanels} panels included, ${extraPanels} extra panel(s), ${doors} glass door(s).`);
      }

      if (type === 'highrise') {
        notes.push('High-rise service is interior plus safely accessible balcony glass only. No rope access or suspended external work.');
      }
    }

    if (type === 'strata' || type === 'commercial') {
      const units = toNumber('strataUnits', 4);
      const floors = toNumber('strataFloors', 2);
      const size = value('strataAreaSize', 'small');
      const access = value('strataAccessComplexity', 'easy');

      firstClean += Math.max(0, units - modifiers.strataUnitBaseIncluded) * modifiers.extraStrataUnitFirstClean;
      recurring += Math.max(0, units - modifiers.strataUnitBaseIncluded) * modifiers.extraStrataUnitRecurring;
      firstClean += Math.max(0, floors - modifiers.strataFloorBaseIncluded) * modifiers.extraStrataFloorFirstClean;
      recurring += Math.max(0, floors - modifiers.strataFloorBaseIncluded) * modifiers.extraStrataFloorRecurring;

      if (size === 'medium') {
        firstClean += modifiers.commonAreaMediumFirstClean;
        recurring += modifiers.commonAreaMediumRecurring;
      }
      if (size === 'large') {
        firstClean += modifiers.commonAreaLargeFirstClean;
        recurring += modifiers.commonAreaLargeRecurring;
      }
      if (access === 'controlled') {
        firstClean += modifiers.controlledAccessFirstClean;
        recurring += modifiers.controlledAccessRecurring;
      }
      if (access === 'difficult') {
        firstClean += modifiers.difficultAccessFirstClean;
        recurring += modifiers.difficultAccessRecurring;
      }
      if (yes('strataBookingRequired')) {
        firstClean += modifiers.controlledAccessFirstClean;
        recurring += modifiers.controlledAccessRecurring;
      }
      notes.push('Strata and commercial service is limited to accessible shared/common areas unless otherwise approved.');
    }

    return { firstClean, recurring, notes };
  }

  function serviceAdjustments(type, selected) {
    let firstClean = 0;
    let recurring = 0;
    const notes = [];

    selected.forEach((item) => {
      if (type === 'highrise' && item.serviceId === 'exterior-windows') {
        notes.push('Exterior high-rise windows excluded from pricing. Select balcony glass for safe accessible balcony areas only.');
        return;
      }
      if (checked('removePoolService') && item.serviceId === 'pool-cleaning') {
        notes.push('Pool service removed from selected allocation.');
        return;
      }
      firstClean += item.firstAdd;
      recurring += item.recurringAdd;
    });

    return { firstClean, recurring, notes };
  }

  function addOnAdjustments() {
    const modifiers = pricingConfig.modifiers;
    let firstClean = 0;
    let recurring = 0;
    const notes = [];

    if (checked('extraGeneralClean')) {
      firstClean += modifiers.extraGeneralCleanFirstClean;
      recurring += modifiers.extraGeneralCleanRecurring;
      notes.push('Extra general clean added.');
    }
    if (checked('priorityResponse')) {
      recurring += modifiers.priorityResponseRecurring;
      notes.push('Priority response access added.');
    }
    if (checked('eventReadyClean')) {
      recurring += modifiers.eventReadyRecurring;
      notes.push('Event-ready cleaning allocation added.');
    }
    if (checked('deepRotation')) {
      recurring += modifiers.deepRotationRecurring;
      notes.push('Seasonal deep-clean rotation added.');
    }
    if (checked('swapPoolGeneral')) notes.push('Pool service swap requested for extra general cleaning.');
    if (checked('swapPoolWindows')) notes.push('Pool service swap requested for extra windows/balcony glass.');
    if (checked('customSwap')) notes.push('Custom swap discussion requested.');

    return { firstClean, recurring, notes };
  }

  function accessAdjustments() {
    const modifiers = pricingConfig.modifiers;
    let firstClean = 0;
    let recurring = 0;
    const parkingType = value('parkingType', 'driveway');
    const difficulty = value('accessDifficulty', 'easy');

    if (parkingType === 'none') {
      firstClean += modifiers.noReliableParkingFirstClean;
      recurring += modifiers.noReliableParkingRecurring;
    }
    if (difficulty === 'limited') {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (difficulty === 'difficult') {
      firstClean += modifiers.difficultAccessFirstClean;
      recurring += modifiers.difficultAccessRecurring;
    }
    if (yes('gateAccess') || yes('keyPickup') || yes('accessCode') || yes('restrictedHours') || yes('bodyCorporateBooking')) {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (yes('logisticsStairsOnly')) {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (value('waterSource') === 'none' || value('powerAccess') === 'none' || value('safeEquipmentAccess') === 'review') {
      firstClean += 60;
      recurring += 40;
    }
    if (value('safeEquipmentAccess') === 'no') {
      firstClean += modifiers.difficultAccessFirstClean;
      recurring += modifiers.difficultAccessRecurring;
    }

    return { firstClean, recurring };
  }

  function conditionAdjustments() {
    const modifiers = pricingConfig.modifiers;
    const condition = value('conditionLevel', 'standard');
    if (condition === 'heavy') return { firstClean: modifiers.heavyConditionFirstClean, recurring: 0, complexity: 2 };
    if (condition === 'firstProfessional') return { firstClean: modifiers.firstProfessionalCleanFirstClean, recurring: 0, complexity: 3 };
    if (condition === 'unknown') return { firstClean: 150, recurring: 0, complexity: 2 };
    if (condition === 'standard') return { firstClean: 75, recurring: 0, complexity: 1 };
    return { firstClean: 0, recurring: 0, complexity: 0 };
  }

  function workerStructure(planData, type, serviceCount, conditionComplexity, recurring) {
    const preference = value('teamPreference', 'auto');
    let workers = planData.workerCount;
    if (preference === '1') workers = 1;
    if (preference === '2') workers = 2;
    if (preference === 'auto' && (type === 'strata' || type === 'commercial' || recurring >= 850 || serviceCount >= 6 || conditionComplexity >= 2)) {
      workers = 2;
    }

    const visitDuration = Math.max(1.6, planData.visitHours + serviceCount * 0.28 + conditionComplexity * 0.35 + (type === 'strata' || type === 'commercial' ? 0.7 : 0));
    const monthlyLabour = visitDuration * planData.visitsPerMonth * workers;
    return { workers, workerText: `${workers} worker${workers > 1 ? 's' : ''}`, visits: planData.visits, visitDuration, monthlyLabour };
  }

  function calculatePricing() {
    const selectedPlan = plan();
    const type = selectedPropertyType();
    const services = selectedServices();
    const property = propertyAdjustments(type);
    const serviceTotals = serviceAdjustments(type, services);
    const addOns = addOnAdjustments();
    const access = accessAdjustments();
    const condition = conditionAdjustments();

    let firstClean = selectedPlan.firstClean + property.firstClean + serviceTotals.firstClean + addOns.firstClean + access.firstClean + condition.firstClean;
    let recurring = selectedPlan.recurring + property.recurring + serviceTotals.recurring + addOns.recurring + access.recurring + condition.recurring;

    if (value('teamPreference') === '2' && selectedPlan.workerCount < 2) {
      firstClean += 140;
      recurring += 120;
    }

    firstClean = Math.max(250, Math.round(firstClean));
    recurring = Math.max(190, Math.round(recurring));
    const annualRecurring = recurring * 12;
    const worker = workerStructure(selectedPlan, type, services.length, condition.complexity, recurring);

    return {
      selectedPlanKey: selectedPlanKey(),
      plan: selectedPlan,
      propertyType: type,
      services,
      notes: property.notes.concat(serviceTotals.notes, addOns.notes),
      firstClean,
      recurring,
      annualRecurring,
      worker,
      gstNote: 'Prices are shown excluding GST. GST is added to calculated values.'
    };
  }

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

  function renderLiveSummary(result) {
    liveFirstClean.textContent = `${formatMoney(result.firstClean)} + GST`;
    liveRecurring.textContent = `${formatMoney(result.recurring)}/month + GST`;
    if (liveAnnual) liveAnnual.textContent = `${formatMoney(result.annualRecurring)}/year + GST`;
    if (stagePriceFirst) stagePriceFirst.textContent = `${formatMoney(result.firstClean)} + GST`;
    if (stagePriceMonthly) stagePriceMonthly.textContent = `${formatMoney(result.recurring)}/month + GST`;

    byId('visitDurationHint').value = `${result.worker.visitDuration.toFixed(1)} hours (calculated)`;
    byId('calculatedFirstClean').value = String(result.firstClean);
    byId('calculatedRecurring').value = String(result.recurring);
    byId('calculatedWorkerStructure').value = `${result.worker.workerText}, ${result.worker.visitDuration.toFixed(1)}h/visit`;
    byId('calculatedMonthlyLabour').value = `${result.worker.monthlyLabour.toFixed(1)} hours/month`;

    const serviceSummary = frequencyLines(result).slice(0, 3).concat(result.notes.slice(0, 2)).join('; ');
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
    byId('resultFirstClean').textContent = `${formatMoney(result.firstClean)} + GST`;
    byId('resultRecurring').textContent = `${formatMoney(result.recurring)}/month + GST`;
    byId('resultAnnual').textContent = `${formatMoney(result.annualRecurring)}/year + GST`;
    byId('resultPlan').textContent = result.plan.label;
    byId('resultPropertyType').textContent = propertyTypeLabel(result.propertyType);
    byId('resultWorkerStructure').textContent = `${result.worker.workerText}, ${result.worker.visitDuration.toFixed(1)}h per visit, ${result.worker.monthlyLabour.toFixed(1)}h/month`;
    byId('resultAccessSummary').textContent = buildAccessSummary();
    byId('resultServices').innerHTML = frequencyLines(result).concat(result.notes).map((line) => `<li>${line}</li>`).join('');
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

    updateAll();
  });

  form.addEventListener('input', updateAll);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = calculatePricing();
    renderLiveSummary(result);
    renderFinalSummary(result);

    if (!validateForm()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending Subscription Request...';
    }

    builderMessage.textContent = 'Sending subscription request to the T & A team...';
    builderMessage.className = 'builder-step-note builder-message-success';

    try {
      const payload = buildPayload(result);
      const { uploads, warnings } = await serializeSubscriptionPhotos();
      payload.photoUploads = uploads;
      payload.uploadWarnings = warnings;

      const response = await fetch(SUBSCRIPTION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const apiResult = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(apiResult.error || 'Subscription request could not be submitted.');
      }

      const warningText = warnings.length ? ` ${warnings.join(' ')}` : '';
      builderMessage.textContent = `Subscription request sent to the T & A team. We can now review the exact calculated pricing, access details, selected services and recurring schedule before confirming the first service.${warningText}`;
      builderMessage.className = 'builder-step-note builder-message-success';
    } catch (error) {
      builderMessage.textContent = error instanceof Error ? error.message : 'Subscription request could not be submitted. Please try again or contact the team.';
      builderMessage.className = 'builder-step-note builder-message-error';
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Subscription Request';
      }
    }
  });
})();

(() => {
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
  const FORM_SESSION_STARTED_AT = Date.now();
  const QUALITY_CLASSES = ['quality-high', 'quality-medium', 'quality-low'];
  const JOB_TYPE_CLASSES = ['job-type-standard', 'job-type-moderate', 'job-type-premium-access', 'job-type-large-site'];
  const ACCURACY_CLASSES = ['accuracy-high', 'accuracy-medium', 'accuracy-low'];
  const MAX_UPLOAD_FILES = 5;
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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
    giveawayThresholdMinExGst: 495,
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
      eligibleForGiveaway: estimateMinExGst >= SMART_ESTIMATE_CONFIG.giveawayThresholdMinExGst,
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

    segments.push(`Smart estimate output: ${toText(estimate.estimateLabel)}. Accuracy level: ${toText(estimate.accuracyLevel)}.`);
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

    if (!panel || !rangeNode || !typeNode || !accuracyNode || !noteNode || !reasonsNode) {
      return;
    }

    rangeNode.textContent = String(result.estimateLabel || '$0 - $0 (incl. GST)');
    typeNode.textContent = String(result.estimatedJobType || 'Standard');
    accuracyNode.textContent = `Accuracy Level: ${toText(result.accuracyLevel || 'Medium')}`;
    noteNode.textContent = String(result.estimateGuidance || 'Final pricing confirmed after site inspection.');

    applyJobTypeBadge(typeNode, result.estimatedJobType);
    applyAccuracyBadge(accuracyNode, result.accuracyLevel);

    reasonsNode.innerHTML = '';
    (Array.isArray(result.estimateReasons) ? result.estimateReasons : []).slice(0, 5).forEach((reason) => {
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

    if (!panel || !rangeNode || !typeNode || !accuracyNode || !noteNode || !reasonsNode || !summaryNode || !qualityNode || !giveawayNode) {
      return;
    }

    rangeNode.textContent = String(result.estimateLabel || '$0 - $0 (incl. GST)');

    const jobTypeText = String(result.estimatedJobType || 'Standard');
    typeNode.textContent = `Estimated Job Type: ${jobTypeText}`;
    applyJobTypeBadge(typeNode, jobTypeText);

    const accuracyText = String(result.accuracyLevel || 'Medium');
    accuracyNode.textContent = `Accuracy Level: ${accuracyText}`;
    applyAccuracyBadge(accuracyNode, accuracyText);

    noteNode.textContent = String(result.estimateGuidance || 'Final pricing confirmed after site inspection.');

    reasonsNode.innerHTML = '';
    const reasons = Array.isArray(result.estimateReasons) && result.estimateReasons.length
      ? result.estimateReasons
      : ['Service type and property details were used to generate this estimate.'];

    reasons.forEach((reason) => {
      const item = document.createElement('li');
      item.textContent = String(reason);
      reasonsNode.appendChild(item);
    });

    summaryNode.textContent = String(result.aiSummary || 'AI summary unavailable.');

    const qualityRaw = String(result.leadQuality || 'medium').toLowerCase();
    qualityNode.classList.remove(...QUALITY_CLASSES);
    qualityNode.classList.add(`quality-${qualityRaw}`);
    qualityNode.textContent = `Lead Quality: ${toTitleCase(qualityRaw)}`;

    if (result.eligibleForGiveaway) {
      giveawayNode.textContent = 'This booking may qualify for the giveaway.';
    } else {
      giveawayNode.textContent = 'This booking is currently below giveaway eligibility.';
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
      });
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
      address: toText(formData.get('address')),
      service: toText(formData.get('service')),
      propertyType: toText(formData.get('propertyType')),
      storeys: toText(formData.get('storeys')),
      rooms: toText(formData.get('rooms')),
      serviceArea: toText(formData.get('serviceArea')),
      accessDifficulty: toText(formData.get('accessDifficulty')),
      conditionLevel: toText(formData.get('conditionLevel')),
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
        commandCentre: 'T & A Command Centre',
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

    document.querySelectorAll('[data-entry-count]').forEach((node) => {
      const text = toText(node.textContent);
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) {
        return;
      }

      const current = Number(match[1]);
      const threshold = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(threshold)) {
        return;
      }

      const nextCount = Math.min(threshold, current + 1);
      node.textContent = `${nextCount} / ${threshold} eligible entries`;
    });
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

    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', queuePreview, { passive: true });
      field.addEventListener('change', queuePreview, { passive: true });
    });
  }

  function setupQuoteForm() {
    const form = document.getElementById('quoteForm');
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    hideEstimatePreview();
    setupImproveDescriptionButton(form);

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
        button.textContent = 'Calculating...';
      }

      setFormMessage('Generating your high-accuracy smart estimate...', 'info');

      try {
        const payload = await buildPayload(form);
        if (payload.uploadWarnings.length) {
          updateUploadNote(payload.uploadWarnings.join(' '), 'error');
        }

        const localResult = buildLocalResult(payload);

        const response = await fetch(`${API_BASE}/api/leads`, {
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
        setFormMessage('Estimate generated and sent to T & A Command Centre + email queue.', 'success');
        bumpGiveawayCounterIfEligible(mergedResult.eligibleForGiveaway);
        await loadStats();
      } catch (error) {
        const fallbackPayload = buildBasePayload(form);
        const fallbackResult = buildLocalResult(fallbackPayload);
        renderQuoteResult(fallbackResult);
        bumpGiveawayCounterIfEligible(fallbackResult.eligibleForGiveaway);

        const message = error instanceof Error
          ? `${error.message} Showing local Smart Estimate preview while live submission reconnects.`
          : 'Something went wrong while submitting the form. Showing local Smart Estimate preview.';
        setFormMessage(message, 'error');
      } finally {
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          button.textContent = 'Get a Free Quote';
        }
      }
    });
  }

  function buildImprovedDescription(payload) {
    const lines = [];
    lines.push(`${payload.propertyType} property requiring ${payload.service.toLowerCase()} across ${payload.serviceArea.toLowerCase()} areas.`);
    lines.push(`Site profile: ${payload.storeys} storey, ${payload.rooms} rooms, ${payload.accessDifficulty.toLowerCase()} access, ${payload.conditionLevel.toLowerCase()} condition.`);

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
      lines.push(`Additional notes: ${payload.notes.replace(/\s+/g, ' ').trim()}.`);
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
      setFormMessage('Description improved and added to notes.', 'success');
    });
  }

  async function loadStats() {
    const countNodes = document.querySelectorAll('[data-entry-count]');
    const statusNodes = document.querySelectorAll('[data-unlock-status]');

    if (!countNodes.length && !statusNodes.length) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/stats`);
      if (!response.ok) {
        throw new Error('Stats unavailable');
      }

      const stats = await response.json();
      const entries = Number(stats.giveawayEntries || 0);
      const started = Boolean(stats.giveawayStarted);
      const unlocked = Boolean(stats.giveawayUnlocked);
      const threshold = Number(stats.giveawayThreshold || 50);
      const remaining = Math.max(0, threshold - entries);

      countNodes.forEach((node) => {
        node.textContent = `${entries} / ${threshold} eligible entries`;
      });

      statusNodes.forEach((node) => {
        if (!started) {
          node.textContent = `Giveaway starts May 1 at 10:00am. ${remaining} more eligible entries needed to unlock.`;
          return;
        }

        if (unlocked) {
          node.textContent = 'Giveaway is active now and accepting unlocked entries.';
          return;
        }

        node.textContent = `Giveaway is open. ${remaining} more eligible entries needed to activate.`;
      });
    } catch {
      countNodes.forEach((node) => {
        node.textContent = 'Live giveaway count unavailable';
      });
      statusNodes.forEach((node) => {
        node.textContent = 'Please refresh later or call us for updates.';
      });
    }
  }

  function init() {
    setCurrentYear();
    setupMobileNav();
    setupRevealAnimations();
    setupHeroAmbientMotion();
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

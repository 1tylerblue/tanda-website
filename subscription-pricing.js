(function(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./money.js') : root.TAMoney);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TASubscriptionPricing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Money) {
  'use strict';
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


  const FIELD_IDS = ['accessCode', 'accessDifficulty', 'accessibleBalconyGlass', 'apartmentBedrooms', 'apartmentStairsOnly', 'balconyPanels', 'bodyCorporateBooking', 'conditionLevel', 'customSwap', 'deepRotation', 'eventReadyClean', 'extraGeneralClean', 'gateAccess', 'glassDoors', 'houseBalcony', 'houseBedrooms', 'houseGarage', 'houseOutdoor', 'housePool', 'houseStoreys', 'keyPickup', 'logisticsStairsOnly', 'parkingType', 'powerAccess', 'priorityResponse', 'removePoolService', 'restrictedHours', 'safeEquipmentAccess', 'strataAccessComplexity', 'strataAreaSize', 'strataBookingRequired', 'strataFloors', 'strataUnits', 'swapPoolGeneral', 'swapPoolWindows', 'teamPreference', 'waterSource'];
  const CHOICES = {"preferredContact":["Phone","Email","SMS"],"housePool":["no","yes"],"houseBalcony":["no","yes"],"houseDriveway":["yes","no"],"houseOutdoor":["no","yes"],"houseGarage":["no","yes"],"housePets":["no","yes"],"apartmentLiftAccess":["yes","no"],"apartmentStairsOnly":["no","yes"],"apartmentBalcony":["yes","no"],"interiorOnlyWindows":["yes","no"],"accessibleBalconyGlass":["yes","no"],"strataAreaSize":["small","medium","large"],"strataInternalCommon":["yes","no"],"strataExternalCommon":["yes","no"],"strataBinArea":["yes","no"],"strataStairwells":["yes","no"],"strataLobbies":["yes","no"],"strataCarparkArea":["no","yes"],"strataSharedGlass":["yes","no"],"strataSharedWindows":["yes","no"],"strataAccessComplexity":["easy","controlled","difficult"],"strataBookingRequired":["no","yes"],"parkingType":["driveway","street","visitor","underground","none"],"accessDifficulty":["easy","limited","difficult"],"heightClearance":["none","under2_2","over2_2"],"gateAccess":["no","yes"],"keyPickup":["no","yes"],"accessCode":["no","yes"],"restrictedHours":["no","yes"],"logisticsLiftAccess":["yes","no"],"logisticsStairsOnly":["no","yes"],"bodyCorporateBooking":["no","yes"],"petsOnProperty":["no","yes"],"waterSource":["available","limited","none"],"powerAccess":["available","limited","none"],"safeEquipmentAccess":["yes","review","no"],"teamPreference":["auto","1","2"],"conditionLevel":["light","standard","heavy","firstProfessional","unknown"],"lastProfessionalClean":["lt3","3to6","6to12","gt12","unknown"],"preferredDay":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"preferredTimeWindow":["Early (7-9)","Morning (8-11)","Late Morning (10-1)","Afternoon (1-4)"],"fixedRecurringDay":["yes","no"],"serviceWhileAway":["yes","no"],"urgency":["Flexible","This week","Next week","Urgent","Event / birthday / guests"],"paymentMethod":["Card","Bank transfer","Discuss with me"],"billingPreference":["Invoice at start of month","Invoice after first visit each month","Split invoicing for larger scopes"],"autoDebitConsent":["no","yes"]};
  function calculatePricing(input = {}) {
    const pricingConfig = SUBSCRIPTION_PRICING_CONFIG;
    if (!Object.hasOwn(pricingConfig.plans, input.planKey)) throw new Error('Choose a valid subscription plan.');
    if (!['house','townhouse','apartment','highrise','strata','commercial'].includes(input.propertyType)) throw new Error('Choose a valid property type.');
    if (input.promoCode || input.couponCode) throw new Error('Promotional codes cannot be combined with this campaign.');
    const fields = { ...(input.fields || {}) };
    const apartmentOnly = ['apartmentBedrooms','apartmentStairsOnly','accessibleBalconyGlass','balconyPanels','glassDoors'];
    for (const id of FIELD_IDS) {
      const relevant = id.startsWith('house') ? ['house','townhouse'].includes(input.propertyType) : id.startsWith('strata') ? ['strata','commercial'].includes(input.propertyType) : apartmentOnly.includes(id) ? ['apartment','highrise'].includes(input.propertyType) : true;
      if (!relevant) { delete fields[id]; continue; }
      if (Object.hasOwn(fields,id) && CHOICES[id] && !CHOICES[id].includes(fields[id])) throw new Error('Choose a valid option for ' + id + '.');
    }
    const value = (id, fallback = '') => fields[id] ?? fallback;
    const checked = id => fields[id] === true;
    const yes = id => value(id) === 'yes';
    const reviewReasons = [];
    const review = message => { if (!reviewReasons.includes(message)) reviewReasons.push(message); };
    const poolRemoved = () => checked('removePoolService') || checked('swapPoolGeneral') || checked('swapPoolWindows');
    const toNumber = (id, fallback = 0) => {
      const n = Number(value(id, fallback));
      if (!Number.isInteger(n) || n > 10000) throw new Error('Enter a whole quantity from 0 to 10000 for ' + id + '.');
      return Math.max(0, n);
    };
    const selectedPlanKey = () => input.planKey;
    const plan = () => pricingConfig.plans[input.planKey];
    const selectedPropertyType = () => input.propertyType;
    const services = input.services === undefined ? Object.entries(plan().defaults).map(([serviceId, frequency]) => ({serviceId, frequency})) : input.services;
    if (!Array.isArray(services) || services.length > pricingConfig.services.length) throw new Error('Invalid service selection.');
    const seen = new Set();
    const selectedServices = () => services.map(item => {
      const service = pricingConfig.services.find(service => service.id === item.serviceId);
      if (!service || !Object.hasOwn(service.monthly, item.frequency)) throw new Error('Invalid subscription service or frequency.');
      return { serviceId: service.id, serviceName: service.label, frequency: item.frequency, included: true, notes: String(item.notes || '').slice(0,500) };
    }).filter(item => {
      if (input.propertyType === 'highrise' && item.serviceId === 'exterior-windows') return false;
      if (poolRemoved() && item.serviceId === 'pool-cleaning') return false;
      if (['apartment','highrise'].includes(input.propertyType) && item.serviceId === 'balcony-glass' && toNumber('balconyPanels') <= 0 && toNumber('glassDoors') <= 0) {
        review('Balcony glass was selected without a positive panel or door quantity. No balcony quantity charge is included; confirm the quantity.');
        return false;
      }
      return true;
    });
    services.forEach(item => { if (!item || seen.has(item.serviceId)) throw new Error('Invalid or duplicate subscription service.'); seen.add(item.serviceId); });
    const missingIncluded = Object.keys(plan().defaults).filter(id => !selectedServices().some(item => item.serviceId === id));
    if (missingIncluded.length) review('Included package services have been removed or excluded. Package base remains unchanged pending a reviewed scope or credit.');
    if (checked('swapPoolGeneral') || checked('swapPoolWindows') || checked('customSwap')) review('Service swap requested: the replacement scope and any price adjustment require confirmation.');
    if (value('teamPreference') === '1' && plan().workerCount > 1) review('A one-worker preference changes the package staffing. Scope, duration and any price adjustment require confirmation.');
    if (input.propertyType === 'highrise') review('High-rise work is limited to interior and safely accessible balcony glass. Access and included scope require confirmation; no rope-only work.');
  function propertyAdjustments(type) {
    const modifiers = pricingConfig.modifiers;
    let firstClean = 0;
    let recurring = 0;
    const notes = [];

    if (type === 'house' || type === 'townhouse') {
      const bedrooms = toNumber('houseBedrooms', 3);
      const storeys = toNumber('houseStoreys', 1);
      if (!bedrooms || !storeys) review('Confirm the house bedroom and storey quantities before accepting this price.');
      notes.push(`House: ${bedrooms} bedrooms (${Math.max(0, bedrooms - modifiers.includedBedrooms)} additional), ${storeys} storeys (${Math.max(0, storeys - 1)} additional).`);
      firstClean += Math.max(0, bedrooms - modifiers.includedBedrooms) * modifiers.extraBedroomFirstClean;
      recurring += Math.max(0, bedrooms - modifiers.includedBedrooms) * modifiers.extraBedroomRecurring;
      firstClean += Math.max(0, storeys - 1) * modifiers.extraStoreyFirstClean;
      recurring += Math.max(0, storeys - 1) * modifiers.extraStoreyRecurring;

      if (yes('housePool') && !poolRemoved() && !selectedServices().some(item => item.serviceId === 'pool-cleaning')) {
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
      if (!bedrooms) review('Confirm the apartment bedroom quantity before accepting this price.');
      notes.push(`Apartment allowance: $${modifiers.apartmentBaseDiscountFirstClean} first-clean / $${modifiers.apartmentBaseDiscountRecurring} monthly reduction before discount and GST; ${Math.max(0, bedrooms - 2)} additional bedroom(s).`);
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
        if (panels > 0 || doors > 0) {
          firstClean += modifiers.balconyAddOnBaseFirstClean + extraPanels * modifiers.extraBalconyPanelFirstClean + doors * modifiers.glassDoorFirstClean;
          recurring += modifiers.balconyAddOnBaseRecurring + extraPanels * modifiers.extraBalconyPanelRecurring + doors * modifiers.glassDoorRecurring;
          notes.push(`Balcony glass: ${panels} selected panel(s), up to ${modifiers.balconyIncludedPanels} included in the allowance, ${extraPanels} extra panel(s), ${doors} glass door(s).`);
        } else {
          review('Balcony glass was selected without a positive panel or door quantity. No balcony quantity charge is included; confirm the quantity.');
        }
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
      if (!units || !floors) review('Confirm strata/commercial unit and floor quantities before accepting this price.');
      notes.push(`Shared property: ${units} units, ${floors} floors, ${size} common area, ${access} access.`);

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
      const includedFrequency = plan().defaults[item.serviceId];
      const catalogue = pricingConfig.services.find(service => service.id === item.serviceId);
      const includedMonthly = includedFrequency ? catalogue.monthly[includedFrequency] : 0;
      const balconyAllowance = item.serviceId === 'balcony-glass' && (
        (['apartment','highrise'].includes(type) && yes('accessibleBalconyGlass') && (toNumber('balconyPanels') > 0 || toNumber('glassDoors') > 0)) ||
        (['house','townhouse'].includes(type) && yes('houseBalcony'))
      );
      const firstAdd = includedFrequency || balconyAllowance ? 0 : catalogue.firstAdd;
      const monthlyAdd = Math.max(0, catalogue.monthly[item.frequency] - (includedMonthly || (balconyAllowance ? pricingConfig.modifiers.balconyAddOnBaseRecurring : 0)));
      firstClean += firstAdd;
      recurring += monthlyAdd;
      notes.push(`${item.serviceName} (${item.frequency}): ${includedFrequency ? 'package inclusion; ' : balconyAllowance ? 'balcony allowance counted once; ' : ''}additional $${firstAdd} first / $${monthlyAdd} monthly before discount and GST.`);
      if (includedFrequency && catalogue.monthly[item.frequency] < includedMonthly) review('An included service frequency was reduced. Package base remains unchanged pending review.');
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
    if (checked('priorityResponse') && !selectedServices().some(item => item.serviceId === 'priority-response-clean')) {
      recurring += modifiers.priorityResponseRecurring;
      notes.push('Priority response access added.');
    }
    if (checked('eventReadyClean') && !selectedServices().some(item => item.serviceId === 'event-ready-clean')) {
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
    if (difficulty === 'limited' && !(['strata','commercial'].includes(selectedPropertyType()) && ['controlled','difficult'].includes(value('strataAccessComplexity')))) {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (difficulty === 'difficult' && !(['strata','commercial'].includes(selectedPropertyType()) && value('strataAccessComplexity') === 'difficult')) {
      const controlledAlreadyIncluded = ['strata','commercial'].includes(selectedPropertyType()) && value('strataAccessComplexity') === 'controlled';
      firstClean += modifiers.difficultAccessFirstClean - (controlledAlreadyIncluded ? modifiers.controlledAccessFirstClean : 0);
      recurring += modifiers.difficultAccessRecurring - (controlledAlreadyIncluded ? modifiers.controlledAccessRecurring : 0);
    }
    if ((yes('gateAccess') || yes('keyPickup') || yes('accessCode') || yes('restrictedHours') || yes('bodyCorporateBooking')) && !(['strata','commercial'].includes(selectedPropertyType()) && yes('strataBookingRequired'))) {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (yes('logisticsStairsOnly') && !(['apartment','highrise'].includes(selectedPropertyType()) && yes('apartmentStairsOnly'))) {
      firstClean += modifiers.controlledAccessFirstClean;
      recurring += modifiers.controlledAccessRecurring;
    }
    if (value('waterSource') === 'none' || value('powerAccess') === 'none' || ['review','no'].includes(value('safeEquipmentAccess'))) review('Water, power or safe equipment access requires confirmation. No speculative access surcharge has been added for this uncertainty.');

    return { firstClean, recurring };
  }

  function conditionAdjustments() {
    const modifiers = pricingConfig.modifiers;
    const condition = value('conditionLevel', 'standard');
    if (condition === 'heavy') return { firstClean: modifiers.heavyConditionFirstClean, recurring: 0, complexity: 2 };
    if (condition === 'firstProfessional') return { firstClean: modifiers.firstProfessionalCleanFirstClean, recurring: 0, complexity: 3 };
    if (condition === 'unknown') { review('Property condition is unknown. First-clean condition charges require review; no assumed condition surcharge is included.'); return { firstClean: 0, recurring: 0, complexity: 2 }; }
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

  function calculate() {
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

    const extraWorker = value('teamPreference') === '2' && selectedPlan.workerCount < 2;
    if (extraWorker) {
      firstClean += 140;
      recurring += 120;
    }

    const adjustments = [
      { label: `${selectedPlan.label} package base (included service frequencies counted once)`, firstClean: selectedPlan.firstClean, recurring: selectedPlan.recurring },
      { label: 'Property / size / balcony adjustments', ...property },
      { label: 'Additional services / frequency upgrades', ...serviceTotals },
      { label: 'Additional plan options', ...addOns },
      { label: 'Confirmed access / parking adjustments', ...access },
      { label: `First-clean condition: ${value('conditionLevel', 'standard')}`, ...condition },
      { label: 'Explicit additional worker', firstClean: extraWorker ? 140 : 0, recurring: extraWorker ? 120 : 0 },
      { label: 'Minimum adjustment', firstClean: Math.max(0, 250 - firstClean), recurring: Math.max(0, 190 - recurring) }
    ].filter(row => row.firstClean !== 0 || row.recurring !== 0);
    firstClean = Math.max(250, Math.round(firstClean));
    recurring = Math.max(190, Math.round(recurring));
    const worker = workerStructure(selectedPlan, type, services.length, condition.complexity, recurring);
    const firstBreakdown = Money.promotion(Money.toCents(firstClean), 'subscription');
    const recurringBreakdown = Money.promotion(Money.toCents(recurring), 'subscription');
    firstClean = firstBreakdown.subtotalExGst;
    recurring = recurringBreakdown.subtotalExGst;
    const annualRecurring = recurringBreakdown.subtotalExGstCents * 12 / 100;
    const annualRecurringIncGstCents = recurringBreakdown.totalIncGstCents * 12;

    return {
      selectedPlanKey: selectedPlanKey(),
      plan: selectedPlan,
      propertyType: type,
      services,
      notes: property.notes.concat(serviceTotals.notes, addOns.notes),
      pricingVersion: 'T&A-SUBSCRIPTION-2026-09-23',
      adjustments,
      requiresReview: reviewReasons.length > 0,
      reviewReasons,
      firstBreakdown, recurringBreakdown,
      firstClean,
      recurring,
      annualRecurring,
      annualRecurringIncGstCents,
      annualRecurringIncGst: annualRecurringIncGstCents / 100,
      annualGst: recurringBreakdown.gstCents * 12 / 100,
      worker,
      gstNote: '10% subscription discount applied once before GST. Totals labelled incl GST include GST exactly once. The general 25% service promotion does not apply to subscriptions. Annual recurring is 12 discounted monthly payments and excludes the first clean.'
    };
  }


    return calculate();
  }
  return { config: SUBSCRIPTION_PRICING_CONFIG, FIELD_IDS, calculatePricing };
});

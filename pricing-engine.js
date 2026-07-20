(function initTAPricing(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TAPricing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTAPricing() {
  'use strict';

  const item = (code, label, unit, rate, minimum = 0, options = {}) => ({
    code,
    label,
    unit,
    rate,
    minimum,
    mode: 'unit',
    ...options,
  });

  const fixed = (code, label, rate, options = {}) => item(code, label, 'properties', rate, 0, { mode: 'fixed', ...options });

  const PRICING_CONFIG = {
    version: 'T&A-MASTER-2026-07-11',
    gstRate: 0.1,
    currency: 'AUD',
    groups: [
      {
        id: 'window-cleaning', label: 'Window Cleaning', items: [
          fixed('window_package_single', 'Single-storey complete window package', 450),
          fixed('window_package_double', 'Double-storey complete window package', 650),
          fixed('window_package_complex', 'Three-storey or complex property', 0, { manual: true, requiresPhotos: true }),
          item('window_standard_exterior', 'Standard window exterior', 'windows', 11, 180),
          item('window_standard_interior', 'Standard window interior', 'windows', 11, 180),
          item('window_standard_both', 'Standard window interior and exterior', 'windows', 19, 220),
          item('window_large_exterior', 'Large window exterior', 'glass-panels', 16, 180),
          item('window_large_interior', 'Large window interior', 'glass-panels', 16, 180),
          item('window_large_both', 'Large window interior and exterior', 'glass-panels', 28, 220),
          item('window_sliding_door_both', 'Sliding glass door, both sides', 'door-sets', 42, 220),
          item('window_stacker_bifold', 'Stacker or bi-fold glass door', 'glass-panels', 30, 220),
          item('window_louvre', 'Louvre window', 'windows', 35, 180),
          item('window_double_hung', 'Double-hung window', 'windows', 26, 180),
          item('window_colonial_surcharge', 'Colonial/French pane surcharge', 'small-panes', 2.75, 0, { addonOnly: true }),
          item('window_skylight_exterior', 'Exterior skylight', 'skylights', 30, 180),
          item('window_skylight_both', 'Interior and exterior skylight', 'skylights', 55, 220),
          item('window_flyscreen', 'Standard flyscreen wash', 'screens', 8, 0, { addonOnly: true }),
          item('window_screen_door', 'Screen-door wash', 'doors', 15, 0, { addonOnly: true }),
          item('window_deep_track', 'Deep window or door-track cleaning', 'tracks', 14, 0, { addonOnly: true }),
          item('window_balustrade', 'Glass balustrade or pool fence', 'glass-panels', 14, 180),
          item('glass_hard_water', 'Hard-water stain treatment', 'square-metres', 35, 150, { requiresPhotos: true, removalDisclaimer: true }),
          item('glass_builders', 'Builders-clean glass', 'square-metres', 18, 450, { requiresPhotos: true }),
          item('glass_concrete_render', 'Concrete or render removal', 'square-metres', 45, 250, { requiresPhotos: true, removalDisclaimer: true }),
          item('glass_adhesive', 'Sticker or adhesive removal', 'items', 8, 0, { addonOnly: true }),
          item('glass_shopfront', 'Commercial shopfront maintenance', 'square-metres', 7.5, 150),
          item('glass_partitions', 'Interior glass partitions', 'square-metres', 6.5, 150),
        ],
      },
      {
        id: 'pressure-cleaning', label: 'Pressure Cleaning', items: [
          item('pressure_concrete', 'Concrete pressure cleaning', 'square-metres', 0, 250, { mode: 'tiered-rate', tiers: [{ max: 50, rate: 7 }, { max: 100, rate: 6.5 }, { max: 250, rate: 5.5 }, { max: null, rate: 4.75 }] }),
          item('pressure_pavers', 'Pavers', 'square-metres', 7.5, 275),
          item('pressure_outdoor_tiles', 'Outdoor tiles or pool surrounds', 'square-metres', 8.5, 275),
          item('pressure_exterior_walls', 'Exterior walls', 'square-metres', 9, 300),
          item('pressure_retaining_walls', 'Retaining walls', 'square-metres', 11, 300),
          item('pressure_commercial_carpark', 'Commercial carpark or forecourt', 'square-metres', 4.5, 650),
          item('pressure_bin_pad', 'Bin pad or greasy service area', 'square-metres', 12, 250),
          item('pressure_sports_court', 'Tennis or sports court', 'square-metres', 5.5, 1200),
          item('pressure_oil_spot', 'Oil-stain treatment', 'spots', 45, 0, { addonOnly: true, removalDisclaimer: true }),
          item('pressure_rust_spot', 'Rust-stain treatment', 'spots', 55, 0, { addonOnly: true, removalDisclaimer: true }),
          item('pressure_gum', 'Chewing-gum removal', 'items', 7, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'house-building-washing', label: 'House and Building Washing', items: [
          fixed('house_wash_single', 'Single-storey house wash', 550),
          fixed('house_wash_double', 'Double-storey house wash', 880),
          fixed('house_wash_three', 'Three-storey house wash', 1250, { manual: true, fromPrice: true, requiresPhotos: true }),
          item('building_walls_single', 'Ground/single-storey exterior walls', 'square-metres', 6.5, 450),
          item('building_walls_double', 'Double-storey exterior walls', 'square-metres', 8.5, 650),
          item('building_eaves', 'Eaves, fascias and soffits only', 'linear-metres', 9, 300),
          item('building_awning', 'Awning or canopy washing', 'square-metres', 12, 250),
          item('building_oxidation', 'Oxidation/chalking cleaning treatment', 'square-metres', 18, 350, { requiresPhotos: true }),
        ],
      },
      {
        id: 'roof-cleaning', label: 'Roof Cleaning', items: [
          item('roof_concrete_single', 'Concrete-tile roof, single storey', 'square-metres', 10.5, 1050, { requiresPhotos: true }),
          item('roof_terracotta_single', 'Terracotta roof, single storey', 'square-metres', 12.8, 1280, { requiresPhotos: true }),
          item('roof_metal_single', 'Metal roof, single storey', 'square-metres', 8.5, 850, { requiresPhotos: true }),
          item('roof_treatment_only', 'Roof treatment only', 'square-metres', 6.5, 650, { requiresPhotos: true }),
          fixed('roof_access_double', 'Double-storey roof access allowance', 250, { addonOnly: true, accessAllowance: true }),
          fixed('roof_access_steep', 'Steep or complex roof allowance', 350, { addonOnly: true, accessAllowance: true, manual: true, requiresPhotos: true }),
          item('roof_solar_setup', 'Solar-panel protection and setup', 'arrays', 75, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'gutter-cleaning', label: 'Gutter Cleaning', items: [
          fixed('gutter_package_single', 'Standard single-storey home', 350),
          fixed('gutter_package_double', 'Standard double-storey home', 495),
          item('gutter_single', 'Single-storey gutters', 'linear-metres', 9, 300),
          item('gutter_double', 'Double-storey gutters', 'linear-metres', 12.5, 450),
          item('gutter_guard', 'Gutter-guard cleaning allowance', 'linear-metres', 8, 150, { addonOnly: true }),
          item('gutter_downpipe', 'Blocked downpipe flush', 'downpipes', 55, 0, { addonOnly: true }),
          item('gutter_brightening', 'Exterior gutter brightening', 'linear-metres', 7, 250, { addonOnly: true }),
          item('gutter_valley', 'Roof-valley debris removal', 'linear-metres', 12, 100, { addonOnly: true }),
        ],
      },
      {
        id: 'solar-panel-cleaning', label: 'Solar-Panel Cleaning', items: [
          item('solar_residential', 'Residential solar-panel system', 'solar-panels', 0, 0, { mode: 'solar-tier' }),
          item('solar_commercial', 'Commercial solar array', 'solar-panels', 8, 450),
          item('solar_bird_treatment', 'Heavy bird-dropping treatment', 'solar-panels', 6, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'carpet-cleaning', label: 'Carpet Cleaning', items: [
          item('carpet_standard_bedroom', 'Standard bedroom up to 14 m2', 'rooms', 35, 120),
          item('carpet_large_room', 'Large bedroom or office, 15-25 m2', 'rooms', 55, 120),
          item('carpet_lounge', 'Lounge/living room up to 30 m2', 'rooms', 70, 120),
          item('carpet_extra_area', 'Area above room allowance', 'square-metres', 4, 0, { addonOnly: true }),
          item('carpet_hallway', 'Hallway', 'linear-metres', 7, 120),
          item('carpet_stairs', 'Carpeted stairs', 'steps', 8, 120),
          item('carpet_landing', 'Stair landing', 'landings', 25, 120),
          item('carpet_rug_small', 'Small rug up to 2 m2', 'rugs', 25, 120),
          item('carpet_rug_medium', 'Medium rug, 2-5 m2', 'rugs', 55, 120),
          item('carpet_rug_large', 'Large rug, 5-9 m2', 'rugs', 90, 120),
          item('carpet_commercial', 'Commercial carpet extraction', 'square-metres', 5.5, 350),
          item('carpet_stain', 'Specialist stain treatment', 'spots', 25, 0, { addonOnly: true, removalDisclaimer: true }),
          item('carpet_odour', 'Pet urine or odour treatment', 'rooms', 45, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'upholstery-cleaning', label: 'Upholstery Cleaning', items: [
          item('upholstery_dining_seat', 'Dining-chair seat only', 'chairs', 25, 120),
          item('upholstery_dining_back', 'Dining-chair seat and upholstered back', 'chairs', 38, 120),
          item('upholstery_office_chair', 'Office chair', 'chairs', 35, 150),
          item('upholstery_armchair', 'Armchair', 'chairs', 75, 120),
          item('upholstery_recliner', 'Recliner', 'chairs', 85, 120),
          item('upholstery_sofa_two', 'Two-seater sofa', 'sofas', 120, 120),
          item('upholstery_sofa_three', 'Three-seater sofa', 'sofas', 150, 120),
          item('upholstery_sofa_four', 'Four-seater sofa', 'sofas', 190, 120),
          item('upholstery_chaise', 'Chaise section', 'sections', 50, 120),
          item('upholstery_modular', 'Modular lounge', 'seats', 55, 120),
          item('upholstery_ottoman', 'Ottoman', 'items', 45, 120),
          item('upholstery_bedhead', 'Fabric bedhead', 'items', 75, 120),
          item('upholstery_stain', 'Specialist stain treatment', 'spots', 25, 0, { addonOnly: true, removalDisclaimer: true }),
          item('upholstery_odour', 'Pet hair or odour treatment', 'seats', 15, 0, { addonOnly: true }),
          item('upholstery_protector', 'Fabric protector', 'seats', 22, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'mattress-cleaning', label: 'Mattress Cleaning', items: [
          item('mattress_cot', 'Cot mattress, both sides', 'mattresses', 70),
          item('mattress_single', 'Single mattress, both sides', 'mattresses', 95),
          item('mattress_king_single', 'King single mattress, both sides', 'mattresses', 110),
          item('mattress_double', 'Double mattress, both sides', 'mattresses', 130),
          item('mattress_queen', 'Queen mattress, both sides', 'mattresses', 150),
          item('mattress_king', 'King mattress, both sides', 'mattresses', 175),
          item('mattress_one_side', 'One-side-only reduction', 'mattresses', -30, 0, { addonOnly: true }),
          item('mattress_odour', 'Urine or odour treatment', 'mattresses', 55, 0, { addonOnly: true }),
          item('mattress_base', 'Upholstered bed base', 'items', 65, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'tile-grout-cleaning', label: 'Tile and Grout Cleaning', items: [
          item('tile_residential_floor', 'Residential tile and grout floor', 'square-metres', 10.5, 350),
          item('tile_wall', 'Bathroom or kitchen wall tiles', 'square-metres', 14, 250),
          item('tile_shower', 'Shower enclosure deep clean', 'showers', 220, 220),
          item('tile_commercial_floor', 'Commercial tile and grout floor', 'square-metres', 9.5, 550),
          item('tile_heavy_soil', 'Heavy grease or soil treatment', 'square-metres', 4, 100, { addonOnly: true }),
        ],
      },
      {
        id: 'hard-floor-cleaning', label: 'Hard-Floor Deep Cleaning', items: [
          item('floor_rubber_gym', 'Rubber gym flooring', 'square-metres', 8.5, 550),
          item('floor_vinyl', 'Vinyl or vinyl-plank flooring', 'square-metres', 7.5, 450),
          item('floor_epoxy', 'Epoxy or sealed concrete', 'square-metres', 7, 450),
          item('floor_non_slip', 'Non-slip commercial flooring', 'square-metres', 10.5, 550),
          item('floor_edges', 'Detailed edges or under-machine cleaning', 'linear-metres', 8, 100, { addonOnly: true }),
        ],
      },
      {
        id: 'residential-deep-cleaning', label: 'Residential Deep Cleaning', items: [
          fixed('deep_1_1', '1 bedroom / 1 bathroom', 420),
          fixed('deep_2_1', '2 bedrooms / 1 bathroom', 550),
          fixed('deep_3_2', '3 bedrooms / 2 bathrooms', 750),
          fixed('deep_4_2', '4 bedrooms / 2 bathrooms', 950),
          fixed('deep_5_3', '5 bedrooms / 3 bathrooms', 1250),
          item('deep_extra_bedroom', 'Additional bedroom', 'rooms', 90, 0, { addonOnly: true }),
          item('deep_extra_bathroom', 'Additional bathroom', 'bathrooms', 125, 0, { addonOnly: true }),
          item('deep_kitchen', 'Kitchen deep clean', 'kitchens', 260, 0, { addonOnly: true }),
          item('deep_oven', 'Oven interior', 'ovens', 120, 0, { addonOnly: true }),
          item('deep_cabinets', 'Cupboard/cabinet interiors', 'doors-drawers', 10, 100, { addonOnly: true }),
          item('deep_walls', 'Interior wall washing', 'square-metres', 7.5, 250, { addonOnly: true }),
          item('deep_appliance', 'Appliance interior/exterior', 'appliances', 55, 0, { addonOnly: true }),
        ],
      },
      {
        id: 'end-of-lease-cleaning', label: 'End-of-Lease Cleaning', items: [
          fixed('eol_1_1', '1 bedroom / 1 bathroom', 480),
          fixed('eol_2_1', '2 bedrooms / 1 bathroom', 620),
          fixed('eol_3_2', '3 bedrooms / 2 bathrooms', 780),
          fixed('eol_4_2', '4 bedrooms / 2 bathrooms', 980),
          fixed('eol_5_3', '5 bedrooms / 3 bathrooms', 1280),
        ],
      },
      {
        id: 'hourly-cleaning', label: 'Hourly Cleaning', items: [
          item('hourly_general', 'General cleaning', 'labour-hours', 65, 195),
          item('hourly_deep', 'Deep cleaning', 'labour-hours', 80, 320),
          item('hourly_specialist', 'Specialist detailing', 'labour-hours', 95, 380),
          item('hourly_commercial_recurring', 'Recurring commercial cleaning', 'labour-hours', 65, 195),
          item('hourly_commercial_adhoc', 'Ad-hoc commercial cleaning', 'labour-hours', 75, 300),
        ],
      },
      {
        id: 'builders-cleaning', label: 'Builders Cleaning', items: [
          item('builders_rough', 'Builders rough clean', 'square-metres', 4.5, 850, { requiresPhotos: true, manual: true }),
          item('builders_final', 'Builders final clean', 'square-metres', 6.5, 1200, { requiresPhotos: true, manual: true }),
          item('builders_staged', 'Complete staged builders clean', 'square-metres', 10.5, 1800, { requiresPhotos: true, manual: true }),
          item('builders_sparkle', 'Final sparkle/detail clean', 'square-metres', 3.5, 650, { requiresPhotos: true, manual: true }),
        ],
      },
      {
        id: 'commercial-additions', label: 'Commercial Cleaning Additions', items: [
          fixed('commercial_after_hours', 'After-hours/night attendance', 120, { addonOnly: true }),
          item('commercial_restocking', 'Consumables-restocking labour', 'visits', 35, 0, { addonOnly: true }),
          fixed('commercial_induction', 'Security or site-induction allowance', 75, { addonOnly: true, fromPrice: true }),
          fixed('commercial_public_controls', 'Wastewater or public-access controls', 150, { addonOnly: true, fromPrice: true }),
        ],
      },
      {
        id: 'gym-specialty-cleaning', label: 'Gym Specialty Cleaning', items: [
          item('gym_maintenance_small', 'Maintenance clean, small machine', 'machines', 15, 300),
          item('gym_maintenance_medium', 'Maintenance clean, medium machine', 'machines', 25, 300),
          item('gym_maintenance_large', 'Maintenance clean, large/cardio machine', 'machines', 40, 300),
          item('gym_detail_small', 'Deep detail, small machine', 'machines', 30, 450),
          item('gym_detail_medium', 'Deep detail, medium machine', 'machines', 50, 450),
          item('gym_detail_large', 'Deep detail, large/cardio machine', 'machines', 75, 450),
          item('gym_fan', 'Large high-level roof fan', 'fans', 180, 360, { requiresPhotos: true }),
          item('gym_vent', 'High-level vent or grille dusting', 'vents', 25, 150),
          item('gym_mirrors', 'Gym mirrors', 'square-metres', 6.5, 150),
          item('gym_floor', 'Rubber gym-floor deep cleaning', 'square-metres', 8.5, 550),
          item('gym_floor_odour', 'Gym-floor odour treatment', 'square-metres', 1.5, 120, { addonOnly: true }),
          fixed('gym_monthly_rotation', 'Monthly rotating deep-clean package', 1500),
        ],
      },
      {
        id: 'bin-cleaning', label: 'Bin Cleaning', items: [
          item('bin_residential', 'Residential wheelie bins', 'bins', 45, 0, { mode: 'first-additional', additionalRate: 25 }),
          item('bin_commercial', 'Commercial bin', 'bins', 65, 180),
          item('bin_room', 'Bin-room deep clean', 'square-metres', 15, 250),
        ],
      },
      {
        id: 'odour-sanitising', label: 'Odour and Sanitising', items: [
          item('sanitise_bathroom', 'Bathroom sanitising treatment', 'bathrooms', 45, 0, { addonOnly: true }),
          item('sanitise_commercial', 'Commercial surface sanitising', 'square-metres', 2.5, 150),
          item('sanitise_carpet', 'Carpet pet urine/odour treatment', 'rooms', 45, 0, { addonOnly: true }),
          item('sanitise_upholstery', 'Upholstery pet hair/odour treatment', 'seats', 15, 0, { addonOnly: true }),
          item('sanitise_mattress', 'Mattress urine/odour treatment', 'mattresses', 55, 0, { addonOnly: true }),
          item('sanitise_gym_floor', 'Gym-floor odour treatment', 'square-metres', 1.5, 120),
        ],
      },
    ],
    conditionAdjustments: {
      light: { label: 'Light maintenance clean', multiplier: 0.9 },
      standard: { label: 'Standard condition', multiplier: 1 },
      moderate: { label: 'Moderate build-up', multiplier: 1.2 },
      heavy: { label: 'Heavy build-up', multiplier: 1.45 },
      severe: { label: 'Severe cleaning condition', multiplier: 1.75, requiresPhotos: true },
      builders: { label: 'Builders contamination', multiplier: 2, requiresPhotos: true },
      unclear: { label: 'Unclear condition', manual: true, requiresPhotos: true },
    },
    accessAdjustments: {
      ground: { label: 'Ground-level/easy access', multiplier: 1 },
      double: { label: 'Double-storey access', multiplier: 1.15 },
      three: { label: 'Three-storey access', multiplier: 1.35, requiresPhotos: true },
      pole: { label: 'High water-fed-pole access', multiplier: 1.2 },
      ladder: { label: 'Difficult ladder access', multiplier: 1.25, requiresPhotos: true },
      restricted: { label: 'Restricted interior/site access', multiplier: 1.15 },
      harness: { label: 'Harness or roof-safety setup', multiplier: 1.4, requiresPhotos: true },
      specialist: { label: 'EWP, scaffolding or specialist access', manual: true, requiresPhotos: true },
    },
    travelCharges: {
      within50: { label: 'Within 50 km of Biggera Waters - no travel fee', amount: 0 },
      beyond50: { label: 'More than 50 km from Biggera Waters - $50 incl. GST travel fee', amount: 50 / 1.1 },
      unverified: { label: 'Travel distance requires confirmation', amount: 0, manual: true },
    },
    timingLoadings: {
      standard: { label: 'Standard weekday booking', rate: 0 },
      same_day: { label: 'Same-day urgent work', rate: 0.25 },
      saturday: { label: 'Saturday', rate: 0.15 },
      sunday: { label: 'Sunday', rate: 0.25 },
      public_holiday: { label: 'Public holiday', rate: 0.5 },
      night: { label: 'Night work after 7 pm', rate: 0.2 },
    },
    recurringMultipliers: {
      one_off: { label: 'First or one-off clean', multiplier: 1 },
      weekly: { label: 'Weekly maintenance', multiplier: 0.85 },
      fortnightly: { label: 'Fortnightly maintenance', multiplier: 0.88 },
      monthly: { label: 'Monthly maintenance', multiplier: 0.9 },
      quarterly: { label: 'Every three months', multiplier: 0.95 },
      six_monthly: { label: 'Every six months', multiplier: 1 },
      annual: { label: 'Annual or longer', multiplier: 1.1 },
    },
    bundleDiscounts: { one: 0, two: 0.05, threePlus: 0.08, multiSiteMaximum: 0.1 },
  };

  const groupById = new Map(PRICING_CONFIG.groups.map((group) => [group.id, group]));
  const itemByCode = new Map();
  PRICING_CONFIG.groups.forEach((group) => group.items.forEach((entry) => itemByCode.set(entry.code, { ...entry, groupId: group.id, groupLabel: group.label })));

  const UNIT_LABELS = {
    properties: ['property', 'properties'], rooms: ['room', 'rooms'], bathrooms: ['bathroom', 'bathrooms'], kitchens: ['kitchen', 'kitchens'],
    'square-metres': ['m2', 'm2'], 'linear-metres': ['linear metre', 'linear metres'], windows: ['window', 'windows'], 'glass-panels': ['glass panel', 'glass panels'],
    screens: ['screen', 'screens'], tracks: ['track', 'tracks'], 'solar-panels': ['solar panel', 'solar panels'], seats: ['seat', 'seats'], chairs: ['chair', 'chairs'],
    sofas: ['sofa', 'sofas'], mattresses: ['mattress', 'mattresses'], machines: ['machine', 'machines'], fans: ['fan', 'fans'], vents: ['vent', 'vents'],
    bins: ['bin', 'bins'], 'labour-hours': ['labour hour', 'labour hours'], items: ['item', 'items'], 'door-sets': ['door set', 'door sets'], doors: ['door', 'doors'],
    'small-panes': ['small pane', 'small panes'], skylights: ['skylight', 'skylights'], spots: ['spot', 'spots'], arrays: ['array', 'arrays'], downpipes: ['downpipe', 'downpipes'],
    steps: ['step', 'steps'], landings: ['landing', 'landings'], rugs: ['rug', 'rugs'], sections: ['section', 'sections'], showers: ['shower', 'showers'],
    ovens: ['oven', 'ovens'], 'doors-drawers': ['door or drawer', 'doors or drawers'], appliances: ['appliance', 'appliances'], visits: ['visit', 'visits'],
  };

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function money(value) {
    return `$${number(value).toLocaleString('en-AU', { minimumFractionDigits: Number.isInteger(number(value)) ? 0 : 2, maximumFractionDigits: 2 })}`;
  }

  function roundMoney(value) {
    return Math.round((number(value) + Number.EPSILON) * 100) / 100;
  }

  function unitLabel(unit, quantity = 2) {
    const labels = UNIT_LABELS[unit] || ['unit', 'units'];
    return number(quantity) === 1 ? labels[0] : labels[1];
  }

  function calculateRaw(entry, quantity) {
    const qty = Math.max(0, number(quantity));
    if (entry.mode === 'manual') return { raw: 0, unitRate: 0 };
    if (entry.mode === 'fixed') return { raw: number(entry.rate) * Math.max(1, qty || 1), unitRate: number(entry.rate) };
    if (entry.mode === 'tiered-rate') {
      const tier = entry.tiers.find((candidate) => candidate.max === null || qty <= candidate.max) || entry.tiers.at(-1);
      return { raw: qty * number(tier.rate), unitRate: number(tier.rate) };
    }
    if (entry.mode === 'solar-tier') {
      if (qty <= 12) return { raw: 150, unitRate: null, pricingNote: 'Up to 12 panels' };
      if (qty <= 24) return { raw: 220, unitRate: null, pricingNote: '13-24 panels' };
      if (qty <= 40) return { raw: 340, unitRate: null, pricingNote: '25-40 panels' };
      return { raw: 340 + (qty - 40) * 9, unitRate: 9, pricingNote: '$340 for 40 panels plus $9 per additional panel' };
    }
    if (entry.mode === 'first-additional') {
      if (qty <= 0) return { raw: 0, unitRate: number(entry.rate) };
      return { raw: number(entry.rate) + Math.max(0, qty - 1) * number(entry.additionalRate), unitRate: number(entry.rate), pricingNote: `${money(entry.rate)} first bin, ${money(entry.additionalRate)} each additional bin` };
    }
    return { raw: qty * number(entry.rate), unitRate: number(entry.rate) };
  }

  function normalizeLineItems(input) {
    if (Array.isArray(input.lineItems) && input.lineItems.length) return input.lineItems;
    if (input.pricingItemCode) return [{ code: input.pricingItemCode, quantity: input.scopeQuantity || 1 }];
    return [];
  }

  function adjustmentAmount(base, multiplier) {
    return roundMoney(base * (number(multiplier, 1) - 1));
  }

  function calculateEstimate(input = {}) {
    const requestedLines = normalizeLineItems(input);
    const resolvedLines = [];
    const issues = [];
    let manualReviewRequired = false;
    let photoRequired = false;

    requestedLines.forEach((line, index) => {
      const entry = itemByCode.get(String(line.code || ''));
      if (!entry) {
        issues.push(`Priced service item ${index + 1} is not recognised.`);
        manualReviewRequired = true;
        return;
      }
      const quantity = entry.mode === 'fixed' ? Math.max(1, number(line.quantity, 1)) : number(line.quantity);
      if (!entry.manual && quantity <= 0) {
        issues.push(`Enter a quantity for ${entry.label}.`);
        manualReviewRequired = true;
      }
      if (entry.manual) manualReviewRequired = true;
      if (entry.requiresPhotos) photoRequired = true;
      const rawResult = calculateRaw(entry, quantity);
      resolvedLines.push({
        ...entry,
        quantity,
        unitRate: rawResult.unitRate,
        rawSubtotalExGst: roundMoney(rawResult.raw),
        pricingNote: rawResult.pricingNote || '',
      });
    });

    if (!resolvedLines.length) {
      manualReviewRequired = true;
      issues.push('Choose a precise service item and quantity to calculate a price.');
    }

    const grouped = new Map();
    resolvedLines.forEach((line) => {
      if (!grouped.has(line.groupId)) grouped.set(line.groupId, { groupId: line.groupId, groupLabel: line.groupLabel, lines: [], raw: 0, minimum: 0, hasMain: false });
      const group = grouped.get(line.groupId);
      group.lines.push(line);
      group.raw += line.rawSubtotalExGst;
      group.minimum = Math.max(group.minimum, number(line.minimum));
      if (!line.addonOnly) group.hasMain = true;
    });

    const groupSummaries = [];
    let servicesBase = 0;
    let eligibleServiceCount = 0;
    grouped.forEach((group) => {
      if (!group.hasMain) {
        manualReviewRequired = true;
        issues.push(`${group.groupLabel} add-ons require a main service.`);
      } else {
        eligibleServiceCount += 1;
      }
      const appliedSubtotal = Math.max(0, group.minimum, roundMoney(group.raw));
      const minimumAdjustment = roundMoney(Math.max(0, appliedSubtotal - group.raw));
      servicesBase += appliedSubtotal;
      groupSummaries.push({ ...group, rawSubtotalExGst: roundMoney(group.raw), appliedMinimumExGst: group.minimum, minimumAdjustmentExGst: minimumAdjustment, subtotalExGst: appliedSubtotal });
    });
    servicesBase = roundMoney(servicesBase);

    const condition = PRICING_CONFIG.conditionAdjustments[String(input.conditionLevel || 'standard').toLowerCase()] || PRICING_CONFIG.conditionAdjustments.standard;
    const access = PRICING_CONFIG.accessAdjustments[String(input.accessDifficulty || 'ground').toLowerCase()] || PRICING_CONFIG.accessAdjustments.ground;
    const recurring = PRICING_CONFIG.recurringMultipliers[String(input.recurringFrequency || 'one_off')] || PRICING_CONFIG.recurringMultipliers.one_off;
    const timing = PRICING_CONFIG.timingLoadings[String(input.timingLoading || 'standard')] || PRICING_CONFIG.timingLoadings.standard;
    const travel = PRICING_CONFIG.travelCharges[String(input.travelBand || 'unverified')] || PRICING_CONFIG.travelCharges.unverified;

    [condition, access, travel].forEach((rule) => {
      if (rule.manual) manualReviewRequired = true;
      if (rule.requiresPhotos) photoRequired = true;
    });

    const conditionAmount = adjustmentAmount(servicesBase, condition.multiplier);
    const afterCondition = roundMoney(servicesBase + conditionAmount);
    const accessAmount = adjustmentAmount(afterCondition, access.multiplier);
    const afterAccess = roundMoney(afterCondition + accessAmount);
    const recurringAmount = adjustmentAmount(afterAccess, recurring.multiplier);
    const afterRecurring = roundMoney(afterAccess + recurringAmount);
    const timingAmount = roundMoney(afterRecurring * number(timing.rate));
    const afterTiming = roundMoney(afterRecurring + timingAmount);
    const bundleRate = eligibleServiceCount >= 3 ? PRICING_CONFIG.bundleDiscounts.threePlus : eligibleServiceCount === 2 ? PRICING_CONFIG.bundleDiscounts.two : 0;
    const bundleDiscount = roundMoney(afterTiming * bundleRate);
    const servicesAfterDiscount = roundMoney(afterTiming - bundleDiscount);
    const travelCharge = roundMoney(number(travel.amount));
    const subtotalExGst = roundMoney(servicesAfterDiscount + travelCharge);
    const gst = roundMoney(subtotalExGst * PRICING_CONFIG.gstRate);
    const totalIncGst = roundMoney(subtotalExGst + gst);

    const hasPrice = subtotalExGst > 0;
    const fromPrice = resolvedLines.some((line) => line.fromPrice) || manualReviewRequired;
    const estimateLabel = hasPrice
      ? `${fromPrice ? 'From ' : ''}${money(totalIncGst)} incl. GST${manualReviewRequired ? ' - review required' : ''}`
      : 'Inspection required';
    const reasons = [
      `${PRICING_CONFIG.version} rates used`,
      ...groupSummaries.filter((group) => group.minimumAdjustmentExGst > 0).map((group) => `${group.groupLabel} minimum applied once`),
      condition.multiplier !== 1 ? `${condition.label} allowance included` : condition.label,
      access.multiplier !== 1 ? `${access.label} allowance included` : access.label,
      recurring.multiplier !== 1 ? `${recurring.label} pricing applied` : recurring.label,
      timing.rate ? `${timing.label} loading included` : timing.label,
      bundleRate ? `${eligibleServiceCount >= 3 ? 'Three-service' : 'Two-service'} bundle discount included` : '',
      travel.label,
      'GST added once at 10%',
      photoRequired ? 'Photographs are required before confirmation' : '',
      manualReviewRequired ? 'Team review or inspection required before final confirmation' : '',
      resolvedLines.some((line) => line.removalDisclaimer) ? 'Complete stain or contamination removal is not guaranteed' : '',
      ...issues,
    ].filter(Boolean);

    const calculationBreakdown = {
      lines: resolvedLines.map((line) => ({
        code: line.code,
        group: line.groupLabel,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
        unitLabel: unitLabel(line.unit, line.quantity),
        unitRateExGst: line.unitRate,
        minimumExGst: line.minimum,
        subtotalExGst: line.rawSubtotalExGst,
        pricingNote: line.pricingNote,
      })),
      groups: groupSummaries.map((group) => ({
        group: group.groupLabel,
        statedMinimumExGst: group.appliedMinimumExGst,
        minimumAdjustmentExGst: group.minimumAdjustmentExGst,
        subtotalExGst: group.subtotalExGst,
      })),
      adjustments: [
        { label: 'Condition allowance', amountExGst: conditionAmount },
        { label: 'Access allowance', amountExGst: accessAmount },
        { label: 'Recurring maintenance adjustment', amountExGst: recurringAmount },
        { label: 'Timing loading', amountExGst: timingAmount },
        { label: 'Bundle discount', amountExGst: -bundleDiscount },
        { label: 'Travel from Biggera Waters', amountExGst: travelCharge },
      ].filter((entry) => entry.amountExGst !== 0),
      servicesSubtotalExGst: servicesBase,
      subtotalExGst,
      gst,
      totalIncGst,
    };

    return {
      estimateMin: subtotalExGst,
      estimateMax: subtotalExGst,
      estimateMinIncGst: totalIncGst,
      estimateMaxIncGst: totalIncGst,
      recommendedEstimate: subtotalExGst,
      recommendedEstimateIncGst: totalIncGst,
      recommendedEstimateLabel: estimateLabel,
      estimateLabel,
      internalEstimateLabel: `${money(subtotalExGst)} ex GST + ${money(gst)} GST = ${money(totalIncGst)} incl. GST`,
      pricingMethod: PRICING_CONFIG.version,
      estimateReasons: reasons,
      estimatedJobType: manualReviewRequired ? 'Manual Review' : eligibleServiceCount > 1 ? 'Bundled Services' : 'Priced Service',
      tailoredQuoteRecommended: manualReviewRequired,
      manualReviewRequired,
      photoRequired,
      estimateGuidance: manualReviewRequired
        ? 'This is a starting estimate only. Photographs or inspection and team confirmation are required.'
        : 'Calculated from the selected service, quantity and master price list. Final scope is confirmed before work starts.',
      accuracyLevel: manualReviewRequired ? 'Low' : photoRequired ? 'Medium' : 'High',
      eligibleForGiveaway: subtotalExGst >= 495,
      calculationBreakdown,
      internalCalculation: {
        pricingVersion: PRICING_CONFIG.version,
        conditionMultiplier: number(condition.multiplier, 1),
        accessMultiplier: number(access.multiplier, 1),
        recurringMultiplier: number(recurring.multiplier, 1),
        timingRate: number(timing.rate),
        bundleRate,
        eligibleServiceCount,
      },
    };
  }

  function generateSummary(input, estimate) {
    const lineText = estimate.calculationBreakdown.lines.map((line) => `${line.quantity} ${line.unitLabel} of ${line.label}`).join(', ');
    return `This estimate uses the T&A Pro Cleaning master price list for ${lineText || 'the selected cleaning scope'}. Service minimums are applied once per category and 10% GST is added once at the end.${estimate.manualReviewRequired ? ' Photographs or inspection and team confirmation are required.' : ' Final scope is confirmed before work starts.'}`;
  }

  return {
    PRICING_CONFIG,
    calculateEstimate,
    generateSummary,
    getGroups: () => PRICING_CONFIG.groups,
    getItemsForGroup: (groupId) => groupById.get(groupId)?.items || [],
    getItem: (code) => itemByCode.get(code) || null,
    unitLabel,
    money,
  };
});

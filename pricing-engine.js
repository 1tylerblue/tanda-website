(function initTAPricing(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./money.js') : root.TAMoney);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TAPricing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTAPricing(Money) {
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
          item('window_large_exterior', 'Large glass panel exterior', 'glass-panels', 16, 180),
          item('window_large_interior', 'Large glass panel interior', 'glass-panels', 16, 180),
          item('window_large_both', 'Large glass panel interior and exterior', 'glass-panels', 28, 220),
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
    return Money.toCents(number(value)) / 100;
  }

  function unitLabel(unit, quantity = 2) {
    const labels = UNIT_LABELS[unit] || ['unit', 'units'];
    return number(quantity) === 1 ? labels[0] : labels[1];
  }

  function calculateRaw(entry, quantity) {
    const qty = Math.max(0, number(quantity));
    if (qty <= 0) return { raw: 0, unitRate: number(entry.rate) };
    if (entry.mode === 'manual') return { raw: 0, unitRate: 0 };
    if (entry.mode === 'fixed') return { raw: number(entry.rate) * qty, unitRate: number(entry.rate) };
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
    if (Array.isArray(input.lineItems)) return input.lineItems;
    if (input.pricingItemCode) return [{ code: input.pricingItemCode, quantity: input.scopeQuantity, selected: true }];
    return [];
  }

  function lineQuantity(line, entry) {
    const missing = line.quantity === '' || line.quantity === null || line.quantity === undefined;
    return missing && entry.mode === 'fixed' ? 1 : number(line.quantity);
  }

  // Pricing and customer scope must use exactly the same validated selections.
  function resolveLineItems(input) {
    const issues = [];
    const resolved = [];
    const seenCodes = new Set();
    normalizeLineItems(input).forEach((line, index) => {
      if (!line || typeof line !== 'object') {
        issues.push(`Priced service item ${index + 1} is not recognised.`);
        return;
      }
      const missing = line.quantity === '' || line.quantity === null || line.quantity === undefined;
      const suppliedQuantity = Number(line.quantity);
      // An explicit nonpositive quantity means this service does not exist.
      if (!missing && Number.isFinite(suppliedQuantity) && suppliedQuantity <= 0) return;
      const entry = itemByCode.get(String(line.code || ''));
      if (!entry) {
        issues.push(`Priced service item ${index + 1} is not recognised.`);
        return;
      }
      if (missing && entry.mode !== 'fixed') {
        if (line.selected === true) issues.push(`Enter a positive quantity for ${entry.label}, or remove the service.`);
        return;
      }
      const quantity = lineQuantity(line, entry);
      const permitsFraction = ['square-metres', 'linear-metres', 'labour-hours'].includes(entry.unit);
      if ((!missing && !Number.isFinite(suppliedQuantity)) || quantity <= 0 || quantity > 100000 || (!permitsFraction && !Number.isInteger(quantity))) {
        issues.push(`Confirm a valid quantity for ${entry.label}.`);
        return;
      }
      if (seenCodes.has(entry.code)) issues.push(`${entry.label} appears more than once. Confirm these quantities represent separate work before booking.`);
      seenCodes.add(entry.code);
      const raw = calculateRaw(entry, quantity);
      resolved.push({ ...entry, quantity, unitRate: raw.unitRate, rawSubtotalExGst: roundMoney(raw.raw), pricingNote: raw.pricingNote || '' });
    });

    const mattressCount = resolved.filter(line => line.groupId === 'mattress-cleaning' && !line.addonOnly && line.rawSubtotalExGst > 0)
      .reduce((sum, line) => sum + line.quantity, 0);
    const oneSideCount = resolved.filter(line => line.code === 'mattress_one_side').reduce((sum, line) => sum + line.quantity, 0);
    const invalidReduction = oneSideCount > mattressCount;
    if (invalidReduction) issues.push('One-side mattress reductions cannot exceed the number of purchased mattresses. Confirm the mattress count before applying a reduction.');
    return { lines: invalidReduction ? resolved.filter(line => line.code !== 'mattress_one_side') : resolved, issues };
  }

  function windowCoverage(line, input) {
    if (/_exterior$/.test(line.code)) return 'Exterior';
    if (/_interior$/.test(line.code) || line.code === 'glass_partitions') return 'Interior';
    if (/_both$/.test(line.code)) return 'Interior and exterior';
    const area = String(input.serviceArea || '').toLowerCase();
    return area === 'exterior' ? 'Exterior' : area === 'interior' ? 'Interior' : area === 'both' ? 'Interior and exterior' : 'Selected';
  }

  function adjustmentAmount(base, multiplier) {
    return roundMoney(base * (number(multiplier, 1) - 1));
  }

  function calculateEstimate(input = {}) {
    const resolved = resolveLineItems(input);
    const resolvedLines = resolved.lines;
    const issues = resolved.issues;
    let manualReviewRequired = issues.length > 0 || resolvedLines.some(line => line.manual);
    let photoRequired = resolvedLines.some(line => line.requiresPhotos);

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
      if (line.rawSubtotalExGst > 0) group.minimum = Math.max(group.minimum, number(line.minimum));
      if (!line.addonOnly && line.rawSubtotalExGst > 0) group.hasMain = true;
    });

    const groupSummaries = [];
    let servicesBase = 0;
    let eligibleServiceCount = 0;
    grouped.forEach((group) => {
      if (!group.hasMain && group.lines.some(line => line.addonOnly)) {
        manualReviewRequired = true;
        issues.push(`${group.groupLabel} add-ons require a main service.`);
      } else if (group.raw > 0) {
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
    const suppliedDistance = input.travelDistanceKm ?? input.distanceKm;
    const verifiedLocation = input.addressVerified === true && input.distanceSource === 'driving-route' && suppliedDistance !== undefined && suppliedDistance !== null && suppliedDistance !== '' && Number.isFinite(Number(suppliedDistance)) && Number(suppliedDistance) >= 0;
    const travel = verifiedLocation
      ? PRICING_CONFIG.travelCharges[Number(input.travelDistanceKm ?? input.distanceKm) > 50 ? 'beyond50' : 'within50']
      : PRICING_CONFIG.travelCharges.unverified;

    [condition, access, travel].forEach((rule) => {
      if (rule.manual) manualReviewRequired = true;
      if (rule.requiresPhotos) photoRequired = true;
    });

    const windowLines = resolvedLines.filter(line => line.groupId === 'window-cleaning' && !line.addonOnly);
    const storeys = parseInt(input.storeys, 10) || (/three|high/i.test(input.storeys || '') ? 3 : /double/i.test(input.storeys || '') ? 2 : 0);
    const confirm = (reason, photos = false) => { issues.push(reason); manualReviewRequired = true; if (photos) photoRequired = true; };
    for (const [field, choices, label] of [
      ['conditionLevel', PRICING_CONFIG.conditionAdjustments, 'condition'],
      ['accessDifficulty', PRICING_CONFIG.accessAdjustments, 'access'],
      ['recurringFrequency', PRICING_CONFIG.recurringMultipliers, 'recurring frequency'],
      ['timingLoading', PRICING_CONFIG.timingLoadings, 'timing'],
    ]) {
      if (input[field] && !Object.hasOwn(choices, String(input[field]).toLowerCase())) confirm(`Confirm the selected ${label}; this value is not a recognised pricing option.`);
    }
    if (windowLines.length) {
      const count = windowLines.filter(line => line.unit === 'windows').reduce((sum, line) => sum + line.quantity, 0);
      if (count >= 40 && (/apartment|unit/i.test(input.propertyType || '') || /^1\D+2$/.test(input.rooms || ''))) confirm('Large window count for selected property type — confirm complete window units, not individual panes.', true);
      if (count >= 100 || windowLines.some(line => line.unit === 'glass-panels' && line.quantity >= 30)) confirm('Large glass quantity — confirm panel count and supply photos.', true);
      if (storeys > 1 && (!input.accessDifficulty || input.accessDifficulty === 'ground') && input.allGlassGroundAccessible !== true) confirm('Confirm whether all requested glass is safely accessible from ground level; multi-storey access requires review.', true);
      if (windowLines.some(line => line.code.startsWith('window_package_')) && windowLines.some(line => !line.code.startsWith('window_package_'))) confirm('Window package and measured glass may overlap — team must confirm quantities before a final price.', true);
      if (windowLines.filter(line => line.code.startsWith('window_package_')).length > 1) confirm('Multiple whole-property window packages may overlap — confirm separate properties before booking.', true);
      if (windowLines.some(line => line.code.startsWith('window_package_')) && resolvedLines.some(line => ['window_flyscreen', 'window_screen_door', 'window_deep_track'].includes(line.code))) confirm('The window package includes screens and tracks; confirm separately selected add-ons are additional work.', true);
      for (const family of ['window_standard', 'window_large', 'window_skylight']) {
        if (windowLines.some(line => line.code === `${family}_both`) && windowLines.some(line => line.code === `${family}_interior` || line.code === `${family}_exterior`)) confirm('Both-sides window cleaning and a separate single-side selection may cover the same glass. Confirm separate units before booking.', true);
      }
      if (windowLines.some(line => /_(both|interior|exterior)$/.test(line.code) && String(input.serviceArea || '').toLowerCase() && windowCoverage(line, input).toLowerCase() !== (String(input.serviceArea).toLowerCase() === 'both' ? 'interior and exterior' : String(input.serviceArea).toLowerCase()))) confirm('Window job type and requested sides differ — scope follows the priced job; confirm the intended sides.');
    }
    if (/rope/i.test(input.accessDifficulty || '') || /rope.only/i.test(input.notes || '')) confirm('Rope-only access is not provided. An alternative safe access method must be confirmed.', true);
    if (resolvedLines.some(line => /^house_wash_/.test(line.code)) && /apartment|unit/i.test(input.propertyType || '')) confirm('Confirm house-washing scope for this apartment/unit before booking.');
    const fixedStoreys = { window_package_single: 1, window_package_double: 2, house_wash_single: 1, house_wash_double: 2, house_wash_three: 3, gutter_package_single: 1, gutter_package_double: 2 };
    if (storeys && resolvedLines.some(line => fixedStoreys[line.code] && fixedStoreys[line.code] !== storeys)) confirm('Selected storey-specific package differs from the property details. Confirm which parts of the property are included; no automatic storey uplift has been added.');
    if (!input.propertyType || !storeys || !input.accessDifficulty || !input.conditionLevel) confirm('Confirm property, storeys, condition and access before booking.');
    if (photoRequired) manualReviewRequired = true;

    const conditionAmount = adjustmentAmount(servicesBase, condition.multiplier);
    const afterCondition = roundMoney(servicesBase + conditionAmount);
    const accessIncluded = new Set(['window_package_double', 'gutter_package_double', 'gutter_double', 'house_wash_double', 'house_wash_three', 'building_walls_double']);
    const accessKey = String(input.accessDifficulty || 'ground').toLowerCase();
    const accessBase = groupSummaries.reduce((sum, group) => {
      if (!['double', 'three', 'harness'].includes(accessKey)) return sum + group.subtotalExGst;
      if (group.lines.some(line => line.accessAllowance)) {
        // An explicit roof-access allowance covers its roof job. A second
        // percentage for the same access must not be charged automatically.
        confirm('A roof-access allowance is already selected; confirm that it covers the requested access before booking.', true);
        return sum;
      }
      const includedLines = group.lines.filter(line => accessIncluded.has(line.code));
      if (!includedLines.length) return sum + group.subtotalExGst;
      const otherLines = group.lines.filter(line => !accessIncluded.has(line.code) && line.rawSubtotalExGst > 0);
      if (otherLines.length) confirm('Some selected items include storey access and others do not; confirm the access allowance for the additional work.');
      if (includedLines.some(line => (line.code === 'house_wash_three' ? accessKey !== 'three' : accessKey !== 'double'))) {
        confirm('Requested access differs from the storey access included in the selected package. Confirm the required access before booking.', true);
      }
      if (!otherLines.length) return sum;
      const includedAmount = includedLines.reduce((subtotal, line) => subtotal + Math.max(0, line.rawSubtotalExGst), 0);
      // Apply the percentage only to remaining work, preserving the existing
      // category minimum while avoiding an exemption for the whole category.
      return sum + Math.max(0, group.subtotalExGst - includedAmount);
    }, 0);
    const accessAmount = adjustmentAmount(roundMoney(accessBase * number(condition.multiplier, 1)), access.multiplier);
    const afterAccess = roundMoney(afterCondition + accessAmount);
    const recurringAmount = adjustmentAmount(afterAccess, Math.max(1, number(recurring.multiplier, 1)));
    const afterRecurring = roundMoney(afterAccess + recurringAmount);
    const timingAmount = roundMoney(afterRecurring * number(timing.rate));
    const afterTiming = roundMoney(afterRecurring + timingAmount);
    const bundleRate = 0; // The approved campaign replaces legacy discounts; stacking is not authorised.
    const bundleDiscount = roundMoney(afterTiming * bundleRate);
    const servicesAfterDiscount = roundMoney(afterTiming - bundleDiscount);
    if (eligibleServiceCount > 1 || number(recurring.multiplier, 1) < 1) confirm('25% service promotion applied once; legacy bundle/maintenance discounts are not stacked. Team confirmation required.');
    const promotion = Money.promotion(Money.toCents(Math.max(0, servicesAfterDiscount)), 'one_off_service');
    // Travel is already a GST-inclusive fee and is excluded from the service promotion.
    const travelFeeIncGst = servicesBase > 0 && verifiedLocation ? (number(travel.amount) > 0 ? 50 : 0) : 0;
    const travelCharge = roundMoney(travelFeeIncGst / 1.1);
    const travelGst = roundMoney(travelFeeIncGst - travelCharge);
    const subtotalExGst = roundMoney(promotion.subtotalExGst + travelCharge);
    const gst = roundMoney(promotion.gst + travelGst);
    const totalIncGst = roundMoney(promotion.totalIncGst + travelFeeIncGst);

    const hasPrice = subtotalExGst > 0;
    const fromPrice = resolvedLines.some((line) => line.fromPrice) || manualReviewRequired;
    const estimateLabel = hasPrice
      ? `${fromPrice ? 'Provisional ' : ''}${money(totalIncGst)} incl. GST${manualReviewRequired ? ' - review required' : ''}`
      : 'Inspection required';
    const reasons = [
      `${PRICING_CONFIG.version} rates used`,
      ...groupSummaries.filter((group) => group.minimumAdjustmentExGst > 0).map((group) => `${group.groupLabel} minimum applied once`),
      condition.multiplier !== 1 ? `${condition.label} allowance included` : condition.label,
      access.multiplier !== 1 ? `${access.label} allowance included` : access.label,
      number(recurring.multiplier, 1) > 1 ? `${recurring.label} pricing applied` : recurring.label,
      timing.rate ? `${timing.label} loading included` : timing.label,
      bundleRate ? `${eligibleServiceCount >= 3 ? 'Three-service' : 'Two-service'} bundle discount included` : '',
      travel.label,
      promotion.campaign.label + ' applied before GST; travel excluded',
      'GST added once at 10%',
      photoRequired ? 'Photographs are required before confirmation' : '',
      manualReviewRequired ? 'Team review or inspection required before final confirmation' : '',
      resolvedLines.some((line) => line.removalDisclaimer) ? 'Complete stain or contamination removal is not guaranteed' : '',
      ...issues,
    ].filter(Boolean);

    const calculationBreakdown = {
      ...promotion,
      travelFeeIncGst,
      travelGst,
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
        { label: promotion.campaign.label, amountExGst: -promotion.discount },
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
      pricingPolicyVersion: 'T&A-PRICING-FIX-2026-09-23',
      estimateReasons: reasons,
      estimatedJobType: manualReviewRequired ? 'Manual Review' : eligibleServiceCount > 1 ? 'Bundled Services' : 'Priced Service',
      tailoredQuoteRecommended: manualReviewRequired,
      manualReviewRequired,
      photoRequired,
      estimateGuidance: manualReviewRequired
        ? 'This is a starting estimate only. Photographs or inspection and team confirmation are required.'
        : 'Calculated from the selected service, quantity and master price list. Final scope is confirmed before work starts.',
      accuracyLevel: manualReviewRequired ? 'Low' : photoRequired ? 'Medium' : 'High',
      eligibleForGiveaway: totalIncGst >= 495,
      depositIncGst: Money.scaleCents(Money.toCents(totalIncGst), 0.5) / 100,
      afterpayFullPaymentIncGst: totalIncGst,
      travelStatus: verifiedLocation ? 'verified' : 'requires address confirmation',
      travelFeeIncGst,
      promotion: promotion.campaign,
      calculationBreakdown,
      internalCalculation: {
        pricingVersion: PRICING_CONFIG.version,
        conditionMultiplier: number(condition.multiplier, 1),
        accessMultiplier: number(access.multiplier, 1),
        recurringMultiplier: Math.max(1, number(recurring.multiplier, 1)),
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

  function buildServiceScope(input = {}) {
    const resolvedLines = resolveLineItems(input).lines;

    if (!resolvedLines.length) return [];

    const scope = [];
    const oneSideMattresses = resolvedLines.filter(line => line.code === 'mattress_one_side').reduce((sum, line) => sum + line.quantity, 0);
    const totalMattresses = resolvedLines.filter(line => line.groupId === 'mattress-cleaning' && !line.addonOnly).reduce((sum, line) => sum + line.quantity, 0);

    resolvedLines.forEach((line) => {
      const quantity = line.quantity;
      const label = oneSideMattresses > 0 && line.groupId === 'mattress-cleaning' && !line.addonOnly
        ? line.label.replace(/, both sides$/i, '') : line.label;
      scope.push(`${quantity} ${unitLabel(line.unit, quantity)} - ${label}`);
    });
    if (oneSideMattresses > 0) {
      scope.push(`${oneSideMattresses} ${unitLabel('mattresses', oneSideMattresses)} cleaned on one side only`);
      if (totalMattresses > oneSideMattresses) scope.push(`${totalMattresses - oneSideMattresses} remaining ${unitLabel('mattresses', totalMattresses - oneSideMattresses)} cleaned on both sides; confirm which mattresses use each option`);
    }

    const windowLines = resolvedLines.filter((line) => line.groupId === 'window-cleaning');
    if (windowLines.length) {
      const codes = new Set(windowLines.map((line) => line.code));
      const hasPackage = windowLines.some((line) => line.code.startsWith('window_package_'));
      const normalWindows = windowLines.filter(line => /^window_(package_|standard_|large_|double_hung|louvre|sliding_door|stacker_bifold|skylight)/.test(line.code));
      for (const side of new Set(normalWindows.map(line => windowCoverage(line, input)))) {
        scope.push(`${side} window glass cleaned`);
        scope.push(`${side} window frames and sills detailed where applicable to the selected job`);
      }
      if (hasPackage || codes.has('window_flyscreen') || codes.has('window_screen_door')) {
        scope.push('Selected fly screens and screen doors cleaned');
      }
      if (hasPackage || codes.has('window_deep_track')) {
        scope.push('Selected window and door tracks cleaned');
      }
      if (codes.has('window_balustrade')) {
        scope.push('Selected pool-fence and glass-balustrade panels cleaned');
      }
    }

    scope.push('Final access, condition and scope confirmed before booking');
    return [...new Set(scope)];
  }

  return {
    PRICING_CONFIG,
    calculateEstimate,
    generateSummary,
    buildServiceScope,
    getGroups: () => PRICING_CONFIG.groups,
    getItemsForGroup: (groupId) => groupById.get(groupId)?.items || [],
    getItem: (code) => itemByCode.get(code) || null,
    unitLabel,
    money,
  };
});

# Production pricing baseline — 23 September 2026

Source and backup: immutable production Git commit `07e8e60d8b2b748c5a71fd87fe6104b995f84be2` (`origin/main` at task start). This records code evidence, not business approval of the master rates. No newer approved pricing source was present in production. Preserve this commit to recover any original file with `git show 07e8e60d8b2b748c5a71fd87fe6104b995f84be2:<path>`.

The original engine can be recovered exactly with `git show 07e8e60d8b2b748c5a71fd87fe6104b995f84be2:pricing-engine.js`. SHA-256 of that Git blob: `4cd2d950bd594a032ab5a2150f73f4a8a5bb8a4798a3ed06258ac4b66ce87707`. All tables below were extracted from that commit, independently of changes in the working checkout.

## Authoritative path and duplicated configuration

The browser calls TAPricing.calculateEstimate; the backend imports the same root pricing-engine.js through backend/src/ai.js. The shared production master reports T&A-MASTER-2026-07-11, contains 19 groups and 161 items, and uses AUD with GST 10%. There is no residential/commercial property multiplier in this shared engine. Explicit item codes define commercial items. Storeys and room count are not used to validate window access/quantity in the baseline.

app.js also contains a legacy SEQ-2026-07 fallback (REALISTIC_ESTIMATE_CONFIG). Its window measurement profile charges per pane (interior $6.25, exterior $6.75, both $10.50), unlike the shared master per complete window ($11/$11/$19). That fallback is only reached when the shared module is unavailable. It must fail to review rather than quietly use stale rates. These legacy prices are not an approved replacement.

The master contains single-/double-storey complete window packages at $450/$650 ex GST plus per-unit window prices. Those are alternative scoping methods: their scopes differ (package scope includes screens and tracks), and must not be combined as if all were separate work without review. Baseline imposes no package quantity cap and no mutual-exclusion guard.

## Baseline defects and exposure

- No general 25% promotion exists in the production master.
- Quantity normalization uses scopeQuantity || 1. Explicit zero fixed quantities become one. Zero measured lines remain active; they trigger minimums, bundle counts, flags and scope. Scope generation uses line.quantity || 1.
- UI normalizes numeric quantities with Math.max(1, Math.round(value)), turning zero into one and rounding measured area. UI also treats manual measured jobs as fixed and hides their quantity with a default one.
- Each group uses the greatest selected item minimum once; with zero items still active, an unused surface can raise that minimum. Only positive purchased lines should contribute.
- Bundles apply 5% for two groups and 8% for three or more. Maintenance multipliers also reduce rates: weekly 0.85, fortnightly 0.88, monthly 0.90, quarterly 0.95. No authorised promotion-stacking rule exists.
- Travel accepts the first Photon result for input suffixed with Queensland, Australia, with no country/state/query-match checks. It uses estimated straight-line distance ×1.25 if routing fails. Input test is long enough to bypass the only four-character input check.
- Browser hidden travelBand is accepted by the engine without a verification signal; backend uses a server cache, but the cached geocoding result itself was unverified.
- Engine confidence ignores property/storey/quantity contradictions. Access defaults to ground.
- Scope sides derive from generic serviceArea instead of purchased item code, permitting exterior-only charges to promise both sides.
- Giveaway incorrectly checks ex-GST subtotal >=495 in engine, frontend configuration and backend. Current user requires final qualifying incl-GST service spend >=495 after promotion.
- GST is presently added once at 10% after service adjustments and ex-GST travel; travel configured as 50/1.1 aims for $50 incl GST. Rounding and payment flow must preserve cents.
- Production has no native Square/Afterpay/Zip payment-amount creation endpoint; payment preferences are recorded; there is no verified amount-linked checkout in this production baseline. Do not claim a displayed estimate has a verified live processor checkout without an integrated amount path.
- Subscription builder is a separate pricing model; production first-clean/monthly values are rounded ex GST and show + GST. No 10% subscription promotion is applied in the baseline; server accepts submitted totals. Subscription pricing must be independently normalised and server-verified.

## Adjustment order before this fix

Group raw line amounts → maximum applicable category minimum → condition multiplier → access multiplier → recurring multiplier → timing loading → 5%/8% bundle reduction → ex-GST travel → GST once. No additional hidden property, room-count or storey multiplier exists in this shared engine. Manual/from-price/photo flags do not independently change rates.

| Adjustment | Existing values |
|---|---|
| Condition | light 0.9; standard 1; moderate 1.2; heavy 1.45; severe 1.75; builders 2; unclear review |
| Access | ground 1; double 1.15; three 1.35; pole 1.2; ladder 1.25; restricted 1.15; harness 1.4; specialist review |
| Timing | standard 0%; same day 25%; Saturday 15%; Sunday 25%; public holiday 50%; night 20% |
| Recurrence | one off 1; weekly 0.85; fortnightly 0.88; monthly 0.9; quarterly 0.95; six monthly 1; annual 1.1 |
| Travel | <=50 km $0; >50 km $50 incl GST; unverified $0/review |

## Master items — original rates, before GST

Fixed mode means an explicitly selected one-property/job default may legitimately be one; a measured quantity must be supplied. An explicit zero excludes either type. An asterisk on a minimum is unnecessary: every minimum below is ex GST and belongs to its category, applied once. Negative mattress one-side reduction is an existing legitimate adjustment, not a new negative service.

| Group | Code | Label / unit | Mode | Rate ex GST | Minimum ex GST | Existing flags |
|---|---|---|---|---:|---:|---|
| Window Cleaning | window_package_single | Single-storey complete window package / properties | fixed | 450 | 0 |  |
| Window Cleaning | window_package_double | Double-storey complete window package / properties | fixed | 650 | 0 |  |
| Window Cleaning | window_package_complex | Three-storey or complex property / properties | fixed | 0 | 0 | manual, requiresPhotos |
| Window Cleaning | window_standard_exterior | Standard window exterior / windows | unit | 11 | 180 |  |
| Window Cleaning | window_standard_interior | Standard window interior / windows | unit | 11 | 180 |  |
| Window Cleaning | window_standard_both | Standard window interior and exterior / windows | unit | 19 | 220 |  |
| Window Cleaning | window_large_exterior | Large window exterior / glass-panels | unit | 16 | 180 |  |
| Window Cleaning | window_large_interior | Large window interior / glass-panels | unit | 16 | 180 |  |
| Window Cleaning | window_large_both | Large window interior and exterior / glass-panels | unit | 28 | 220 |  |
| Window Cleaning | window_sliding_door_both | Sliding glass door, both sides / door-sets | unit | 42 | 220 |  |
| Window Cleaning | window_stacker_bifold | Stacker or bi-fold glass door / glass-panels | unit | 30 | 220 |  |
| Window Cleaning | window_louvre | Louvre window / windows | unit | 35 | 180 |  |
| Window Cleaning | window_double_hung | Double-hung window / windows | unit | 26 | 180 |  |
| Window Cleaning | window_colonial_surcharge | Colonial/French pane surcharge / small-panes | unit | 2.75 | 0 | addonOnly |
| Window Cleaning | window_skylight_exterior | Exterior skylight / skylights | unit | 30 | 180 |  |
| Window Cleaning | window_skylight_both | Interior and exterior skylight / skylights | unit | 55 | 220 |  |
| Window Cleaning | window_flyscreen | Standard flyscreen wash / screens | unit | 8 | 0 | addonOnly |
| Window Cleaning | window_screen_door | Screen-door wash / doors | unit | 15 | 0 | addonOnly |
| Window Cleaning | window_deep_track | Deep window or door-track cleaning / tracks | unit | 14 | 0 | addonOnly |
| Window Cleaning | window_balustrade | Glass balustrade or pool fence / glass-panels | unit | 14 | 180 |  |
| Window Cleaning | glass_hard_water | Hard-water stain treatment / square-metres | unit | 35 | 150 | requiresPhotos, removalDisclaimer |
| Window Cleaning | glass_builders | Builders-clean glass / square-metres | unit | 18 | 450 | requiresPhotos |
| Window Cleaning | glass_concrete_render | Concrete or render removal / square-metres | unit | 45 | 250 | requiresPhotos, removalDisclaimer |
| Window Cleaning | glass_adhesive | Sticker or adhesive removal / items | unit | 8 | 0 | addonOnly |
| Window Cleaning | glass_shopfront | Commercial shopfront maintenance / square-metres | unit | 7.5 | 150 |  |
| Window Cleaning | glass_partitions | Interior glass partitions / square-metres | unit | 6.5 | 150 |  |
| Pressure Cleaning | pressure_concrete | Concrete pressure cleaning / square-metres | tiered-rate | up to50:7; up to100:6.5; up to250:5.5; over250:4.75 | 250 |  |
| Pressure Cleaning | pressure_pavers | Pavers / square-metres | unit | 7.5 | 275 |  |
| Pressure Cleaning | pressure_outdoor_tiles | Outdoor tiles or pool surrounds / square-metres | unit | 8.5 | 275 |  |
| Pressure Cleaning | pressure_exterior_walls | Exterior walls / square-metres | unit | 9 | 300 |  |
| Pressure Cleaning | pressure_retaining_walls | Retaining walls / square-metres | unit | 11 | 300 |  |
| Pressure Cleaning | pressure_commercial_carpark | Commercial carpark or forecourt / square-metres | unit | 4.5 | 650 |  |
| Pressure Cleaning | pressure_bin_pad | Bin pad or greasy service area / square-metres | unit | 12 | 250 |  |
| Pressure Cleaning | pressure_sports_court | Tennis or sports court / square-metres | unit | 5.5 | 1200 |  |
| Pressure Cleaning | pressure_oil_spot | Oil-stain treatment / spots | unit | 45 | 0 | addonOnly, removalDisclaimer |
| Pressure Cleaning | pressure_rust_spot | Rust-stain treatment / spots | unit | 55 | 0 | addonOnly, removalDisclaimer |
| Pressure Cleaning | pressure_gum | Chewing-gum removal / items | unit | 7 | 0 | addonOnly |
| House and Building Washing | house_wash_single | Single-storey house wash / properties | fixed | 550 | 0 |  |
| House and Building Washing | house_wash_double | Double-storey house wash / properties | fixed | 880 | 0 |  |
| House and Building Washing | house_wash_three | Three-storey house wash / properties | fixed | 1250 | 0 | manual, requiresPhotos, fromPrice |
| House and Building Washing | building_walls_single | Ground/single-storey exterior walls / square-metres | unit | 6.5 | 450 |  |
| House and Building Washing | building_walls_double | Double-storey exterior walls / square-metres | unit | 8.5 | 650 |  |
| House and Building Washing | building_eaves | Eaves, fascias and soffits only / linear-metres | unit | 9 | 300 |  |
| House and Building Washing | building_awning | Awning or canopy washing / square-metres | unit | 12 | 250 |  |
| House and Building Washing | building_oxidation | Oxidation/chalking cleaning treatment / square-metres | unit | 18 | 350 | requiresPhotos |
| Roof Cleaning | roof_concrete_single | Concrete-tile roof, single storey / square-metres | unit | 10.5 | 1050 | requiresPhotos |
| Roof Cleaning | roof_terracotta_single | Terracotta roof, single storey / square-metres | unit | 12.8 | 1280 | requiresPhotos |
| Roof Cleaning | roof_metal_single | Metal roof, single storey / square-metres | unit | 8.5 | 850 | requiresPhotos |
| Roof Cleaning | roof_treatment_only | Roof treatment only / square-metres | unit | 6.5 | 650 | requiresPhotos |
| Roof Cleaning | roof_access_double | Double-storey roof access allowance / properties | fixed | 250 | 0 | addonOnly, accessAllowance |
| Roof Cleaning | roof_access_steep | Steep or complex roof allowance / properties | fixed | 350 | 0 | addonOnly, manual, requiresPhotos, accessAllowance |
| Roof Cleaning | roof_solar_setup | Solar-panel protection and setup / arrays | unit | 75 | 0 | addonOnly |
| Gutter Cleaning | gutter_package_single | Standard single-storey home / properties | fixed | 350 | 0 |  |
| Gutter Cleaning | gutter_package_double | Standard double-storey home / properties | fixed | 495 | 0 |  |
| Gutter Cleaning | gutter_single | Single-storey gutters / linear-metres | unit | 9 | 300 |  |
| Gutter Cleaning | gutter_double | Double-storey gutters / linear-metres | unit | 12.5 | 450 |  |
| Gutter Cleaning | gutter_guard | Gutter-guard cleaning allowance / linear-metres | unit | 8 | 150 | addonOnly |
| Gutter Cleaning | gutter_downpipe | Blocked downpipe flush / downpipes | unit | 55 | 0 | addonOnly |
| Gutter Cleaning | gutter_brightening | Exterior gutter brightening / linear-metres | unit | 7 | 250 | addonOnly |
| Gutter Cleaning | gutter_valley | Roof-valley debris removal / linear-metres | unit | 12 | 100 | addonOnly |
| Solar-Panel Cleaning | solar_residential | Residential solar-panel system / solar-panels | solar-tier | 1–12:$150;13–24:$220;25–40:$340;extra:$9 | 0 |  |
| Solar-Panel Cleaning | solar_commercial | Commercial solar array / solar-panels | unit | 8 | 450 |  |
| Solar-Panel Cleaning | solar_bird_treatment | Heavy bird-dropping treatment / solar-panels | unit | 6 | 0 | addonOnly |
| Carpet Cleaning | carpet_standard_bedroom | Standard bedroom up to 14 m2 / rooms | unit | 35 | 120 |  |
| Carpet Cleaning | carpet_large_room | Large bedroom or office, 15-25 m2 / rooms | unit | 55 | 120 |  |
| Carpet Cleaning | carpet_lounge | Lounge/living room up to 30 m2 / rooms | unit | 70 | 120 |  |
| Carpet Cleaning | carpet_extra_area | Area above room allowance / square-metres | unit | 4 | 0 | addonOnly |
| Carpet Cleaning | carpet_hallway | Hallway / linear-metres | unit | 7 | 120 |  |
| Carpet Cleaning | carpet_stairs | Carpeted stairs / steps | unit | 8 | 120 |  |
| Carpet Cleaning | carpet_landing | Stair landing / landings | unit | 25 | 120 |  |
| Carpet Cleaning | carpet_rug_small | Small rug up to 2 m2 / rugs | unit | 25 | 120 |  |
| Carpet Cleaning | carpet_rug_medium | Medium rug, 2-5 m2 / rugs | unit | 55 | 120 |  |
| Carpet Cleaning | carpet_rug_large | Large rug, 5-9 m2 / rugs | unit | 90 | 120 |  |
| Carpet Cleaning | carpet_commercial | Commercial carpet extraction / square-metres | unit | 5.5 | 350 |  |
| Carpet Cleaning | carpet_stain | Specialist stain treatment / spots | unit | 25 | 0 | addonOnly, removalDisclaimer |
| Carpet Cleaning | carpet_odour | Pet urine or odour treatment / rooms | unit | 45 | 0 | addonOnly |
| Upholstery Cleaning | upholstery_dining_seat | Dining-chair seat only / chairs | unit | 25 | 120 |  |
| Upholstery Cleaning | upholstery_dining_back | Dining-chair seat and upholstered back / chairs | unit | 38 | 120 |  |
| Upholstery Cleaning | upholstery_office_chair | Office chair / chairs | unit | 35 | 150 |  |
| Upholstery Cleaning | upholstery_armchair | Armchair / chairs | unit | 75 | 120 |  |
| Upholstery Cleaning | upholstery_recliner | Recliner / chairs | unit | 85 | 120 |  |
| Upholstery Cleaning | upholstery_sofa_two | Two-seater sofa / sofas | unit | 120 | 120 |  |
| Upholstery Cleaning | upholstery_sofa_three | Three-seater sofa / sofas | unit | 150 | 120 |  |
| Upholstery Cleaning | upholstery_sofa_four | Four-seater sofa / sofas | unit | 190 | 120 |  |
| Upholstery Cleaning | upholstery_chaise | Chaise section / sections | unit | 50 | 120 |  |
| Upholstery Cleaning | upholstery_modular | Modular lounge / seats | unit | 55 | 120 |  |
| Upholstery Cleaning | upholstery_ottoman | Ottoman / items | unit | 45 | 120 |  |
| Upholstery Cleaning | upholstery_bedhead | Fabric bedhead / items | unit | 75 | 120 |  |
| Upholstery Cleaning | upholstery_stain | Specialist stain treatment / spots | unit | 25 | 0 | addonOnly, removalDisclaimer |
| Upholstery Cleaning | upholstery_odour | Pet hair or odour treatment / seats | unit | 15 | 0 | addonOnly |
| Upholstery Cleaning | upholstery_protector | Fabric protector / seats | unit | 22 | 0 | addonOnly |
| Mattress Cleaning | mattress_cot | Cot mattress, both sides / mattresses | unit | 70 | 0 |  |
| Mattress Cleaning | mattress_single | Single mattress, both sides / mattresses | unit | 95 | 0 |  |
| Mattress Cleaning | mattress_king_single | King single mattress, both sides / mattresses | unit | 110 | 0 |  |
| Mattress Cleaning | mattress_double | Double mattress, both sides / mattresses | unit | 130 | 0 |  |
| Mattress Cleaning | mattress_queen | Queen mattress, both sides / mattresses | unit | 150 | 0 |  |
| Mattress Cleaning | mattress_king | King mattress, both sides / mattresses | unit | 175 | 0 |  |
| Mattress Cleaning | mattress_one_side | One-side-only reduction / mattresses | unit | -30 | 0 | addonOnly |
| Mattress Cleaning | mattress_odour | Urine or odour treatment / mattresses | unit | 55 | 0 | addonOnly |
| Mattress Cleaning | mattress_base | Upholstered bed base / items | unit | 65 | 0 | addonOnly |
| Tile and Grout Cleaning | tile_residential_floor | Residential tile and grout floor / square-metres | unit | 10.5 | 350 |  |
| Tile and Grout Cleaning | tile_wall | Bathroom or kitchen wall tiles / square-metres | unit | 14 | 250 |  |
| Tile and Grout Cleaning | tile_shower | Shower enclosure deep clean / showers | unit | 220 | 220 |  |
| Tile and Grout Cleaning | tile_commercial_floor | Commercial tile and grout floor / square-metres | unit | 9.5 | 550 |  |
| Tile and Grout Cleaning | tile_heavy_soil | Heavy grease or soil treatment / square-metres | unit | 4 | 100 | addonOnly |
| Hard-Floor Deep Cleaning | floor_rubber_gym | Rubber gym flooring / square-metres | unit | 8.5 | 550 |  |
| Hard-Floor Deep Cleaning | floor_vinyl | Vinyl or vinyl-plank flooring / square-metres | unit | 7.5 | 450 |  |
| Hard-Floor Deep Cleaning | floor_epoxy | Epoxy or sealed concrete / square-metres | unit | 7 | 450 |  |
| Hard-Floor Deep Cleaning | floor_non_slip | Non-slip commercial flooring / square-metres | unit | 10.5 | 550 |  |
| Hard-Floor Deep Cleaning | floor_edges | Detailed edges or under-machine cleaning / linear-metres | unit | 8 | 100 | addonOnly |
| Residential Deep Cleaning | deep_1_1 | 1 bedroom / 1 bathroom / properties | fixed | 420 | 0 |  |
| Residential Deep Cleaning | deep_2_1 | 2 bedrooms / 1 bathroom / properties | fixed | 550 | 0 |  |
| Residential Deep Cleaning | deep_3_2 | 3 bedrooms / 2 bathrooms / properties | fixed | 750 | 0 |  |
| Residential Deep Cleaning | deep_4_2 | 4 bedrooms / 2 bathrooms / properties | fixed | 950 | 0 |  |
| Residential Deep Cleaning | deep_5_3 | 5 bedrooms / 3 bathrooms / properties | fixed | 1250 | 0 |  |
| Residential Deep Cleaning | deep_extra_bedroom | Additional bedroom / rooms | unit | 90 | 0 | addonOnly |
| Residential Deep Cleaning | deep_extra_bathroom | Additional bathroom / bathrooms | unit | 125 | 0 | addonOnly |
| Residential Deep Cleaning | deep_kitchen | Kitchen deep clean / kitchens | unit | 260 | 0 | addonOnly |
| Residential Deep Cleaning | deep_oven | Oven interior / ovens | unit | 120 | 0 | addonOnly |
| Residential Deep Cleaning | deep_cabinets | Cupboard/cabinet interiors / doors-drawers | unit | 10 | 100 | addonOnly |
| Residential Deep Cleaning | deep_walls | Interior wall washing / square-metres | unit | 7.5 | 250 | addonOnly |
| Residential Deep Cleaning | deep_appliance | Appliance interior/exterior / appliances | unit | 55 | 0 | addonOnly |
| End-of-Lease Cleaning | eol_1_1 | 1 bedroom / 1 bathroom / properties | fixed | 480 | 0 |  |
| End-of-Lease Cleaning | eol_2_1 | 2 bedrooms / 1 bathroom / properties | fixed | 620 | 0 |  |
| End-of-Lease Cleaning | eol_3_2 | 3 bedrooms / 2 bathrooms / properties | fixed | 780 | 0 |  |
| End-of-Lease Cleaning | eol_4_2 | 4 bedrooms / 2 bathrooms / properties | fixed | 980 | 0 |  |
| End-of-Lease Cleaning | eol_5_3 | 5 bedrooms / 3 bathrooms / properties | fixed | 1280 | 0 |  |
| Hourly Cleaning | hourly_general | General cleaning / labour-hours | unit | 65 | 195 |  |
| Hourly Cleaning | hourly_deep | Deep cleaning / labour-hours | unit | 80 | 320 |  |
| Hourly Cleaning | hourly_specialist | Specialist detailing / labour-hours | unit | 95 | 380 |  |
| Hourly Cleaning | hourly_commercial_recurring | Recurring commercial cleaning / labour-hours | unit | 65 | 195 |  |
| Hourly Cleaning | hourly_commercial_adhoc | Ad-hoc commercial cleaning / labour-hours | unit | 75 | 300 |  |
| Builders Cleaning | builders_rough | Builders rough clean / square-metres | unit | 4.5 | 850 | manual, requiresPhotos |
| Builders Cleaning | builders_final | Builders final clean / square-metres | unit | 6.5 | 1200 | manual, requiresPhotos |
| Builders Cleaning | builders_staged | Complete staged builders clean / square-metres | unit | 10.5 | 1800 | manual, requiresPhotos |
| Builders Cleaning | builders_sparkle | Final sparkle/detail clean / square-metres | unit | 3.5 | 650 | manual, requiresPhotos |
| Commercial Cleaning Additions | commercial_after_hours | After-hours/night attendance / properties | fixed | 120 | 0 | addonOnly |
| Commercial Cleaning Additions | commercial_restocking | Consumables-restocking labour / visits | unit | 35 | 0 | addonOnly |
| Commercial Cleaning Additions | commercial_induction | Security or site-induction allowance / properties | fixed | 75 | 0 | addonOnly, fromPrice |
| Commercial Cleaning Additions | commercial_public_controls | Wastewater or public-access controls / properties | fixed | 150 | 0 | addonOnly, fromPrice |
| Gym Specialty Cleaning | gym_maintenance_small | Maintenance clean, small machine / machines | unit | 15 | 300 |  |
| Gym Specialty Cleaning | gym_maintenance_medium | Maintenance clean, medium machine / machines | unit | 25 | 300 |  |
| Gym Specialty Cleaning | gym_maintenance_large | Maintenance clean, large/cardio machine / machines | unit | 40 | 300 |  |
| Gym Specialty Cleaning | gym_detail_small | Deep detail, small machine / machines | unit | 30 | 450 |  |
| Gym Specialty Cleaning | gym_detail_medium | Deep detail, medium machine / machines | unit | 50 | 450 |  |
| Gym Specialty Cleaning | gym_detail_large | Deep detail, large/cardio machine / machines | unit | 75 | 450 |  |
| Gym Specialty Cleaning | gym_fan | Large high-level roof fan / fans | unit | 180 | 360 | requiresPhotos |
| Gym Specialty Cleaning | gym_vent | High-level vent or grille dusting / vents | unit | 25 | 150 |  |
| Gym Specialty Cleaning | gym_mirrors | Gym mirrors / square-metres | unit | 6.5 | 150 |  |
| Gym Specialty Cleaning | gym_floor | Rubber gym-floor deep cleaning / square-metres | unit | 8.5 | 550 |  |
| Gym Specialty Cleaning | gym_floor_odour | Gym-floor odour treatment / square-metres | unit | 1.5 | 120 | addonOnly |
| Gym Specialty Cleaning | gym_monthly_rotation | Monthly rotating deep-clean package / properties | fixed | 1500 | 0 |  |
| Bin Cleaning | bin_residential | Residential wheelie bins / bins | first-additional | first:45;additional:25 | 0 |  |
| Bin Cleaning | bin_commercial | Commercial bin / bins | unit | 65 | 180 |  |
| Bin Cleaning | bin_room | Bin-room deep clean / square-metres | unit | 15 | 250 |  |
| Odour and Sanitising | sanitise_bathroom | Bathroom sanitising treatment / bathrooms | unit | 45 | 0 | addonOnly |
| Odour and Sanitising | sanitise_commercial | Commercial surface sanitising / square-metres | unit | 2.5 | 150 |  |
| Odour and Sanitising | sanitise_carpet | Carpet pet urine/odour treatment / rooms | unit | 45 | 0 | addonOnly |
| Odour and Sanitising | sanitise_upholstery | Upholstery pet hair/odour treatment / seats | unit | 15 | 0 | addonOnly |
| Odour and Sanitising | sanitise_mattress | Mattress urine/odour treatment / mattresses | unit | 55 | 0 | addonOnly |
| Odour and Sanitising | sanitise_gym_floor | Gym-floor odour treatment / square-metres | unit | 1.5 | 120 |  |

## Baseline regression examples

- 40 standard both: original no-travel total $836 incl GST; group count 1, bundle 0%.
- 30 standard both: original no-travel total $627 incl GST; group count 1, bundle 0%.
- 30 large both: original no-travel total $924 incl GST; group count 1, bundle 0%.
- 30 standard exterior + zero pavers and walls: original no-travel total $658.35 incl GST; group count 2, bundle 5%.
- 20m² concrete + zero walls: original no-travel total $330 incl GST; group count 1, bundle 0%.
- Double-storey house wash: original no-travel total $968 incl GST; group count 1, bundle 0%.

The user’s reported $886/$974 totals include the erroneous $50 travel fee. Required fixed arithmetic, using unchanged master rates and no legitimate travel, is $627/$470.25/$693 incl GST for 40 standard both/30 standard both/30 large both respectively. Those arithmetic checks do not approve the underlying master rates.

## Independent regression and hardening review

The added offline suite is tests/production-pricing-regression.test.cjs. It covers unchanged master rates, the user's reported arithmetic, all 161 codes with zero/negative quantities, all 137 measured codes with missing/invalid quantities, all 24 fixed-job defaults, window scope sides, minimums, promotion and GST rounding, invalid/verified travel, property/access sanity checks, giveaway thresholds, deposits and Afterpay amounts. It does not send enquiries or analytics. Backend/geocoding, subscriptions and browser integration have additional separate suites.

Adversarial review additionally exposed selected nonnumeric quantities being silently ignored, unknown access/condition enums receiving High confidence, invalid whole-unit quantities leaking into scope, duplicate code/package overlap, excess/orphan mattress reductions, and entire-category access exemptions caused by one access-included item. These now require review or are excluded when no legitimate purchase supports them. One shared resolver keeps priced selections and scope identical. Mattress one-side reductions now remove an incorrect both-sides scope promise. Rates remain unchanged; uncertain package/access combinations receive provisional prices and explicit team review.

The existing giveaway rule includes legitimate travel in total job spend; only the threshold tax basis changes to the user-approved $495 including GST after promotion. An invalid/unverified travel charge cannot lift a job over the threshold. This preserves the existing qualifying-spend scope rather than inventing a new travel exclusion.

Square/Afterpay/Zip test coverage is limited to the actual implemented surface: corrected inclusive quote/deposit/full-payment figures. This production baseline has no processor amount-creation path to exercise. Live processor acceptance cannot be claimed from offline arithmetic tests.

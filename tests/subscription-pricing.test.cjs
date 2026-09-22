const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const Pricing = require('../subscription-pricing.js');
const calculate = (planKey='gold', fields={}, propertyType='house', services) => Pricing.calculatePricing({planKey, propertyType, fields:{conditionLevel:'light',...fields}, ...(services === undefined ? {} : {services})});
const normal = result => [result.firstBreakdown.normalExGst, result.recurringBreakdown.normalExGst];
const defaults = key => Object.entries(Pricing.config.plans[key].defaults).map(([serviceId,frequency]) => ({serviceId,frequency}));

for (const [key, first, monthly] of [['bronze',599,399],['silver',799,549],['gold',1099,749],['platinum',1599,1199],['custom',799,549]]) {
  test(key + ': package inclusions counted once, 10% only, GST once, exact annual recurring', () => {
    const r = calculate(key);
    assert.deepEqual(normal(r),[first, monthly]);
    for (const breakdown of [r.firstBreakdown,r.recurringBreakdown]) {
      assert.equal(breakdown.classification,'subscription');
      assert.equal(breakdown.campaign.rate,.10);
      assert.equal(breakdown.discountCents, Math.round(breakdown.normalExGstCents*.1));
      assert.equal(breakdown.subtotalExGstCents, breakdown.normalExGstCents-breakdown.discountCents);
      assert.equal(breakdown.gstCents, Math.round(breakdown.subtotalExGstCents*.1));
      assert.equal(breakdown.totalIncGstCents, breakdown.subtotalExGstCents+breakdown.gstCents);
    }
    assert.equal(r.annualRecurringIncGstCents, r.recurringBreakdown.totalIncGstCents*12);
    assert.equal(r.annualGst, r.recurringBreakdown.gstCents*12/100);
    assert.equal(r.requiresReview,false);
    assert.equal(r.worker.visits,Pricing.config.plans[key].visits);
  });
}
test('production commercial configuration is preserved verbatim', () => {
  const original=execFileSync('git',['show','07e8e60:subscription-builder.js'],{encoding:'utf8'});
  const literal=original.match(/const SUBSCRIPTION_PRICING_CONFIG = ([\s\S]*?\n  });/)[1];
  const config=JSON.parse(JSON.stringify(vm.runInNewContext('(' + literal + ')')));
  assert.deepEqual(Pricing.config,config);
});
test('extra bedroom and storey rates stay at $75/$50 and $200/$150 before discount', () => {
  const r=calculate('gold',{houseBedrooms:5,houseStoreys:2});
  assert.deepEqual(normal(r),[1374,949]);
  assert.equal(r.recurringBreakdown.totalIncGst,939.51);
  assert.ok(r.notes.some(n=>n.includes('1 additional')));
});
test('explicit second worker charged once for Bronze and not added for Gold', () => {
  assert.deepEqual(normal(calculate('bronze',{teamPreference:'2'})),[739,519]);
  assert.deepEqual(normal(calculate('gold',{teamPreference:'2'})),[1099,749]);
});
test('worker auto-selection and visit count do not multiply subscription price', () => {
  const r=calculate('gold',{houseBedrooms:7,teamPreference:'auto'});
  assert.deepEqual(normal(r),[1324,899]);
  assert.equal(r.worker.workers,2);
  assert.ok(r.worker.monthlyLabour>0);
});
test('included frequency upgrades charge only the incremental monthly service amount', () => {
  const services=defaults('gold').map(item=>item.serviceId==='interior-windows'?{...item,frequency:'Monthly'}:item);
  assert.deepEqual(normal(calculate('gold',{},'house',services)),[1099,787]);
});
test('new additional service retains first-clean and frequency rates', () => {
  assert.deepEqual(normal(calculate('gold',{},'house',[...defaults('gold'),{serviceId:'carpet-cleaning',frequency:'Quarterly'}])),[1194,834]);
});
test('removed package inclusions and reduced frequency require reviewed credit, not silently repriced package', () => {
  const r=calculate('gold',{},'house',[]);
  assert.deepEqual(normal(r),[1099,749]); assert.equal(r.requiresReview,true);
  const less=defaults('gold').map(item=>item.serviceId==='exterior-windows'?{...item,frequency:'Quarterly'}:item);
  assert.equal(calculate('gold',{},'house',less).requiresReview,true);
});
test('pool presence and selected pool frequency never double charge', () => {
  const services=[...defaults('gold'),{serviceId:'pool-cleaning',frequency:'Monthly'}];
  assert.deepEqual(normal(calculate('gold',{housePool:'yes'},'house',services)),[1164,894]);
});
test('pool removal removes selected pool charges and scope', () => {
  const r=calculate('gold',{housePool:'yes',removePoolService:true},'house',[...defaults('gold'),{serviceId:'pool-cleaning',frequency:'Monthly'}]);
  assert.deepEqual(normal(r),[1099,749]); assert.ok(!r.services.some(s=>s.serviceId==='pool-cleaning'));
});
test('pool swaps do not charge the removed pool and flag replacement for confirmation', () => {
  const r=calculate('gold',{housePool:'yes',swapPoolGeneral:true},'house',[...defaults('gold'),{serviceId:'pool-cleaning',frequency:'Monthly'}]);
  assert.deepEqual(normal(r),[1099,749]); assert.equal(r.requiresReview,true);
});
test('apartment balcony quantities zero or negative never add a flat charge or scope', () => {
  for(const quantity of [0,-1]) {
    const r=calculate('gold',{accessibleBalconyGlass:'yes',balconyPanels:quantity,glassDoors:0},'apartment',[...defaults('gold'),{serviceId:'balcony-glass',frequency:'Monthly'}]);
    assert.deepEqual(normal(r),[1024,699]); assert.equal(r.requiresReview,true);
    assert.ok(!r.services.some(s=>s.serviceId==='balcony-glass'));
  }
});
test('unselected zero balcony quantities do not alter price or require review', () => {
  const r=calculate('gold',{accessibleBalconyGlass:'no',balconyPanels:0,glassDoors:0},'apartment');
  assert.deepEqual(normal(r),[1024,699]); assert.equal(r.requiresReview,false);
});
test('balcony panel and door allowances use actual quantities and existing rates once', () => {
  const r=calculate('gold',{accessibleBalconyGlass:'yes',balconyPanels:12,glassDoors:2},'apartment');
  assert.deepEqual(normal(r),[1129,779]);
  assert.ok(r.notes.some(n=>n.includes('12 selected panel(s)')&&n.includes('2 extra')));
});
test('balcony service frequency upgrade does not double-charge property allowance', () => {
  const r=calculate('gold',{accessibleBalconyGlass:'yes',balconyPanels:10,glassDoors:0},'apartment',[...defaults('gold'),{serviceId:'balcony-glass',frequency:'Monthly'}]);
  assert.deepEqual(normal(r),[1099,769]);
});
test('apartment stairs asked twice are charged once', () => {
  const one=calculate('gold',{apartmentStairsOnly:'yes'},'apartment');
  const both=calculate('gold',{apartmentStairsOnly:'yes',logisticsStairsOnly:'yes'},'apartment');
  assert.deepEqual(normal(one),normal(both));
});
test('strata access and booking questions are deduplicated across form steps', () => {
  const r=calculate('gold',{strataAccessComplexity:'difficult',accessDifficulty:'difficult',strataBookingRequired:'yes',bodyCorporateBooking:'yes'},'strata');
  assert.deepEqual(normal(r),[1399,979]);
});
test('difficult general access upgrades existing controlled strata access instead of adding it twice', () => {
  const r=calculate('gold',{strataAccessComplexity:'controlled',accessDifficulty:'difficult'},'strata');
  assert.deepEqual(normal(r),[1299,899]);
});
test('strata units, floors and common-area allowances preserve existing rates', () => {
  assert.deepEqual(normal(calculate('gold',{strataUnits:6,strataFloors:3,strataAreaSize:'medium'},'strata')),[1649,1129]);
});
test('duplicated priority and event-ready selectors charge selected service once', () => {
  const services=[...defaults('gold'),{serviceId:'priority-response-clean',frequency:'Monthly'},{serviceId:'event-ready-clean',frequency:'Monthly'}];
  assert.deepEqual(normal(calculate('gold',{priorityResponse:true,eventReadyClean:true},'house',services)),[1299,899]);
});
test('standard/heavy/first-professional condition rates preserved and itemized', () => {
  for(const [condition,amount] of [['standard',75],['heavy',250],['firstProfessional',350]]) {
    const r=calculate('gold',{conditionLevel:condition}); assert.equal(r.firstBreakdown.normalExGst,1099+amount);
    assert.ok(r.adjustments.some(row=>row.label.includes(condition)&&row.firstClean===amount));
  }
});
test('unknown condition and unsafe/unconfirmed access produce review instead of speculative extra fees', () => {
  const r=calculate('gold',{conditionLevel:'unknown',safeEquipmentAccess:'no',waterSource:'none'});
  assert.deepEqual(normal(r),[1099,749]); assert.equal(r.requiresReview,true); assert.ok(r.reviewReasons.length>=2);
});
test('high-rise scope excludes inaccessible exterior work and requires confirmation', () => {
  const r=calculate('gold',{},'highrise'); assert.equal(r.requiresReview,true);
  assert.ok(!r.services.some(s=>s.serviceId==='exterior-windows'));
});
test('hidden property-type quantities are ignored even when invalid', () => {
  assert.deepEqual(normal(calculate('gold',{balconyPanels:Infinity,strataFloors:'junk'},'house')),[1099,749]);
});
test('invalid/duplicate services, invalid plans, non-finite quantities and promotional codes fail closed', () => {
  assert.throws(()=>calculate('missing'),/valid subscription/);
  assert.throws(()=>calculate('gold',{houseStoreys:Infinity}),/whole quantity/);
  assert.throws(()=>calculate('gold',{},'house',[...defaults('gold'),defaults('gold')[0]]),/duplicate/i);
  assert.throws(()=>calculate('gold',{},'house',[{serviceId:'carpet-cleaning',frequency:'Daily'}]),/Invalid subscription/);
  assert.throws(()=>Pricing.calculatePricing({planKey:'gold',propertyType:'house',promoCode:'GENERAL25'}),/cannot be combined/);
});
test('every adjustment sums exactly to the undiscounted reported amount', () => {
  const r=calculate('gold',{houseBedrooms:6,houseStoreys:2,housePool:'yes',houseGarage:'yes',extraGeneralClean:true,conditionLevel:'heavy'});
  assert.equal(r.adjustments.reduce((s,a)=>s+a.firstClean,0),r.firstBreakdown.normalExGst);
  assert.equal(r.adjustments.reduce((s,a)=>s+a.recurring,0),r.recurringBreakdown.normalExGst);
});

test('one-worker preference on a two-worker package requires reviewed staffing', () => {
  const r=calculate('gold',{teamPreference:'1'});
  assert.deepEqual(normal(r),[1099,749]); assert.equal(r.requiresReview,true);
  assert.ok(r.reviewReasons.some(reason=>reason.includes('staffing')));
});

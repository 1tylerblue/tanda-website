const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../pricing-engine');
const S = require('../subscription-pricing');
const M = require('../money');
const G = require('../giveaway-policy');
const base = { travelBand:'within50', accessDifficulty:'ground', conditionLevel:'standard' };
const examples = [
 ['Single-storey windows',450,337.5,33.75,371.25,[['window_package_single',1]]],
 ['Double-storey windows',650,487.5,48.75,536.25,[['window_package_double',1]]],
 ['Metal roof',850,637.5,63.75,701.25,[['roof_metal_single',100]]],
 ['Carpet 3 rooms',90,67.5,6.75,74.25,[['carpet_standard_bedroom',3]]],
 ['Carpet 4 rooms',110,82.5,8.25,90.75,[['carpet_standard_bedroom',4]]],
 ['Carpet 5 rooms',120,90,9,99,[['carpet_standard_bedroom',5]]],
 ['Gutter with patio',300,225,22.5,247.5,[['gutter_package_single',1]]],
 ['Sofa with chaise',200,150,15,165,[['upholstery_sofa_three',1],['upholstery_chaise',1]]],
];
for(const [name,normal,sale,gst,total,lines] of examples) test(name+' promotion and browser equality',()=>{
 const input={...base,lineItems:lines.map(([code,quantity])=>({code,quantity}))};
 const b=P.calculateEstimate(input).calculationBreakdown;
 assert.deepEqual([b.normalExGst,b.subtotalExGst,b.gst,b.totalIncGst],[normal,sale,gst,total]);
 const browser=vm.createContext({});
 for(const file of ['money.js','pricing-engine.js']) vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),browser);
 assert.equal(JSON.stringify(browser.TAPricing.calculateEstimate(input)),JSON.stringify(P.calculateEstimate(input)));
});
for(const [key,first,monthly] of [['bronze',539.1,359.1],['silver',719.1,494.1],['gold',989.1,674.1],['platinum',1439.1,1079.1]]) {
 test(key+' default inclusions, removal and 10% only',()=>{
  const result=S.calculatePricing({planKey:key,propertyType:'house',classification:'one_off_service',discount:25});
  assert.equal(result.firstClean,first);assert.equal(result.recurring,monthly);
  assert.equal(result.firstBreakdown.campaign.rate,0.1);
  assert.equal(S.calculatePricing({planKey:key,propertyType:'house',services:[]}).recurring,monthly);
  const browser=vm.createContext({});
  for(const file of ['money.js','subscription-pricing.js']) vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),browser);
  assert.equal(JSON.stringify(browser.TASubscriptionPricing.calculatePricing({planKey:key,propertyType:'house'})),JSON.stringify(result));
 });
}
test('subscription upgrades charge only the included frequency difference',()=>{
 const result=S.calculatePricing({planKey:'bronze',propertyType:'house',services:[{serviceId:'interior-windows',frequency:'Monthly',firstAdd:999,recurringAdd:999}]});
 assert.equal(result.firstBreakdown.normalExGst,599);assert.equal(result.recurringBreakdown.normalExGst,399+90-52);
});
test('nonincluded subscription service uses canonical charges',()=>{
 const result=S.calculatePricing({planKey:'bronze',propertyType:'house',services:[{serviceId:'general-cleaning',frequency:'Monthly',firstAdd:0,recurringAdd:0}]});
 assert.equal(result.firstBreakdown.normalExGst,684);assert.equal(result.recurringBreakdown.normalExGst,569);
});
test('irrelevant property fields cannot add subscription charges',()=>{
 const input={planKey:'bronze',propertyType:'house'};
 assert.equal(S.calculatePricing({...input,fields:{balconyPanels:999,strataUnits:999,apartmentBedrooms:999}}).firstClean,S.calculatePricing(input).firstClean);
});
for(const code of ['window_package_double','house_wash_double','gutter_package_double']) test(code+' covers double-storey access',()=>{
 const input={...base,lineItems:[{code,quantity:1}]};
 assert.equal(P.calculateEstimate({...input,accessDifficulty:'double'}).recommendedEstimate,P.calculateEstimate(input).recommendedEstimate);
});
for(const [code,access] of [['roof_access_double','double'],['roof_access_steep','harness']]) test(code+' does not duplicate equivalent access',()=>{
 const input={...base,lineItems:[{code:'roof_metal_single',quantity:100},{code,quantity:1}]};
 assert.equal(P.calculateEstimate({...input,accessDifficulty:access}).recommendedEstimate,P.calculateEstimate(input).recommendedEstimate);
});
test('one minimum per service category and unrelated access still applies',()=>{
 const estimate=P.calculateEstimate({...base,lineItems:[{code:'window_standard_exterior',quantity:1},{code:'window_standard_interior',quantity:1}]});
 assert.equal(estimate.calculationBreakdown.normalExGst,180);
 const mixed=P.calculateEstimate({...base,accessDifficulty:'double',lineItems:[{code:'window_package_double',quantity:1},{code:'pressure_pavers',quantity:50}]});
 assert.equal(mixed.calculationBreakdown.adjustments.find(a=>a.label==='Access allowance').amountExGst,56.25);
});
test('client totals, classification and discount are ignored; coupons rejected',()=>{
 const input={...base,lineItems:[{code:'window_package_single',quantity:1}]};
 assert.equal(P.calculateEstimate({...input,classification:'subscription',total:1,discount:10,subtotalExGst:1}).recommendedEstimateIncGst,371.25);
 assert.equal(P.calculateEstimate({...input,...P.calculateEstimate(input)}).recommendedEstimateIncGst,371.25);
 assert.ok(P.validateInput({...input,couponCode:'MORE'}).length);
 assert.throws(()=>S.calculatePricing({planKey:'bronze',propertyType:'house',couponCode:'MORE'}));
});
test('whole quantity validation rejects invalid and duplicate entries',()=>{
 for(const quantity of [-1,0,1.5,10001,Infinity,'bad']) assert.ok(P.validateInput({lineItems:[{code:'carpet_standard_bedroom',quantity}]}).length);
 assert.ok(P.validateInput({lineItems:[{code:'window_package_single',quantity:2}]}).length);
 assert.equal(P.validateInput({lineItems:[{code:'roof_metal_single',quantity:150.1}]}).length,0);
 assert.throws(()=>S.calculatePricing({planKey:'bronze',propertyType:'house',fields:{houseBedrooms:2.5}}));
});
test('decimal cents and half-cent discount/GST round once',()=>{
 assert.equal(M.toCents(1.005),101);assert.equal(M.scaleCents(101,0.25),25);
 assert.deepEqual([M.promotion(101,'one_off_service').discountCents,M.promotion(101,'one_off_service').gstCents],[25,8]);
 assert.throws(()=>M.promotion(100,'invalid'));
});
for(const [amount,eligible] of [[49499,false],[49500,true],[49501,true]]) test('paid giveaway boundary '+amount,()=>{
 const record={finalDiscountedIncGstCents:amount,paidCents:Math.ceil(amount/2),method:'standard',status:'paid',paidAt:'2026-09-21T10:00:00+10:00'};
 assert.equal(G.qualifies(record),eligible);
 assert.equal(G.qualifies({...record,status:'refunded'}),false);assert.equal(G.qualifies({...record,status:'cancelled'}),false);
 assert.equal(G.qualifies({...record,paidCents:0}),false);assert.equal(G.qualifies({...record,method:'afterpay'}),false);
 assert.equal(G.qualifies({...record,method:'afterpay',paidCents:amount}),eligible);
 assert.equal(G.qualifies({...record,paidAt:'2026-10-23T20:00:00+10:00'}),false);
});

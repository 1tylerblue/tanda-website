import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import pricingEngine from '../../pricing-engine.js';
import subscriptionPricing from '../../subscription-pricing.js';
import { resolveTravelPricing } from '../src/travel.js';
import { buildLeadText } from '../src/mailer.js';

// Isolated temporary storage, local email sink and a hard external network block.
const originalCwd = process.cwd();
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tanda-pricing-backend-'));
process.chdir(testDirectory);
for (const key of ['SMTP_HOST','SMTP_PASS','GMAIL_APP_PASSWORD','EMAIL_WEBHOOK_URL','EMAIL_WEBHOOK_SECRET']) process.env[key] = '';
process.env.LEAD_RATE_LIMIT_MAX = '100';
const originalGet = https.get;
https.get = () => { throw new Error('External HTTPS is disabled in regression tests.'); };
const receivedEmails = [];
const sink = http.createServer(async (req, res) => {
  let raw=''; for await (const chunk of req) raw += chunk;
  receivedEmails.push(JSON.parse(raw));
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
});
await new Promise(resolve => sink.listen(0,'127.0.0.1',resolve));
process.env.EMAIL_WEBHOOK_URL = `http://127.0.0.1:${sink.address().port}/mail-sink`;
process.env.EMAIL_WEBHOOK_SECRET = 'local-test-only';
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (new URL(url).hostname !== '127.0.0.1') throw new Error('Only local test HTTP is allowed.');
  return originalFetch(url, options);
};
const { app, normalizeLineItems } = await import('../src/server.js');
const server = await new Promise(resolve => { const listener=app.listen(0,'127.0.0.1',()=>resolve(listener)); });
const origin = `http://127.0.0.1:${server.address().port}`;
let serial = 0;
const lead = (overrides={}) => ({
  firstName:'Synthetic regression', phone:`0400${String(++serial).padStart(6,'0')}`, email:'test@example.invalid',
  address:'test', service:'window-cleaning', serviceGroup:'window-cleaning', pricingItemCode:'window_standard_both',
  lineItems:[{ code:'window_standard_both', quantity:40 }], propertyType:'Residential', storeys:'1', rooms:'3-4',
  serviceArea:'Both', scopeQuantity:40, scopeUnit:'windows', accessDifficulty:'ground', conditionLevel:'standard',
  recurringFrequency:'one_off', timingLoading:'standard', agree:true, formElapsedMs:30000,
  ...overrides,
});
async function post(endpoint, body) { const response=await fetch(origin+endpoint,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) }); return {status:response.status,body:await response.json()}; }

try {
  await test('travel API responds safely for blank and nonsense addresses without external calls', async () => {
    for (const address of ['', 'test', 'asdf']) {
      const response = await fetch(`${origin}/api/travel-distance?address=${encodeURIComponent(address)}`);
      assert.equal(response.status,200);
      const body=await response.json();
      assert.equal(body.travelFeeIncGst,0); assert.equal(body.distanceKm,null);
      assert.equal(body.travelStatus,'requires address confirmation');
    }
  });
  await test('backend keeps explicit zero distinct from missing selected quantity', () => {
    assert.deepEqual(normalizeLineItems([{code:'pressure_pavers',quantity:0},{code:'pressure_exterior_walls',selected:true}]),[
      {code:'pressure_pavers',quantity:0,selected:false},{code:'pressure_exterior_walls',quantity:null,selected:true}
    ]);
  });
  await test('Test A: server rejects forged travel and total, emails the exact $627 result', async () => {
    const response=await post('/api/leads',lead({addressVerified:true,travelBand:'beyond50',travelDistanceKm:238.9,travelFeeIncGst:50,recommendedEstimateIncGst:886,customerScope:['forged scope']}));
    assert.equal(response.status,201);
    const result=response.body;
    assert.equal(result.recommendedEstimateIncGst,627);
    assert.equal(result.pricingPolicyVersion,'T&A-PRICING-FIX-2026-09-23');
    assert.equal(result.calculationBreakdown.discount,190); assert.equal(result.calculationBreakdown.gst,57);
    assert.equal(result.lead.travelFeeIncGst,0); assert.equal(result.lead.travelDistanceKm,null);
    assert.equal(result.lead.addressVerified,false); assert.notEqual(result.accuracyLevel,'High');
    assert.equal(result.depositIncGst,313.5); assert.equal(result.afterpayFullPaymentIncGst,627);
    const email=receivedEmails.at(-1).text;
    assert.match(email,/- Normal service subtotal ex GST: 760/);
    assert.match(email,/Pricing policy version: T&A-PRICING-FIX-2026-09-23/);
    assert.match(email,/- Promotion .*190 ex GST/); assert.match(email,/- GST: 57/);
    assert.match(email,/- Total incl\. GST: 627/); assert.doesNotMatch(email,/238\.9 km|forged scope/);
  });
  await test('Test E: zero pressure items produce neither scope nor minimum nor bundle', async () => {
    const response=await post('/api/leads',lead({propertyType:'Commercial',storeys:'2',serviceArea:'Exterior',pricingItemCode:'window_standard_exterior',scopeQuantity:30,lineItems:[{code:'window_standard_exterior',quantity:30},{code:'pressure_pavers',quantity:0},{code:'pressure_exterior_walls',quantity:0}]}));
    assert.equal(response.status,201);
    const result=response.body;
    assert.equal(result.recommendedEstimateIncGst,272.25);
    assert.equal(result.calculationBreakdown.groups.length,1);
    assert.equal(result.calculationBreakdown.lines.length,1);
    assert.equal(result.lead.internalCalculation.eligibleServiceCount,1);
    assert.equal(result.lead.internalCalculation.bundleRate,0);
    const scope=result.customerScope.join(' ');
    assert.match(scope,/Exterior window glass cleaned/); assert.doesNotMatch(scope,/Interior|Pavers|Exterior walls/);
  });
  await test('pressure cleaning minimum applies only to the actual 20 m2 concrete job', async () => {
    const response=await post('/api/leads',lead({pricingItemCode:'pressure_concrete',service:'pressure-cleaning',scopeQuantity:20,lineItems:[{code:'pressure_concrete',quantity:20},{code:'pressure_exterior_walls',quantity:0},{code:'pressure_retaining_walls',quantity:0}]}));
    assert.equal(response.status,201); assert.equal(response.body.recommendedEstimateIncGst,206.25);
    assert.equal(response.body.calculationBreakdown.lines.length,1);
    assert.doesNotMatch(response.body.customerScope.join(' '),/Exterior walls|Retaining walls/);
  });
  await test('giveaway uses final GST-inclusive amount after promotion, including exact threshold', async () => {
    // At $19 per window 30 falls below $495 despite a pre-discount base above it.
    const below=await post('/api/leads',lead({scopeQuantity:30,lineItems:[{code:'window_standard_both',quantity:30}]}));
    assert.equal(below.body.recommendedEstimateIncGst,470.25); assert.equal(below.body.eligibleForGiveaway,false);
    // $450 window package + $150 three-seater sofa = $600 normal -> $450 discounted + $45 GST.
    const threshold=await post('/api/leads',lead({pricingItemCode:'window_package_single',scopeQuantity:1,lineItems:[{code:'window_package_single',quantity:1},{code:'upholstery_sofa_three',quantity:1}]}));
    assert.equal(threshold.body.recommendedEstimateIncGst,495);
    assert.equal(threshold.body.eligibleForGiveaway,true);
  });
  await test('server preserves explicit commercial ground access confirmation', async () => {
    const response=await post('/api/leads',lead({propertyType:'Commercial',storeys:'3',allGlassGroundAccessible:'on'}));
    assert.equal(response.status,201); assert.equal(response.body.lead.allGlassGroundAccessible,true);
    assert.notEqual(response.body.accuracyLevel,'High'); // unverified location still prevents High.
  });
  await test('a verified Brisbane route adds the legitimate $50 GST-inclusive travel exactly once', async () => {
    const address='Brisbane QLD 4000';
    await resolveTravelPricing(address, async url => url.hostname === 'photon.komoot.io' ? {features:[{geometry:{coordinates:[153.0251,-27.4698]},properties:{name:'Brisbane',state:'Queensland',postcode:'4000',country:'Australia',countrycode:'AU',osm_key:'place',osm_value:'city'}}]} : {code:'Ok',routes:[{distance:73500}]});
    const response=await post('/api/leads',lead({address,travelFeeIncGst:999}));
    assert.equal(response.status,201); assert.equal(response.body.recommendedEstimateIncGst,677);
    assert.equal(response.body.lead.addressVerified,true); assert.equal(response.body.lead.travelDistanceKm,73.5);
    assert.equal(response.body.lead.travelFeeIncGst,50); assert.equal(response.body.depositIncGst,338.5);
    assert.equal(response.body.afterpayFullPaymentIncGst,677);
    assert.match(receivedEmails.at(-1).text,/- Total incl\. GST: 677/);
    assert.match(buildLeadText({...response.body.lead, travelDistanceKm:0}),/- Travel: 0 km from Biggera Waters/);
  });
  await test('Test C: 30 large panels yield $693, not $974', async () => {
    const response=await post('/api/leads',lead({propertyType:'Apartment / Unit',storeys:'2',pricingItemCode:'window_large_both',scopeQuantity:30,lineItems:[{code:'window_large_both',quantity:30}]}));
    assert.equal(response.status,201); assert.equal(response.body.recommendedEstimateIncGst,693);
    assert.equal(response.body.calculationBreakdown.discount,210); assert.equal(response.body.calculationBreakdown.gst,63);
  });
  await test('invalid supplied fixed-job quantities never become one billable property', async () => {
    for (const quantity of ['abc','Infinity']) {
      const response=await post('/api/leads',lead({lineItems:[{code:'window_standard_both',quantity:40},{code:'house_wash_double',quantity,selected:false}]}));
      assert.equal(response.status,201); assert.equal(response.body.recommendedEstimateIncGst,627);
      assert.equal(response.body.manualReviewRequired,true);
      assert.equal(response.body.calculationBreakdown.lines.length,1);
      assert.equal(response.body.lead.lineItems[1].quantity,'invalid');
      assert.match(response.body.estimateReasons.join(' '),/valid quantity/);
      assert.doesNotMatch(response.body.customerScope.join(' '),/Double-storey house wash/);
    }
    const onlyInvalid=await post('/api/leads',lead({pricingItemCode:'house_wash_double',scopeQuantity:1,lineItems:[{code:'house_wash_double',quantity:'abc'}]}));
    assert.equal(onlyInvalid.status,201); assert.equal(onlyInvalid.body.recommendedEstimateIncGst,0);
    assert.equal(onlyInvalid.body.manualReviewRequired,true);
  });
  await test('primary zero quantity prompts correction without saving or mailing', async () => {
    const before=receivedEmails.length;
    const response=await post('/api/leads',lead({scopeQuantity:0,lineItems:[{code:'window_standard_both',quantity:0}]}));
    assert.equal(response.status,400); assert.equal(receivedEmails.length,before);
  });
  for (const planKey of ['bronze','gold','platinum']) {
    await test(`${planKey} subscription HTTP API recomputes amounts and mails 10% discount only`, async () => {
      const pricingInput={planKey,propertyType:'house',fields:{houseBedrooms:3,houseStoreys:1}};
      const expected=subscriptionPricing.calculatePricing(pricingInput);
      const response=await post('/api/subscriptions',{
        pricingInput, customer:{fullName:'Synthetic subscription',phone:'0400000000',email:'test@example.invalid'},
        property:{address:'Test location',suburb:'Biggera Waters',postcode:'4216'},
        plan:{selectedPlan:'Forged plan',firstCleanPrice:99999,recurringMonthlyPrice:99999,annualRecurringPrice:99999,workers:'99 workers'},
        services:[{serviceName:'Unpriced invented service'}]
      });
      assert.equal(response.status,201);
      const actual=response.body.subscription.plan;
      assert.equal(actual.firstCleanPrice,expected.firstBreakdown.totalIncGst);
      assert.equal(actual.recurringMonthlyPrice,expected.recurringBreakdown.totalIncGst);
      assert.equal(actual.annualRecurringPrice,expected.annualRecurringIncGst);
      assert.equal(actual.recurringBreakdown.campaign.rate,.1);
      assert.equal(actual.firstBreakdown.campaign.rate,.1);
      assert.equal(actual.workers,expected.worker.workerText);
      const email=receivedEmails.at(-1).text;
      assert.doesNotMatch(email,/99999|99 workers|Forged plan|Unpriced invented service/);
      assert.match(email,/10% off subscriptions/);
      assert.match(email,new RegExp(`First Clean Price: ${expected.firstBreakdown.totalIncGst}`,'i'));
    });
  }
  await test('stale subscriptions without calculator inputs must recalculate, never trust posted prices', async () => {
    const before=receivedEmails.length;
    const response=await post('/api/subscriptions',{plan:{firstCleanPrice:1954,recurringMonthlyPrice:1532}});
    assert.equal(response.status,400); assert.match(response.body.error,/recalculate/); assert.equal(receivedEmails.length,before);
  });
} finally {
  await new Promise(resolve=>server.close(resolve)); await new Promise(resolve=>sink.close(resolve));
  https.get=originalGet; globalThis.fetch=originalFetch; process.chdir(originalCwd);
  // No user files are touched. Leave the isolated test artifacts for inspection.
  console.log(`Isolated test artifacts: ${testDirectory}`);
}

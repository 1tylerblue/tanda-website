const fs = require('node:fs');
const path = require('node:path');
const Money = require('../money');
const Pricing = require('../pricing-engine');
const Subscriptions = require('../subscription-pricing');
const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const money = n => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const terms = 'One-off services receive 25% off. Subscriptions receive 10% off. Discounts are applied before GST and cannot be combined with another promotional code. Final pricing remains subject to confirmed scope, access and condition.';
const plans = ['bronze','silver','gold','platinum'].map(planKey => Subscriptions.calculatePricing({planKey, propertyType:'house'}));
const examples = {
  'window-cleaning': ['window_package_single', 1],
  'roof-cleaning': ['roof_metal_single', 100],
  'carpet-cleaning': ['carpet_standard_bedroom', 3],
  'gutter-cleaning': ['gutter_package_single', 1],
  'house-washing': ['house_wash_single', 1],
  'solar-panel-cleaning': ['solar_residential', 12],
};
function offer(plan) {
  return {'@type':'Offer', name:plan.plan.label + ' Property Care Subscription', price:plan.recurringBreakdown.totalIncGst.toFixed(2), priceCurrency:'AUD', url:'https://www.tandaprocleaning.com.au/subscription-builder.html?plan='+plan.selectedPlanKey,
    description:`10% off subscriptions. Standard house package first clean ${money(plan.firstBreakdown.totalIncGst)} incl GST; recurring ${money(plan.recurringBreakdown.totalIncGst)}/month incl GST. Scope and upgrades confirmed before booking.`,
    priceSpecification:{'@type':'UnitPriceSpecification',price:plan.recurringBreakdown.totalIncGst.toFixed(2),priceCurrency:'AUD',valueAddedTaxIncluded:true,unitText:'MONTH'}};
}
function priceMarkup(b, suffix='') { return `<s><span class="sr-only">Normal price: </span>${money(b.normalExGst)} ex GST</s><strong>${money(b.totalIncGst)}${suffix} incl GST</strong><small>${money(b.subtotalExGst)} ex GST after ${Math.round(b.campaign.rate*100)}% off</small>`; }
const pages = fs.readdirSync(root).filter(n=>n.endsWith('.html')).concat(...['services','areas'].map(dir=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.html')).map(n=>dir+'/'+n)));
for (const name of pages) {
  const file=path.join(root,name); const before=fs.readFileSync(file,'utf8'); let html=before;
  if (html.includes('<!-- PROMOTION:START -->')) {
    const subscription = name === 'subscription-builder.html';
    const home = name === 'index.html';
    const prefix=name.includes('/')?'../':'';
    let cards=''; let serviceOffer;
    if (subscription) cards=plans.map(plan=>`<article class="promotion-price"><h3>${plan.plan.label} monthly</h3>${priceMarkup(plan.recurringBreakdown,'/month')}<small>First clean ${money(plan.firstBreakdown.totalIncGst)} incl GST</small></article>`).join('');
    const key=Object.keys(examples).find(key=>name.startsWith('services/'+key+'-'));
    const selection=home?examples['window-cleaning']:examples[key];
    if (!subscription && selection && Pricing.getItem(selection[0])) {
      const estimate=Pricing.calculateEstimate({lineItems:[{code:selection[0],quantity:selection[1]}],travelBand:'within50'});
      const b=estimate.calculationBreakdown;
      cards=`<article class="promotion-price"><h3>${Pricing.getItem(selection[0]).label}</h3>${priceMarkup(b)}<small>Standard scope, within 50 km of Biggera Waters${key==='roof-cleaning'?'; up to 100 m² metal roof':''}.</small></article>`;
      if (!home) serviceOffer={'@type':'Offer',price:b.totalIncGst.toFixed(2),priceCurrency:'AUD',description:`25% off. ${Pricing.getItem(selection[0]).label}; ${selection[1]} ${Pricing.unitLabel(Pricing.getItem(selection[0]).unit,selection[1])}. Standard scope within 50 km; includes GST.`,priceSpecification:{'@type':'PriceSpecification',price:b.totalIncGst.toFixed(2),priceCurrency:'AUD',valueAddedTaxIncluded:true}};
    }
    const title=subscription?'10% off subscriptions':'25% off one-off cleaning services';
    const panel=home
      ? `<aside class="promotion-panel promotion-banner" aria-label="Cleaning promotions"><div class="promotion-banner-offer"><h2>25% OFF</h2><p>September Spring Cleaning <span>Storewide*</span></p></div><a class="promotion-banner-cta" href="#quote">Get a free quote <span aria-hidden="true">&rarr;</span></a><p class="promotion-banner-terms">*Subscriptions save 10%. <a href="#promotion-terms">Offer terms</a></p></aside>`
      : `<aside class="promotion-panel" aria-label="Cleaning promotions"><h2>${title}</h2><p>${terms}</p>${cards?`<div class="promotion-prices">${cards}</div>`:''}<p><a href="${subscription?'#subscriptionBuilderForm':prefix+'index.html#quote'}">${subscription?'Build your subscription':'Get your discounted estimate'}</a></p></aside>`;
    html=html.replace(/<!-- PROMOTION:START -->[\s\S]*?<!-- PROMOTION:END -->/,`<!-- PROMOTION:START -->\n${panel}\n<!-- PROMOTION:END -->`);
    html=html.replace(/(<p id="promotion-terms"[^>]*>)[\s\S]*?(<\/p>)/,`$1${terms}$2`);
    html=html.replace(/<span data-plan-price="(bronze|silver|gold|platinum):(first|monthly)">[\s\S]*?<\/span>/g,(_,key,type)=>{
      const plan=plans.find(p=>p.selectedPlanKey===key); const b=type==='first'?plan.firstBreakdown:plan.recurringBreakdown;
      // Avoid nested spans so regeneration is idempotent.
      return `<span data-plan-price="${key}:${type}">${priceMarkup(b,type==='monthly'?'/month':'').replace('<span class="sr-only">Normal price: </span>','Normal: ')}</span>`;
    });
    html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(_,source)=>{
      const json=JSON.parse(source);
      function walk(node) {
        if (!node || typeof node!=='object') return;
        if (node['@type']==='Offer' && /Bronze|Silver|Gold|Platinum/.test(node.name||'')) {
          const plan=plans.find(p=>node.name.startsWith(p.plan.label));
          for(const k of Object.keys(node)) delete node[k]; Object.assign(node,offer(plan));
        }
        if (node['@type']==='Service' && serviceOffer) node.offers=serviceOffer;
        Object.values(node).forEach(walk);
      }
      walk(json);return '<script type="application/ld+json">\n'+JSON.stringify(json,null,2)+'\n</script>';
    });
    html=html.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("\s*\/?>)/g,`$1${title}. ${subscription?'Customise your property care package.':'Professional cleaning across the Gold Coast, Brisbane, Logan and Ipswich.'} Discounts before GST; confirmed scope and access apply.$2`);
  }
  if (check && html!==before) throw new Error('Generated promotion content is stale: '+name);
  if (!check && html!==before) fs.writeFileSync(file,html);
}
console.log('Promotion content '+(check?'verified':'generated')+' from shared pricing.');

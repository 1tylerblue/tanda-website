// Build static links using the existing Window Cleaning button classes and quote funnel.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./service-ctas.json');
const { PRICING_CONFIG } = require('../pricing-engine');
const check = process.argv.includes('--check');
function component(item, position) {
  const href = `../index.html?service=${item.service}#quote`;
  return `<!-- SERVICE-CTA:${position}:START -->\n        <div class="service-hero-actions" data-service-cta="${position}">\n          <a class="btn btn-primary" href="${href}">${item.label}</a>${position === 'hero' ? '\n          <a class="btn btn-outline" href="tel:0466224927">Call 0466 224 927</a>' : ''}\n        </div>\n        <!-- SERVICE-CTA:${position}:END -->`;
}
for (const item of config) {
  if (!PRICING_CONFIG.groups.some(group => group.id === item.service)) throw Error('Unknown quote service: ' + item.service);
  if (!require('../pricing-engine').getItemsForGroup(item.service).some(item => !item.addonOnly)) throw Error('Quote service has no standalone jobs: ' + item.service);
  const file = path.join(__dirname, '../services', item.page);
  const before = fs.readFileSync(file, 'utf8');
  let html = before.replace(/\r\n/g, '\n');
  const href = `../index.html?service=${item.service}#quote`;
  for (const position of ['hero', 'benefits', 'gallery']) {
    const marker = new RegExp(`<!-- SERVICE-CTA:${position}:START -->[\\s\\S]*?<!-- SERVICE-CTA:${position}:END -->`);
    if (marker.test(html)) { html = html.replace(marker, component(item, position)); continue; }
    if (position === 'hero') {
      html = html.replace(/        <div class="service-hero-actions">[\s\S]*?<\/div>\n?/, '');
      html = html.replace('        <div class="inner-meta-strip"', '        ' + component(item, position) + '\n        <div class="inner-meta-strip"');
    } else {
      const section = position === 'benefits' ? /<section class="section section-soft">[\s\S]*?<\/section>/ : /<section class="section service-gallery-section"[\s\S]*?<\/section>/;
      if (!section.test(html)) throw Error('Missing CTA insertion section: ' + item.page + '/' + position);
      html = html.replace(section, block => block.replace(/      <\/div>\n    <\/section>$/, '        ' + component(item, position) + '\n      </div>\n    </section>'));
    }
  }
  // Preserve existing labels/classes and tracking selectors; only add the supported service query.
  html = html.replace(/href="\.\.\/index\.html(?:\?service=[^"#]+)?#quote"/g, `href="${href}"`);
  html = html.replace(/(<div class="container" data-service-case-study)(?: data-service-quote-href="[^"]*")?/, `$1 data-service-quote-href="${href}"`);
  if (check && html !== before.replace(/\r\n/g, '\n')) throw Error('Service CTAs need regeneration: ' + item.page);
  if (!check && html !== before.replace(/\r\n/g, '\n')) fs.writeFileSync(file, html);
}
console.log(`${config.length} service page CTAs ${check ? 'verified' : 'generated'}.`);

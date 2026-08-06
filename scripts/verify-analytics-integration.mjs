import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', '.playwright-cli', 'output'].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function localTarget(file, reference) {
  const clean = String(reference || '').split('#')[0].split('?')[0].trim();
  if (!clean || /^(?:https?:|mailto:|tel:|sms:|data:|blob:|javascript:|\/\/)/i.test(clean)) return null;
  const decoded = decodeURIComponent(clean);
  const absolute = decoded.startsWith('/')
    ? path.join(root, decoded.replace(/^\/+/, ''))
    : path.resolve(path.dirname(file), decoded);
  if (fs.existsSync(absolute)) return absolute;
  if (decoded.endsWith('/') && fs.existsSync(path.join(absolute, 'index.html'))) return path.join(absolute, 'index.html');
  return absolute;
}

const htmlFiles = walk(root).filter((file) => file.endsWith('.html')).sort();
assert.equal(htmlFiles.length, 24, 'Expected the established 24-page static site');

const missing = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const isRedirect = relative === 'reviews.html';
  const analyticsMatches = html.match(/<script\b[^>]*\bsrc=["'][^"']*analytics\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi) || [];
  assert.equal(analyticsMatches.length, isRedirect ? 0 : 1, `${relative} must load analytics exactly once`);

  if (!isRedirect) {
    const analyticsIndex = html.search(/analytics\.js/i);
    const dependentIndex = html.search(/(?:app|subscription-builder|gallery|reviews)\.js/i);
    if (dependentIndex >= 0) assert.ok(analyticsIndex >= 0 && analyticsIndex < dependentIndex, `${relative} must load analytics before page scripts`);
  }

  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const target = localTarget(file, match[1]);
    if (target && !fs.existsSync(target)) missing.push(`${relative}: ${match[1]}`);
  }
}

assert.deepEqual(missing, [], `Missing local links/assets:\n${missing.join('\n')}`);

const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const analyticsSource = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
const subscriptionSource = fs.readFileSync(path.join(root, 'subscription-builder.js'), 'utf8');
const productionSources = walk(root)
  .filter((file) => /\.(?:html|js|mjs)$/i.test(file) && !file.includes(`${path.sep}test${path.sep}`) && !file.includes(`${path.sep}scripts${path.sep}`))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

assert.match(appSource, /AW-11132030271/, 'Google Ads conversion ID must remain present');
assert.match(appSource, /quote_submit_success/, 'Existing GA4 successful quote event must remain present');
assert.doesNotMatch(productionSources, /G-XXXXXXXXXX/, 'Fake GA4 placeholders must not exist');
assert.doesNotMatch(analyticsSource, /identify\s*\(/, 'Anonymous visitors must never be identified');
assert.doesNotMatch(analyticsSource, /phc_[A-Za-z0-9]{8,}/, 'No PostHog project key may be hard-coded');
assert.match(analyticsSource, /maskAllInputs:\s*true/, 'Session recording must mask every input');
assert.match(analyticsSource, /blockSelector:\s*privacySelector/, 'Sensitive containers must be blocked');
assert.match(analyticsSource, /enable_recording_console_log:\s*false/, 'Console recording must stay disabled');
assert.match(appSource, /TandaAnalytics\?\.quoteSubmitted/, 'Quote success must connect to the central utility');
assert.match(subscriptionSource, /TandaAnalytics\?\.subscriptionCompleted/, 'Subscription success must connect to the central utility');

console.log(`Verified ${htmlFiles.length} HTML pages, 23 analytics loaders, zero missing local files, privacy guards, and preserved Google tracking.`);

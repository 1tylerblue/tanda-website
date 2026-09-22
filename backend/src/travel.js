import https from 'node:https';

export const BASE_COORDINATES = { latitude: -27.9271595, longitude: 153.3983923 };
const TRAVEL_THRESHOLD_KM = 50;
const TRAVEL_FEE_INC_GST = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;
const REQUEST_TIMEOUT_MS = 6000;
const travelCache = new Map();
const inFlightLookups = new Map();

function normalizeAddress(address) {
  return String(address || '').trim().replace(/\s+/g, ' ').slice(0, 180);
}

export function unverifiedTravel(reason = 'Address requires confirmation.') {
  return {
    distanceKm: null, travelBand: 'unverified', travelFeeIncGst: 0, feeApplied: false,
    thresholdKm: TRAVEL_THRESHOLD_KM, addressVerified: false,
    travelStatus: 'requires address confirmation', distanceSource: null, matchedAddress: '', reason,
  };
}

function fetchJson(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: options.headers || {}, family: 4 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) request.destroy(new Error('Travel lookup response was too large.'));
      });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Travel lookup returned HTTP ${response.statusCode || 'unknown'}.`));
          return;
        }
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Travel lookup returned invalid data.')); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Travel lookup timed out.')));
    request.on('error', reject);
  });
}

function toRadians(value) { return (Number(value) * Math.PI) / 180; }

export function haversineDistanceKm(origin, destination) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(origin.latitude)) * Math.cos(toRadians(destination.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function determineTravelPricing(distanceKm) {
  if (distanceKm === null || distanceKm === '' || !Number.isFinite(Number(distanceKm)) || Number(distanceKm) < 0) {
    return unverifiedTravel('A reliable driving distance is required.');
  }
  const normalizedDistance = Math.round(Number(distanceKm) * 10) / 10;
  const feeApplied = normalizedDistance > TRAVEL_THRESHOLD_KM;
  return { distanceKm: normalizedDistance, travelBand: feeApplied ? 'beyond50' : 'within50', travelFeeIncGst: feeApplied ? TRAVEL_FEE_INC_GST : 0, feeApplied, thresholdKm: TRAVEL_THRESHOLD_KM };
}

const ADDRESS_ALIASES = { st: 'street', rd: 'road', ave: 'avenue', av: 'avenue', dr: 'drive', ct: 'court', cres: 'crescent', pde: 'parade', hwy: 'highway', blvd: 'boulevard', tce: 'terrace', pl: 'place', ln: 'lane', qld: 'queensland', nsw: 'newsouthwales', vic: 'victoria', tas: 'tasmania', sa: 'southaustralia', wa: 'westernaustralia', nt: 'northernterritory', act: 'australiancapitalterritory' };
function addressTokens(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/new south wales/g, 'newsouthwales').replace(/south australia/g, 'southaustralia').replace(/western australia/g, 'westernaustralia')
    .replace(/northern territory/g, 'northernterritory').replace(/australian capital territory/g, 'australiancapitalterritory')
    .match(/[a-z0-9]+/g)?.map((word) => ADDRESS_ALIASES[word] || word) || [];
}

export function isPlausibleAddress(address) {
  const query = normalizeAddress(address);
  if (query.length < 4 || !/[a-zA-Z]{3}/.test(query) || /https?:|www\.|@/.test(query)) return false;
  if (/\b(test(?:ing)?|asdf\w*|qwerty\w*|random|unknown|dummy|none|null|undefined|fake|invalid)\b/i.test(query)) return false;
  const postalTokens = query.match(/\b\d{4,}\b/g) || [];
  if (postalTokens.some((token) => token.length !== 4 || !/^[1-9]\d{3}$/.test(token))) return false;
  return true;
}

function queryWithoutUnit(query) {
  return query.replace(/^(?:unit|apartment|apt|suite|shop)\s*\w+\s*[,/-]\s*/i, '').replace(/^\d+[a-z]?\s*\/\s*(?=\d)/i, '');
}

export function validateGeocoderMatch(query, place) {
  const p = place?.properties || {};
  const longitude = place?.geometry?.coordinates?.[0];
  const latitude = place?.geometry?.coordinates?.[1];
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -44 || latitude > -10 || longitude < 112 || longitude > 154) return false;
  if (String(p.countrycode || '').toUpperCase() !== 'AU' || !/^Australia$/i.test(String(p.country || ''))) return false;
  // Administrative state/country centroids and businesses with an unrelated name are not service addresses.
  const kind = String(p.osm_value || p.type || '').toLowerCase();
  const queryText = queryWithoutUnit(query);
  const queryWords = new Set(addressTokens(queryText));
  const namedDistrict = p.osm_key === 'boundary' && kind === 'administrative' && Number(p.extra?.admin_level) >= 8 && /^(district|city|locality)$/.test(String(p.type || ''));
  const placeNameWords = addressTokens(p.name).filter(word => word !== 'city');
  const requestedLocality = placeNameWords.length > 0 && placeNameWords.every(word => queryWords.has(word));
  const precisePlace = requestedLocality && (/^(city|town|village|suburb|neighbourhood|neighborhood|locality|hamlet|quarter)$/.test(kind) || namedDistrict);
  const streetWords = addressTokens(p.street || p.name);
  const requestedStreet = streetWords.length > 0 && streetWords.every(word => queryWords.has(word));
  const addressResult = Boolean(p.street && p.housenumber) && requestedStreet && addressTokens(p.housenumber).every(word => queryWords.has(word));
  const streetResult = p.osm_key === 'highway' && /^(residential|unclassified|service|living_street|tertiary|secondary|primary|trunk|pedestrian)$/.test(kind) && requestedStreet;
  if (!precisePlace && !addressResult && !streetResult) return false;
  const postcodes = queryText.match(/\b\d{4}\b/g) || [];
  // A four-digit token at the end or following a state is a postcode; check all against returned data conservatively.
  if (postcodes.length && postcodes.some((postcode) => postcode !== String(p.postcode || ''))) return false;
  const requested = addressTokens(queryText).filter((token) => token !== 'australia');
  const candidate = new Set(addressTokens([p.name, p.street, p.housenumber, p.city, p.district, p.locality, p.county, p.state, p.postcode, p.country].filter(Boolean).join(' ')));
  if (!requested.length || requested.some((token) => !candidate.has(token))) return false;
  if (/^\d/.test(queryText) && !addressResult) return false;
  return true;
}

export async function lookupTravelPricing(address, requestJson = fetchJson) {
  const query = normalizeAddress(address);
  if (!isPlausibleAddress(query)) return unverifiedTravel('Enter a real Australian street address or suburb.');
  const geocodeUrl = new URL('https://photon.komoot.io/api/');
  const hasState = /\b(QLD|Queensland|NSW|New South Wales|VIC|Victoria|TAS|Tasmania|SA|South Australia|WA|Western Australia|NT|Northern Territory|ACT|Australian Capital Territory)\b/i.test(query);
  const geocodeQuery = /\bAustralia\b/i.test(query) ? query : `${query}, ${hasState ? '' : 'Queensland, '}Australia`;
  geocodeUrl.search = new URLSearchParams({ q: geocodeQuery, limit: '5', lang: 'en' }).toString();
  try {
    const result = await requestJson(geocodeUrl, { headers: { Accept: 'application/json', 'Accept-Language': 'en-AU,en;q=0.9', 'User-Agent': 'T-and-A-Pro-Cleaning-Website/1.0 (tandaprocleaning@gmail.com)' } });
    const matches = (Array.isArray(result?.features) ? result.features : []).filter((place) => validateGeocoderMatch(query, place));
    if (!matches.length) return unverifiedTravel('No sufficiently precise Australian address matched the supplied location.');
    const place = matches[0];
    const [longitude, latitude] = place.geometry.coordinates;
    if (matches.some((candidate) => haversineDistanceKm({ latitude, longitude }, { latitude: candidate.geometry.coordinates[1], longitude: candidate.geometry.coordinates[0] }) > 0.5)) {
      return unverifiedTravel('The address matched multiple locations. Please provide the street, suburb and postcode.');
    }
    const routeUrl = new URL(`https://router.project-osrm.org/route/v1/driving/${BASE_COORDINATES.longitude},${BASE_COORDINATES.latitude};${longitude},${latitude}`);
    routeUrl.search = new URLSearchParams({ overview: 'false', alternatives: 'false', steps: 'false' }).toString();
    const route = await requestJson(routeUrl);
    const routeDistance = route?.routes?.[0]?.distance;
    const distanceKm = typeof routeDistance === 'number' ? routeDistance / 1000 : NaN;
    const straightDistance = haversineDistanceKm(BASE_COORDINATES, { latitude, longitude });
    if (route?.code !== 'Ok' || !Number.isFinite(distanceKm) || distanceKm < 0 || (distanceKm === 0 && straightDistance > 0.2) || distanceKm < straightDistance * 0.9 || distanceKm > straightDistance * 3 + 10 || (route.waypoints || []).some((point) => !Number.isFinite(Number(point.distance)) || Number(point.distance) > 1000)) {
      return unverifiedTravel('A reliable driving route could not be verified.');
    }
    const p = place.properties;
    return {
      ...determineTravelPricing(distanceKm), addressVerified: true, travelStatus: 'verified',
      matchedAddress: [p.housenumber, p.street, p.name, p.city, p.state, p.postcode, p.country].filter(Boolean).filter((part, index, values) => values.indexOf(part) === index).join(', ').slice(0, 220),
      distanceSource: 'driving-route', attribution: 'Map data © OpenStreetMap contributors',
    };
  } catch {
    return unverifiedTravel('The address or driving route could not be verified. The team will confirm travel before booking.');
  }
}

export function getCachedTravelPricing(address) {
  const key = normalizeAddress(address).toLowerCase();
  const cached = travelCache.get(key);
  if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) { travelCache.delete(key); return null; }
  return cached.result;
}

export async function resolveTravelPricing(address, requestJson = fetchJson) {
  const query = normalizeAddress(address);
  if (!isPlausibleAddress(query)) return unverifiedTravel('Enter a real Australian street address or suburb.');
  const cached = getCachedTravelPricing(query);
  if (cached) return cached;
  const key = query.toLowerCase();
  if (inFlightLookups.has(key)) return inFlightLookups.get(key);
  const lookup = lookupTravelPricing(query, requestJson).then((result) => {
    // Only verified routes can become authoritative for later quote submissions.
    if (result.addressVerified) {
      if (travelCache.size >= MAX_CACHE_ENTRIES) travelCache.delete(travelCache.keys().next().value);
      travelCache.set(key, { cachedAt: Date.now(), result });
    }
    return result;
  }).finally(() => inFlightLookups.delete(key));
  inFlightLookups.set(key, lookup);
  return lookup;
}

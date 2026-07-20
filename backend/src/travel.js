import https from 'node:https';

const BASE_COORDINATES = {
  latitude: -27.9271595,
  longitude: 153.3983923,
};

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

function roundDistance(value) {
  return Math.round(Number(value) * 10) / 10;
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
        try {
          resolve(JSON.parse(body));
        } catch (_error) {
          reject(new Error('Travel lookup returned invalid data.'));
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Travel lookup timed out.')));
    request.on('error', reject);
  });
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function haversineDistanceKm(origin, destination) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function determineTravelPricing(distanceKm) {
  const normalizedDistance = roundDistance(distanceKm);
  const feeApplied = normalizedDistance > TRAVEL_THRESHOLD_KM;
  return {
    distanceKm: normalizedDistance,
    travelBand: feeApplied ? 'beyond50' : 'within50',
    travelFeeIncGst: feeApplied ? TRAVEL_FEE_INC_GST : 0,
    feeApplied,
    thresholdKm: TRAVEL_THRESHOLD_KM,
  };
}

function readCachedTravel(address) {
  const key = normalizeAddress(address).toLowerCase();
  const cached = travelCache.get(key);
  if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    travelCache.delete(key);
    return null;
  }
  return cached.result;
}

export function getCachedTravelPricing(address) {
  return readCachedTravel(address);
}

function writeCachedTravel(address, result) {
  if (travelCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = travelCache.keys().next().value;
    if (oldestKey) travelCache.delete(oldestKey);
  }
  travelCache.set(normalizeAddress(address).toLowerCase(), {
    cachedAt: Date.now(),
    result,
  });
}

async function lookupTravelPricing(address) {
  const query = normalizeAddress(address);
  const geocodeUrl = new URL('https://nominatim.openstreetmap.org/search');
  geocodeUrl.search = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'au',
    addressdetails: '0',
    q: `${query}, Queensland, Australia`,
  }).toString();

  const places = await fetchJson(geocodeUrl, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en-AU,en;q=0.9',
      'User-Agent': 'T-and-A-Pro-Cleaning-Website/1.0 (tandaprocleaning@gmail.com)',
    },
  });
  const place = Array.isArray(places) ? places[0] : null;
  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('We could not find that address.');
  }

  const routeUrl = new URL(
    `https://router.project-osrm.org/route/v1/driving/${BASE_COORDINATES.longitude},${BASE_COORDINATES.latitude};${longitude},${latitude}`,
  );
  routeUrl.search = new URLSearchParams({
    overview: 'false',
    alternatives: 'false',
    steps: 'false',
  }).toString();

  let distanceKm;
  let distanceSource = 'driving-route';
  try {
    const route = await fetchJson(routeUrl);
    distanceKm = Number(route?.routes?.[0]?.distance) / 1000;
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      throw new Error('No driving route was returned.');
    }
  } catch (_error) {
    distanceKm = haversineDistanceKm(BASE_COORDINATES, { latitude, longitude }) * 1.25;
    distanceSource = 'estimated-route';
  }

  return {
    ...determineTravelPricing(distanceKm),
    matchedAddress: String(place.display_name || query).slice(0, 220),
    distanceSource,
    attribution: 'Map data © OpenStreetMap contributors',
  };
}

export async function resolveTravelPricing(address) {
  const normalizedAddress = normalizeAddress(address);
  if (normalizedAddress.length < 4) {
    throw new Error('Enter a complete address or suburb.');
  }

  const cached = readCachedTravel(normalizedAddress);
  if (cached) return cached;

  const key = normalizedAddress.toLowerCase();
  if (inFlightLookups.has(key)) return inFlightLookups.get(key);

  const lookup = lookupTravelPricing(normalizedAddress)
    .then((result) => {
      writeCachedTravel(normalizedAddress, result);
      return result;
    })
    .finally(() => inFlightLookups.delete(key));
  inFlightLookups.set(key, lookup);
  return lookup;
}

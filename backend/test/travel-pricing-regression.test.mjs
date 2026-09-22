import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupTravelPricing, determineTravelPricing, validateGeocoderMatch, isPlausibleAddress, resolveTravelPricing } from '../src/travel.js';

const place = (name, latitude, longitude, extra = {}) => ({ geometry: { coordinates: [longitude, latitude] }, properties: { name, country: 'Australia', countrycode: 'AU', state: 'Queensland', osm_key: 'place', osm_value: 'suburb', ...extra } });
const local = place('Biggera Waters', -27.937, 153.40, { postcode: '4216' });
const brisbane = place('Brisbane', -27.4698, 153.0251, { postcode: '4000', osm_value: 'city' });
const logan = place('Logan Central', -27.642, 153.107, { postcode: '4114' });
const ipswich = place('Ipswich', -27.6167, 152.7667, { postcode: '4305', osm_value: 'city' });
function mockNetwork(features, route = { code: 'Ok', routes: [{ distance: 2100 }], waypoints: [{ distance: 5 }, { distance: 8 }] }) {
  const calls = [];
  return { calls, request: async (url) => { calls.push(url.toString()); return url.hostname === 'photon.komoot.io' ? { features } : route; } };
}

for (const invalid of ['test', 'asdf', '', '  ', 'random text', 'qwerty', '12345', 'Biggera Waters 0000', 'Biggera Waters 42161', 'http://example.invalid']) {
  test(`invalid address ${JSON.stringify(invalid)} cannot call geocoding or incur travel`, async () => {
    const network = mockNetwork([brisbane]);
    const result = await lookupTravelPricing(invalid, network.request);
    assert.equal(result.travelFeeIncGst, 0);
    assert.equal(result.distanceKm, null);
    assert.equal(result.addressVerified, false);
    assert.equal(result.travelStatus, 'requires address confirmation');
    assert.equal(network.calls.length, 0);
  });
}

for (const [name, candidate, metres, fee] of [['Biggera Waters', local, 2100, 0], ['Brisbane', brisbane, 73500, 50], ['Logan Central', logan, 52000, 50], ['Ipswich', ipswich, 91000, 50]]) {
  test(`verified ${name} uses actual driving route and existing fee`, async () => {
    const network = mockNetwork([candidate], { code: 'Ok', routes: [{ distance: metres }] });
    const result = await lookupTravelPricing(`${name} QLD ${candidate.properties.postcode}`, network.request);
    assert.equal(result.addressVerified, true);
    assert.equal(result.distanceSource, 'driving-route');
    assert.equal(result.distanceKm, metres / 1000);
    assert.equal(result.travelFeeIncGst, fee);
    assert.equal(network.calls.length, 2);
  });
}

test('unrelated first geocoder match never triggers a route or fee', async () => {
  const network = mockNetwork([brisbane]);
  const result = await lookupTravelPricing('Banana Avenue', network.request);
  assert.equal(result.travelFeeIncGst, 0);
  assert.equal(result.distanceKm, null);
  assert.equal(network.calls.length, 1);
});

test('candidate postcode must exactly match requested postcode', async () => {
  const network = mockNetwork([local]);
  const result = await lookupTravelPricing('Biggera Waters QLD 4000', network.request);
  assert.equal(result.addressVerified, false);
  assert.equal(network.calls.length, 1);
});

test('overseas, missing country code and coordinate-only results are rejected', async () => {
  for (const candidate of [place('Biggera Waters', 51, 0, { country: 'United Kingdom', countrycode: 'GB' }), place('Biggera Waters', -27.93, 153.4, { countrycode: '' }), { geometry: local.geometry }, place('Queensland', -22, 144, { osm_value: 'administrative' })]) {
    const network = mockNetwork([candidate]);
    assert.equal((await lookupTravelPricing(candidate.properties?.name || 'Biggera Waters', network.request)).addressVerified, false);
    assert.equal(network.calls.length, 1);
  }
});

test('ambiguous matching suburbs require address confirmation', async () => {
  const network = mockNetwork([local, place('Biggera Waters', -27.87, 153.3)]);
  assert.equal((await lookupTravelPricing('Biggera Waters', network.request)).addressVerified, false);
  assert.equal(network.calls.length, 1);
});

test('road routing failure never fabricates haversine fees', async () => {
  const result = await lookupTravelPricing('Brisbane', async (url) => {
    if (url.hostname === 'photon.komoot.io') return { features: [brisbane] };
    throw new Error('routing unavailable');
  });
  assert.equal(result.travelFeeIncGst, 0);
  assert.equal(result.distanceKm, null);
  assert.equal(result.distanceSource, null);
  assert.equal(result.travelStatus, 'requires address confirmation');
});

test('failed geocoding returns safe unresolved status', async () => {
  const result = await lookupTravelPricing('Biggera Waters', async () => { throw new Error('network failure'); });
  assert.equal(result.addressVerified, false);
  assert.equal(result.travelFeeIncGst, 0);
});

for (const route of [{}, { code: 'NoRoute', routes: [{ distance: 2000 }] }, { code: 'Ok', routes: [{ distance: null }] }, { code: 'Ok', routes: [{ distance: -10 }] }, { code: 'Ok', routes: [{ distance: 1 }] }, { code: 'Ok', routes: [{ distance: 9999999 }] }, { code: 'Ok', routes: [{ distance: 73500 }], waypoints: [{ distance: 5000 }] }]) {
  test(`unreliable route ${JSON.stringify(route)} has no distance or fee`, async () => {
    const network = mockNetwork([brisbane], route);
    const result = await lookupTravelPricing('Brisbane', network.request);
    assert.equal(result.distanceKm, null);
    assert.equal(result.travelFeeIncGst, 0);
  });
}

test('street address validates house number and normal street abbreviations', () => {
  const candidate = place('Biggera Waters', -27.93, 153.4, { housenumber: '10', street: 'Marine Parade', postcode: '4216' });
  assert.equal(validateGeocoderMatch('10 Marine Pde, Biggera Waters QLD 4216', candidate), true);
  assert.equal(validateGeocoderMatch('2/10 Marine Pde, Biggera Waters QLD 4216', candidate), true);
  assert.equal(validateGeocoderMatch('90 Marine Pde, Biggera Waters QLD 4216', candidate), false);
  assert.equal(validateGeocoderMatch('10 Marine Pde, Biggera Waters QLD 4216', local), false);
});

test('invalid numeric distances cannot accidentally become paid travel', () => {
  for (const distance of [null, undefined, NaN, Infinity, -1, '']) {
    assert.equal(determineTravelPricing(distance).travelFeeIncGst, 0);
    assert.equal(determineTravelPricing(distance).distanceKm, null);
  }
  assert.equal(determineTravelPricing(50).travelFeeIncGst, 0);
  assert.equal(determineTravelPricing(50.1).travelFeeIncGst, 50);
});

test('public resolver handles blank and test before network/cache', async () => {
  assert.equal((await resolveTravelPricing('test')).addressVerified, false);
  assert.equal((await resolveTravelPricing('')).distanceKm, null);
  assert.equal(isPlausibleAddress('Biggera Waters'), true);
});

test('real Photon Brisbane district shape is accepted, unrelated POIs and parent-city matches are rejected', () => {
  const district=place('Brisbane City',-27.470301,153.0258187,{osm_key:'boundary',osm_value:'administrative',type:'district',postcode:'4000',extra:{admin_level:'9'}});
  assert.equal(validateGeocoderMatch('Brisbane QLD 4000',district),true);
  assert.equal(validateGeocoderMatch('Brisbane QLD 4000',place('Brisbane Supreme Court',-27.467,153.02,{osm_key:'amenity',osm_value:'courthouse',type:'house',housenumber:'415',street:'George Street',city:'Brisbane',postcode:'4000'})),false);
  assert.equal(validateGeocoderMatch('Biggera Waters QLD 4216',place('Morala Ave at Biggera Waters School',-27.93,153.40,{osm_key:'highway',osm_value:'bus_stop',postcode:'4216'})),false);
  assert.equal(validateGeocoderMatch('Brisbane',place('Fortitude Valley',-27.46,153.04,{city:'Brisbane'})),false);
});

test('explicit NSW service locations keep their state instead of appending Queensland', async () => {
  const tweed=place('Tweed Heads',-28.175,153.54,{state:'New South Wales',postcode:'2485'});
  const network=mockNetwork([tweed],{code:'Ok',routes:[{distance:40000}]});
  const result=await lookupTravelPricing('Tweed Heads NSW 2485',network.request);
  assert.equal(result.addressVerified,true);
  assert.equal(result.travelFeeIncGst,0);
  assert.equal(new URL(network.calls[0]).searchParams.get('q'),'Tweed Heads NSW 2485, Australia');
});

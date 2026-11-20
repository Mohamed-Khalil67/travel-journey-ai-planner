import test, { describe, mock } from 'node:test';
import assert from 'node:assert/strict';

import { validateTripRequest } from '../backend/src/validation/trip.validation.js';
import { createRateLimiter } from '../backend/src/middleware/rate-limit.middleware.js';
import { AIService } from '../backend/src/services/ai.service.js';

const validBody = () => ({
  destination: 'Kyoto, Japan',
  durationDays: 4,
  travelers: 2,
  budget: 2000,
  currency: 'EUR',
  travelStyle: 'luxury',
  interests: ['culture', 'food'],
  notes: 'vegetarian'
});

describe('validateTripRequest', () => {
  test('accepts a valid body and drops unknown fields', () => {
    const { value, errors } = validateTripRequest({ ...validBody(), injected: 'ignore me' });
    assert.equal(errors, undefined);
    assert.equal(value.injected, undefined);
    assert.equal(value.destination, 'Kyoto, Japan');
  });

  test('rejects an empty body', () => {
    assert.ok(validateTripRequest({}).errors.length >= 3);
    assert.ok(validateTripRequest(null).errors);
    assert.ok(validateTripRequest([]).errors);
  });

  test('rejects out-of-range and wrongly-typed values', () => {
    const { errors } = validateTripRequest({
      ...validBody(), durationDays: 99, travelers: '2', budget: -5, currency: 'BTC', travelStyle: 'x', notes: 'a'.repeat(501)
    });
    assert.equal(errors.length, 6);
  });
});

describe('token-bucket rate limiter', () => {
  const fakeRes = () => {
    const res = { statusCode: 200, headers: {}, body: null };
    res.set = (k, v) => { res.headers[k] = v; return res; };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
  };

  test('allows a burst up to capacity, then returns 429 with Retry-After', () => {
    mock.timers.enable({ apis: ['Date', 'setInterval'] });
    try {
      const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1 });
      const req = { ip: '1.2.3.4' };
      let passed = 0;
      for (let i = 0; i < 3; i++) limiter(req, fakeRes(), () => passed++);
      assert.equal(passed, 3);

      const blocked = fakeRes();
      limiter(req, blocked, () => passed++);
      assert.equal(blocked.statusCode, 429);
      assert.equal(blocked.headers['Retry-After'], '1');

      mock.timers.tick(1000); // one token refills
      limiter(req, fakeRes(), () => passed++);
      assert.equal(passed, 4);
    } finally {
      mock.timers.reset();
    }
  });

  test('tracks clients independently', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 0.001 });
    let passed = 0;
    limiter({ ip: 'a' }, fakeRes(), () => passed++);
    limiter({ ip: 'b' }, fakeRes(), () => passed++);
    assert.equal(passed, 2);
  });
});

describe('AIService demo mode', () => {
  const service = new AIService();
  const context = {
    preferences: validateTripRequest(validBody()).value,
    destination: { name: 'Kyoto', country: 'Japan' },
    weather: { forecast: [{ temperatureMin: 5, temperatureMax: 12 }] }
  };

  test('produces exactly durationDays days, deterministically', () => {
    const a = service.createMockItinerary(context);
    const b = service.createMockItinerary(context);
    assert.equal(a.itinerary.length, 4);
    assert.deepEqual(a, b);
  });

  test('stream yields chunks that reassemble into valid JSON', async () => {
    let text = '';
    for await (const chunk of service.streamItinerary(context)) text += chunk;
    const parsed = JSON.parse(text);
    assert.equal(parsed.itinerary.length, 4);
    assert.match(parsed.summary, /Kyoto/);
  });

  test('stops streaming when the client aborts', async () => {
    const controller = new AbortController();
    let chunks = 0;
    for await (const _ of service.streamItinerary(context, { signal: controller.signal })) {
      chunks += 1;
      if (chunks === 2) controller.abort();
    }
    assert.equal(chunks, 2);
  });
});

describe('Open-Meteo services (fetch mocked)', async () => {
  const { GeocodingService } = await import('../backend/src/services/geocoding.service.js');
  const { WeatherService } = await import('../backend/src/services/weather.service.js');
  const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body });

  test('geocoding prefers the result in the country the user typed', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url) => {
      assert.match(String(url), /name=Paris&/);
      return jsonResponse({
        results: [
          { name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35, timezone: 'Europe/Paris' },
          { name: 'Paris', country: 'United States', latitude: 33.66, longitude: -95.55, timezone: 'America/Chicago' }
        ]
      });
    });
    const place = await new GeocodingService().search('Paris, United States');
    assert.deepEqual([place.country, place.latitude, place.isDemo], ['United States', 33.66, false]);
  });

  test('geocoding falls back to Nominatim for regions and alternate spellings', async (t) => {
    const hosts = [];
    t.mock.method(globalThis, 'fetch', async (url) => {
      const u = new URL(String(url));
      hosts.push(u.host);
      if (u.host.includes('open-meteo')) return jsonResponse({}); // Open-Meteo doesn't know "Marrakech"
      assert.equal(u.searchParams.get('q'), 'Marrakech, Morocco');
      return jsonResponse([{ name: 'Marrakesh', lat: '31.63', lon: '-7.99', address: { country: 'Morocco' } }]);
    });
    const place = await new GeocodingService().search('Marrakech, Morocco');
    assert.deepEqual([place.name, place.country, place.latitude, place.isDemo], ['Marrakesh', 'Morocco', 31.63, false]);
    assert.deepEqual(hosts, ['geocoding-api.open-meteo.com', 'nominatim.openstreetmap.org']);
  });

  test('geocoding retries with a simplified name ("A & B" -> "A")', async (t) => {
    const tried = [];
    t.mock.method(globalThis, 'fetch', async (url) => {
      const u = new URL(String(url));
      const name = u.searchParams.get('name') ?? u.searchParams.get('q');
      tried.push(name);
      if (name === 'Reykjavík') return jsonResponse({ results: [{ name: 'Reykjavik', country: 'Iceland', latitude: 64.14, longitude: -21.9 }] });
      return jsonResponse(u.host.includes('nominatim') ? [] : {});
    });
    const place = await new GeocodingService().search('Reykjavík & South Coast, Iceland');
    assert.equal(place.name, 'Reykjavik');
    assert.deepEqual(tried, ['Reykjavík & South Coast', 'Reykjavík & South Coast, Iceland', 'Reykjavík']);
  });

  test('parseDestination splits place, country hint and simpler candidates', async () => {
    const { parseDestination } = await import('../backend/src/services/geocoding.service.js');
    assert.deepEqual(parseDestination('Reykjavík & South Coast, Iceland'),
      { place: 'Reykjavík & South Coast', countryHint: 'Iceland', candidates: ['Reykjavík & South Coast', 'Reykjavík'] });
    assert.deepEqual(parseDestination('Kyoto').candidates, ['Kyoto']);
  });

  test('geocoding returns null for an unknown place', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({}));
    assert.equal(await new GeocodingService().search('Xyzzyville'), null);
  });

  test('geocoding falls back to "no coordinates" when the API is down', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('getaddrinfo ENOTFOUND'); });
    t.mock.method(console, 'warn', () => {});
    const place = await new GeocodingService().search('Lima, Peru');
    assert.deepEqual([place.latitude, place.longitude, place.isDemo], [null, null, true]);
  });

  test('weather maps daily arrays and WMO codes into a forecast', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({
      daily: {
        time: ['2026-12-01', '2026-12-02'],
        temperature_2m_min: [3.1, 4.0],
        temperature_2m_max: [9.5, 11.2],
        weather_code: [61, 999]
      }
    }));
    const w = await new WeatherService().getForecast({ name: 'Oslo', latitude: 59.9, longitude: 10.7 }, { days: 2 });
    assert.equal(w.isDemo, false);
    assert.deepEqual(w.forecast[0], { date: '2026-12-01', temperatureMin: 3.1, temperatureMax: 9.5, condition: 'Light rain' });
    assert.equal(w.forecast[1].condition, 'Mixed conditions');
  });

  test('weather skips the network entirely when there are no coordinates', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse({}));
    t.mock.method(console, 'warn', () => {});
    const w = await new WeatherService().getForecast({ name: 'X', latitude: null, longitude: null });
    assert.equal(w.isDemo, true);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe('AIService with Gemini (fake client)', () => {
  const context = {
    preferences: validateTripRequest(validBody()).value,
    destination: { name: 'Kyoto', country: 'Japan' },
    weather: { forecast: [] }
  };
  const live = (models) => Object.assign(new AIService(), { ai: { models } });
  const retired = () => Object.assign(new Error('models/x is no longer available to new users'), { status: 404 });

  test('retries on the fallback model when the primary model is retired', async (t) => {
    t.mock.method(console, 'warn', () => {});
    const calls = [];
    const service = live({
      generateContent: async ({ model }) => {
        calls.push(model);
        if (calls.length === 1) throw retired();
        return { text: '{"summary":"live","itinerary":[]}' };
      }
    });
    let fellBack = false;
    const result = await service.generateItinerary(context, { onFallback: () => { fellBack = true; } });
    assert.equal(result.summary, 'live');
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0], calls[1]);
    assert.equal(fellBack, false);
  });

  test('reports the fallback when Gemini fails, instead of passing demo data off as live', async (t) => {
    t.mock.method(console, 'warn', () => {});
    const service = live({ generateContent: async () => { throw new Error('quota exceeded'); } });
    let fellBack = false;
    const result = await service.generateItinerary(context, { onFallback: () => { fellBack = true; } });
    assert.equal(fellBack, true);
    assert.equal(result.itinerary.length, 4); // demo plan
  });

  test('streaming: falls back before the first chunk and reports it', async (t) => {
    t.mock.method(console, 'warn', () => {});
    const service = live({ generateContentStream: async () => { throw new Error('503'); } });
    let fellBack = false;
    let text = '';
    for await (const c of service.streamItinerary(context, { onFallback: () => { fellBack = true; } })) text += c;
    assert.equal(fellBack, true);
    assert.equal(JSON.parse(text).itinerary.length, 4);
  });

  test('streaming: passes live chunks through untouched', async () => {
    const service = live({
      generateContentStream: async () => (async function* () { yield { text: '{"summary":' }; yield { text: '"live"}' }; })()
    });
    let text = '';
    for await (const c of service.streamItinerary(context)) text += c;
    assert.deepEqual(JSON.parse(text), { summary: 'live' });
  });
});

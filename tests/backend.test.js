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

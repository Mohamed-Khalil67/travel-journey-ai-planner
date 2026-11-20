import test, { describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

// Keep tests offline and free: dotenv never overrides an already-set variable,
// so a developer's backend/.env key is ignored here.
process.env.GEMINI_API_KEY = '';

// Exercise the exact handler Vercel deploys (api/index.js) over real HTTP.
const { default: app } = await import('../api/index.js');

describe('API (Vercel entry point)', () => {
  let server;
  let base;
  const realFetch = globalThis.fetch;

  before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    // Outbound Open-Meteo calls fail fast so the test is offline and deterministic;
    // requests to this test server still go through the real fetch.
    mock.method(globalThis, 'fetch', (url, opts) =>
      String(url).startsWith(base) ? realFetch(url, opts) : Promise.reject(new Error('offline in tests')));
    mock.method(console, 'warn', () => {});
    mock.method(console, 'log', () => {});
  });

  after(() => {
    mock.restoreAll();
    server.close();
  });

  const post = (path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });

  const validTrip = {
    destination: 'Lisbon, Portugal', durationDays: 3, travelers: 2, budget: 1200,
    currency: 'EUR', travelStyle: 'balanced', interests: ['food']
  };

  test('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('unknown /api route is a JSON 404', async () => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.status, 404);
  });

  test('invalid body is a 400 with field messages', async () => {
    const res = await post('/api/ai/stream', {}, { 'X-Forwarded-For': '10.0.0.1' });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error.message, /destination is required/);
  });

  test('malformed JSON is a 400, not a 500', async () => {
    const res = await post('/api/ai/stream', '{bad', { 'X-Forwarded-For': '10.0.0.2' });
    assert.equal(res.status, 400);
  });

  test('streams meta, chunks and [DONE] over SSE', async () => {
    const res = await post('/api/ai/stream', validTrip, { 'X-Forwarded-For': '10.0.0.3' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const text = await res.text();
    const frames = text.split('\n\n').filter(Boolean).map((f) => f.replace(/^data: /, ''));
    assert.equal(frames.at(-1), '[DONE]');
    const meta = JSON.parse(frames[0]).meta;
    assert.ok(meta.demoSources.some((s) => s.startsWith('location')));
    assert.ok(meta.demoSources.some((s) => s.startsWith('itinerary')));
    const json = frames.slice(1, -1).map((f) => JSON.parse(f).chunk).join('');
    assert.equal(JSON.parse(json).itinerary.length, 3);
  });

  test('rate limit is per client IP (trust proxy reads X-Forwarded-For)', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await post('/api/ai/generate', validTrip, { 'X-Forwarded-For': '203.0.113.7' })).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    // A different visitor is unaffected
    const other = await post('/api/ai/generate', validTrip, { 'X-Forwarded-For': '198.51.100.9' });
    assert.equal(other.status, 200);
  });
});

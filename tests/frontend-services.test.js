import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage so browser services can run under Node.
class MemoryStorage {
  #data = new Map();
  getItem(k) { return this.#data.has(k) ? this.#data.get(k) : null; }
  setItem(k, v) { this.#data.set(k, String(v)); }
  removeItem(k) { this.#data.delete(k); }
  clear() { this.#data.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const { StorageService } = await import('../frontend/src/services/storage-service.js');
const { RequestQueue } = await import('../frontend/src/data-structures/request-queue.js');

describe('StorageService', () => {
  beforeEach(() => localStorage.clear());

  test('saves, reads and deletes trips by id', () => {
    const store = new StorageService();
    const trip = store.saveTrip({ destination: 'Oslo' });
    assert.equal(store.getTrip(trip.id).destination, 'Oslo');
    assert.equal(store.deleteTrip(trip.id), true);
    assert.equal(store.getTrip(trip.id), undefined);
    assert.equal(store.deleteTrip(trip.id), false);
  });

  test('lists trips newest first, also after reloading from storage', () => {
    const store = new StorageService();
    store.saveTrip({ destination: 'A', createdAt: '2026-01-01T00:00:00.000Z' });
    store.saveTrip({ destination: 'B', createdAt: '2026-02-01T00:00:00.000Z' });
    assert.deepEqual(store.getTrips().map((t) => t.destination), ['B', 'A']);

    const reloaded = new StorageService();
    assert.deepEqual(reloaded.getTrips().map((t) => t.destination), ['B', 'A']);
  });

  test('clear() empties memory too, so cleared trips are not written back by the next save', () => {
    const store = new StorageService();
    store.saveTrip({ destination: 'Old' });
    store.clear();
    assert.equal(store.getTrips().length, 0);

    store.saveTrip({ destination: 'New' });
    const persisted = JSON.parse(localStorage.getItem(store.storageKey));
    assert.deepEqual(persisted.map((t) => t.destination), ['New']);
  });

  test('ignores corrupted storage instead of crashing', () => {
    localStorage.setItem('travel_journey_trips', '{not json');
    assert.equal(new StorageService().getTrips().length, 0);
  });
});

describe('RequestQueue', () => {
  test('runs tasks one at a time, in FIFO order', async () => {
    const queue = new RequestQueue();
    const log = [];
    let running = 0;
    const task = (name, ms) => async () => {
      running += 1;
      assert.equal(running, 1, 'tasks must not overlap');
      log.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`end ${name}`);
      running -= 1;
      return name;
    };

    const results = await Promise.all([queue.enqueue(task('a', 20)), queue.enqueue(task('b', 5)), queue.enqueue(task('c', 1))]);
    assert.deepEqual(results, ['a', 'b', 'c']);
    assert.deepEqual(log, ['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  test('a failing task rejects its own promise but does not block the queue', async () => {
    const queue = new RequestQueue();
    const failed = queue.enqueue(async () => { throw new Error('boom'); });
    const next = queue.enqueue(async () => 'still runs');
    await assert.rejects(failed, /boom/);
    assert.equal(await next, 'still runs');
  });
});

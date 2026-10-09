/**
 * Repository for saved trips.
 * A Map keyed by id gives O(1) get/update/delete; localStorage is the persistence layer.
 * Map preserves insertion order, which the newest-first listing relies on.
 */
export class StorageService {
  constructor(storageKey = 'travel_journey_trips') {
    this.storageKey = storageKey;
    this.tripsMap = new Map();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return;
      // Sort once on load (ISO-8601 strings sort lexicographically), then keep insertion order.
      parsed
        .filter((trip) => trip && typeof trip.id === 'string')
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .forEach((trip) => this.tripsMap.set(trip.id, trip));
    } catch (e) {
      console.error('Failed to load trips from LocalStorage', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.tripsMap.values())));
    } catch (e) {
      console.error('Failed to save trips to LocalStorage', e);
    }
  }

  generateId() {
    if (globalThis.crypto?.randomUUID) return `trip_${crypto.randomUUID()}`;
    return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  saveTrip(tripData) {
    const now = new Date().toISOString();
    const trip = {
      ...tripData,
      id: tripData.id || this.generateId(),
      notes: tripData.notes || '',
      createdAt: tripData.createdAt || now,
      updatedAt: now
    };

    this.tripsMap.set(trip.id, trip);
    this.saveToStorage();
    return trip;
  }

  updateTripNotes(id, notes) {
    const trip = this.tripsMap.get(id);
    if (!trip) return null;
    trip.notes = notes;
    trip.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return trip;
  }

  getTrip(id) {
    return this.tripsMap.get(id);
  }

  /** Newest first in O(n): reverse insertion order instead of re-sorting on every call. */
  getTrips() {
    return Array.from(this.tripsMap.values()).reverse();
  }

  deleteTrip(id) {
    const deleted = this.tripsMap.delete(id);
    if (deleted) this.saveToStorage();
    return deleted;
  }

  /** Clears memory AND storage, so cleared trips can't be written back by a later save. */
  clear() {
    this.tripsMap.clear();
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Failed to clear trips from LocalStorage', e);
    }
  }
}

export const storageService = new StorageService();

import { appStore } from '../state/store.js';

const STORAGE_KEY = 'travel_journey_settings';

const DEFAULTS = Object.freeze({
  travelerName: 'Explorer',
  currency: 'USD',
  preferredPace: 'balanced',
  units: 'metric'
});

/** Single source of truth for user preferences (read by the header, plan form and results). */
export class SettingsService {
  get() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  save(settings) {
    const merged = { ...this.get(), ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    appStore.setState('settings', merged); // notifies subscribers (e.g. the header greeting)
    return merged;
  }
}

export const settingsService = new SettingsService();

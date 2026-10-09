import { fetchJson } from '../utils/fetch-json.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Resolves a free-text destination to coordinates using Open-Meteo's geocoding API
 * (free, no API key). Returns { ..., isDemo: true } when the live service is unavailable.
 */
export class GeocodingService {
  async search(destination, { signal } = {}) {
    // "Kyoto, Japan" -> search "Kyoto"; the API matches on place name only.
    const placeName = destination.split(',')[0].trim();
    const countryHint = destination.split(',').slice(1).join(',').trim().toLowerCase();

    try {
      const url = `${GEOCODING_URL}?name=${encodeURIComponent(placeName)}&count=5&language=en&format=json`;
      const data = await fetchJson(url, { signal });
      const results = data.results ?? [];
      if (results.length === 0) return null;

      // Prefer a result in the country the user typed, otherwise the most populous match.
      const best = (countryHint && results.find((r) => r.country?.toLowerCase().includes(countryHint)))
        || results[0];

      return {
        name: best.name,
        country: best.country ?? '',
        latitude: best.latitude,
        longitude: best.longitude,
        timezone: best.timezone,
        isDemo: false
      };
    } catch (err) {
      if (signal?.aborted) throw err;
      // Don't invent coordinates: the UI shows "not geocoded" instead of a wrong map.
      console.warn(`Geocoding unavailable (${err.message}); continuing without coordinates.`);
      return { name: destination, country: '', latitude: null, longitude: null, isDemo: true };
    }
  }
}

export const geocodingService = new GeocodingService();

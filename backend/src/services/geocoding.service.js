import { fetchJson } from '../utils/fetch-json.js';

const OPEN_METEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Splits "Reykjavík & South Coast, Iceland" into a place part and a country hint,
 * and yields progressively simpler place names to try:
 *   "Reykjavík & South Coast" -> "Reykjavík"
 */
export function parseDestination(destination) {
  const [placePart, ...rest] = destination.split(',');
  const place = placePart.trim();
  const countryHint = rest.join(',').trim();
  const simplified = place.split(/\s+(?:&|and|\+)\s+|\s*\/\s*/i)[0].trim();
  const candidates = [...new Set([place, simplified].filter(Boolean))];
  return { place, countryHint, candidates };
}

/**
 * Resolves a free-text destination to coordinates.
 *
 * Strategy (cheapest and most precise first):
 *   1. Open-Meteo geocoding: fast, city-level, same provider as the forecast
 *   2. Nominatim (OpenStreetMap): regions, parks, coasts and alternate spellings
 *      ("Marrakech", "Amalfi Coast", "Banff National Park")
 *   3. Both again with a simplified name ("Reykjavík & South Coast" -> "Reykjavík")
 *
 * Returns { ..., isDemo: false } on success, null when no provider knows the place,
 * and { latitude: null, ..., isDemo: true } when the providers are unreachable.
 */
export class GeocodingService {
  async search(destination, { signal } = {}) {
    const { countryHint, candidates } = parseDestination(destination);
    let reachedAProvider = false;

    for (const name of candidates) {
      for (const provider of [this.#openMeteo, this.#nominatim]) {
        try {
          const hit = await provider.call(this, name, countryHint, { signal });
          reachedAProvider = true;
          if (hit) return { ...hit, isDemo: false };
        } catch (err) {
          if (signal?.aborted) throw err;
          console.warn(`Geocoding provider failed for "${name}": ${err.message}`);
        }
      }
    }

    if (reachedAProvider) return null; // providers answered, but nobody knows this place

    // Don't invent coordinates: the UI shows "not geocoded" instead of a wrong map.
    console.warn('Geocoding unavailable; continuing without coordinates.');
    return { name: destination, country: '', latitude: null, longitude: null, isDemo: true };
  }

  async #openMeteo(name, countryHint, { signal }) {
    const url = `${OPEN_METEO_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
    const results = (await fetchJson(url, { signal })).results ?? [];
    if (results.length === 0) return null;

    // Prefer a result in the country the user typed, otherwise the most populous match.
    const hint = countryHint.toLowerCase();
    const best = (hint && results.find((r) => r.country?.toLowerCase().includes(hint))) || results[0];
    return {
      name: best.name,
      country: best.country ?? '',
      latitude: best.latitude,
      longitude: best.longitude,
      timezone: best.timezone
    };
  }

  async #nominatim(name, countryHint, { signal }) {
    const q = countryHint ? `${name}, ${countryHint}` : name;
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&addressdetails=1&accept-language=en`;
    const results = await fetchJson(url, { signal });
    if (!Array.isArray(results) || results.length === 0) return null;

    const [best] = results;
    return {
      name: best.name || name,
      country: best.address?.country ?? '',
      latitude: Number(best.lat),
      longitude: Number(best.lon)
    };
  }
}

export const geocodingService = new GeocodingService();

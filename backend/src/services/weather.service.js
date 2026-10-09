import { fetchJson } from '../utils/fetch-json.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO weather interpretation codes -> human-readable text (subset used by Open-Meteo)
const WMO_CODES = new Map([
  [0, 'Clear sky'], [1, 'Mainly clear'], [2, 'Partly cloudy'], [3, 'Overcast'],
  [45, 'Fog'], [48, 'Rime fog'],
  [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Heavy drizzle'],
  [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'],
  [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'],
  [80, 'Rain showers'], [81, 'Rain showers'], [82, 'Violent rain showers'],
  [95, 'Thunderstorm'], [96, 'Thunderstorm with hail'], [99, 'Thunderstorm with hail']
]);

/** Daily forecast from Open-Meteo (free, no API key). Falls back to demo data when unreachable. */
export class WeatherService {
  async getForecast(location, { days = 7, signal } = {}) {
    try {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        throw new Error('no coordinates for this location');
      }
      const url = `${FORECAST_URL}?latitude=${location.latitude}&longitude=${location.longitude}`
        + `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=${Math.min(days, 16)}`;
      const { daily } = await fetchJson(url, { signal });

      return {
        location: location.name,
        isDemo: false,
        forecast: daily.time.map((date, i) => ({
          date,
          temperatureMin: daily.temperature_2m_min[i],
          temperatureMax: daily.temperature_2m_max[i],
          condition: WMO_CODES.get(daily.weather_code[i]) ?? 'Mixed conditions'
        }))
      };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn(`Weather unavailable (${err.message}); using demo forecast.`);
      return {
        location: location.name,
        isDemo: true,
        forecast: [{ date: new Date().toLocaleDateString('en-CA'), temperatureMin: 18, temperatureMax: 26, condition: 'Partly cloudy' }]
      };
    }
  }
}

export const weatherService = new WeatherService();

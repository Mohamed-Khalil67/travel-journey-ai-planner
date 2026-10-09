import { appStore } from '../state/store.js';
import { api } from '../api/index.js';
import { storageService } from '../services/storage-service.js';
import { settingsService } from '../services/settings-service.js';
import { aiRequestQueue } from '../data-structures/request-queue.js';
import { escapeHTML } from '../utils/html.js';
import { formatMoney } from '../utils/format.js';
import { calculateBudget } from '../utils/budget.js';
import { calculateTripDuration, toLocalISODate } from '../utils/dates.js';

export class ResultsView {
  constructor(params) {
    this.params = params;
    this.abortController = new AbortController();
  }

  /** Called by the router before navigating away: cancels the in-flight stream. */
  destroy() {
    this.abortController.abort();
  }

  render() {
    const container = document.createElement('div');
    container.className = 'results-view';

    container.innerHTML = `
      <div id="loading-state" class="card" style="margin-bottom: 24px;">
         <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
           <h3 style="display: flex; align-items: center; gap: 10px;">
             <i class="fa-solid fa-spinner fa-spin" style="color: var(--color-primary);"></i>
             Generating Personalized Journey...
           </h3>
           <span class="badge-pill">AI Orchestration Active</span>
         </div>
         <p style="color: var(--color-muted); font-size: 0.88rem; margin-bottom: 16px;">
           Combining preferences, geocoding coordinates, live weather forecasts, and places data into structured itinerary cards.
         </p>
         <div id="streaming-content" class="streaming-text"></div>
      </div>

      <div id="dashboard-state" style="display: none;">
         <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
              <h2 id="destination-title" style="font-size: 1.8rem; font-weight: 800; color: var(--color-navy);">Generated Journey</h2>
              <p id="destination-subtitle" style="color: var(--color-muted); font-size: 0.9rem; margin-top: 4px;"></p>
            </div>
            <div style="display: flex; gap: 12px;">
              <button id="replan-btn" class="outline-btn"><i class="fa-solid fa-arrow-left"></i> Edit Preferences</button>
              <button id="save-trip-btn" class="primary-btn"><i class="fa-regular fa-bookmark"></i> Save This Trip</button>
            </div>
         </div>

         <div id="demo-data-notice" class="card" style="display: none; margin-bottom: 24px; border-left: 4px solid #f59e0b; font-size: 0.86rem; color: #78350f;">
           <i class="fa-solid fa-circle-info"></i> <span id="demo-data-text"></span>
         </div>

         <div class="dashboard-grid">
            <div class="main-column">
               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h3 id="trip-summary-title">Trip Overview</h3>
                    <span class="badge-pill">Overview</span>
                  </div>
                  <p id="trip-summary-text" style="color: #475569; margin-top: 8px; line-height: 1.6;"></p>
               </div>

               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h3><i class="fa-regular fa-calendar-check" style="color: var(--color-primary);"></i> <span id="itinerary-days-count"></span>-Day Timeline</h3>
                    <span class="badge-pill">Daily Itinerary</span>
                  </div>
                  <div id="itinerary-container"></div>
               </div>

               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h4><i class="fa-solid fa-map-location-dot" style="color: var(--color-primary);"></i> Geocoded Destination & Interactive Map</h4>
                    <span class="badge-pill" id="coordinates-badge"></span>
                  </div>
                  <div id="map-container" style="border-radius: var(--radius-sm); overflow: hidden; height: 260px; background: #e2e8f0; position: relative;">
                     <iframe id="map-iframe" title="Destination map" width="100%" height="100%" loading="lazy" style="border:0;"></iframe>
                  </div>
               </div>
            </div>

            <div class="side-column">
               <div class="weather-card" style="margin-bottom: 24px;">
                  <div>
                    <span class="weather-label">Forecast</span>
                    <h4 id="weather-location" style="font-size: 1.15rem; font-weight: 700;">Weather</h4>
                    <p id="weather-condition" style="font-size: 0.82rem; opacity: 0.9; margin-top: 4px;"></p>
                  </div>
                  <div style="text-align: right;">
                    <h3 id="weather-temp">--</h3>
                    <small style="opacity: 0.85;">Expected Range</small>
                  </div>
               </div>

               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h4><i class="fa-solid fa-calculator" style="color: var(--color-primary);"></i> Estimated Budget</h4>
                    <span class="badge-pill">Calculated</span>
                  </div>
                  <p style="font-size: 0.82rem; color: var(--color-muted); margin-bottom: 16px;">Deterministic calculations based on travel style.</p>
                  <div id="budget-container"></div>
               </div>

               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h4><i class="fa-solid fa-star" style="color: #f59e0b;"></i> Recommended Places</h4>
                    <span class="badge-pill">Nearby</span>
                  </div>
                  <div id="places-container" class="places-horizontal-list"></div>
               </div>

               <div class="card" style="margin-bottom: 24px;">
                  <div class="card-header-row">
                    <h4><i class="fa-solid fa-suitcase" style="color: var(--color-primary);"></i> Packing Essentials</h4>
                    <span class="badge-pill">Checklist</span>
                  </div>
                  <ul id="packing-container" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px;"></ul>
               </div>

               <div class="card" style="border-left: 4px solid #f59e0b;">
                  <div class="card-header-row">
                    <h4 style="color: #b45309;"><i class="fa-solid fa-triangle-exclamation"></i> Travel Intelligence</h4>
                  </div>
                  <ul id="warnings-container" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.84rem; color: #78350f;"></ul>
               </div>
            </div>
         </div>
      </div>
    `;

    // Retrieve parameters from appStore (or build sensible defaults if navigated directly)
    let tripParams = appStore.getState('currentTripParams');
    if (!tripParams) {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 5);
      const startDate = toLocalISODate(start);
      const endDate = toLocalISODate(end);
      const durationDays = calculateTripDuration(startDate, endDate);
      tripParams = {
        destination: 'Bali, Indonesia',
        startDate,
        endDate,
        durationDays,
        travelers: 2,
        budget: 2000,
        currency: settingsService.get().currency,
        interests: ['beaches', 'culture', 'food'],
        travelStyle: 'balanced',
        budgetBreakdown: calculateBudget(2000, 'balanced')
      };
      appStore.setState('currentTripParams', tripParams);
    }

    const streamContainer = container.querySelector('#streaming-content');
    const loadingState = container.querySelector('#loading-state');
    const dashboardState = container.querySelector('#dashboard-state');
    const saveBtn = container.querySelector('#save-trip-btn');
    const replanBtn = container.querySelector('#replan-btn');

    replanBtn.addEventListener('click', () => {
      window.navigateTo('/plan');
    });

    // Chunks are collected in an array and appended as Text nodes: O(n) total
    // instead of re-copying the whole accumulated string on every chunk.
    let chunks = [];
    let meta = null;

    const showDashboard = (data) => {
      appStore.setState('generatedItinerary', { ...data, meta });
      loadingState.style.display = 'none';
      dashboardState.style.display = 'block';
      this.populateDashboard(container, tripParams, data, meta);
    };

    const executeStream = () => {
      aiRequestQueue.enqueue(() => new Promise((resolve, reject) => {
        api.streamItinerary(
          tripParams,
          (chunk) => {
            chunks.push(chunk);
            streamContainer.appendChild(document.createTextNode(chunk));
          },
          () => {
            const fullResponse = chunks.join('');
            try {
              let parsedData = null;
              try {
                parsedData = JSON.parse(fullResponse);
              } catch {
                // Fallback: extract JSON block if surrounded by markdown or commentary
                const match = fullResponse.match(/\{[\s\S]*\}/);
                if (match) parsedData = JSON.parse(match[0]);
              }
              if (!parsedData) throw new Error('Could not parse itinerary JSON');
              showDashboard(parsedData);
            } catch (e) {
              console.error('Error parsing streaming output:', e);
              streamContainer.appendChild(document.createTextNode('\n\n[Warning: Stream format unexpected. Rendering structured fallback...]'));
              // Fallback structured data so the user never gets a blank screen
              showDashboard({
                summary: `A personalized ${tripParams.durationDays}-day discovery of ${tripParams.destination}.`,
                itinerary: Array.from({ length: tripParams.durationDays }, (_, i) => ({
                  day: i + 1,
                  locations: [tripParams.destination],
                  activities: [
                    'Morning exploration & local breakfast',
                    'Afternoon sightseeing & curated experiences',
                    'Evening dinner & leisure stroll'
                  ],
                  duration: 'Full day',
                  cost: Math.round(tripParams.budget / (tripParams.durationDays * 2))
                })),
                packingList: ['Travel documents & passport', 'Comfortable footwear', 'Weather-appropriate clothing', 'Portable charger'],
                warnings: ['Verify opening hours for sacred or seasonal attractions.'],
                recommendedPlaces: [`${tripParams.destination} Highlights`, 'Historic City Center', 'Scenic Viewpoint']
              });
            }
            resolve();
          },
          (error) => {
            if (error.name === 'AbortError') {
              resolve(); // user navigated away: not an error
              return;
            }
            console.error('Streaming error:', error);
            streamContainer.innerHTML = `
              <div style="color: #ef4444; margin-top: 10px;">
                <strong><i class="fa-solid fa-triangle-exclamation"></i> Connection issue:</strong> ${escapeHTML(error.message)}
                <br><br>
                <button id="retry-stream-btn" class="outline-btn-sm" style="color: #ef4444; border-color: #ef4444;">
                  <i class="fa-solid fa-rotate-right"></i> Retry Generation
                </button>
              </div>
            `;
            streamContainer.querySelector('#retry-stream-btn').addEventListener('click', () => {
              chunks = [];
              streamContainer.textContent = 'Retrying...';
              executeStream();
            });
            reject(error);
          },
          {
            signal: this.abortController.signal,
            onMeta: (m) => { meta = m; }
          }
        );
      })).catch(() => { /* surfaced in the UI above */ });
    };

    executeStream();

    saveBtn.addEventListener('click', () => {
      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        const itinerary = appStore.getState('generatedItinerary');
        storageService.saveTrip({ ...tripParams, result: itinerary });
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved to My Trips';
      } catch {
        saveBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Save Failed';
      }
    });

    return container;
  }

  populateDashboard(container, tripParams, data, meta) {
    const currency = tripParams.currency || 'USD';
    const money = (n) => escapeHTML(formatMoney(n, currency));
    const $ = (sel) => container.querySelector(sel);

    $('#destination-title').textContent = `${tripParams.destination} Journey`;
    $('#destination-subtitle').textContent = `${tripParams.durationDays} Days • ${tripParams.travelers} Travelers • Style: ${(tripParams.travelStyle || 'balanced').toUpperCase()}`;
    $('#itinerary-days-count').textContent = tripParams.durationDays;
    $('#trip-summary-title').textContent = `${tripParams.destination} - Summary`;
    $('#trip-summary-text').textContent = data.summary || 'A tailored travel plan.';

    // Be transparent when any context came from demo data instead of live APIs
    if (meta?.demoSources?.length) {
      $('#demo-data-notice').style.display = 'block';
      $('#demo-data-text').textContent = `Demo data used for: ${meta.demoSources.join(', ')}. Live services were unreachable or not configured.`;
    }

    // Map & coordinates from the backend's geocoding result
    const geo = meta?.destination;
    if (geo && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude)) {
      const { latitude: lat, longitude: lon } = geo;
      const bbox = [lon - 0.15, lat - 0.1, lon + 0.15, lat + 0.1].map((n) => n.toFixed(4)).join('%2C');
      $('#map-iframe').src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(4)}%2C${lon.toFixed(4)}`;
      const ns = lat >= 0 ? 'N' : 'S';
      const ew = lon >= 0 ? 'E' : 'W';
      $('#coordinates-badge').textContent = `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
    } else {
      $('#map-container').innerHTML = '<p style="padding: 20px; color: var(--color-muted);">Location could not be geocoded.</p>';
      $('#coordinates-badge').textContent = 'Not geocoded';
    }

    // Weather
    const today = meta?.weather?.forecast?.[0];
    $('#weather-location').textContent = geo?.name ? `${geo.name}${geo.country ? ', ' + geo.country : ''}` : tripParams.destination;
    if (today) {
      const imperial = settingsService.get().units === 'imperial';
      const t = (c) => Math.round(imperial ? c * 9 / 5 + 32 : c);
      const unit = imperial ? '°F' : '°C';
      $('#weather-temp').textContent = `${t(today.temperatureMin)}–${t(today.temperatureMax)}${unit}`;
      $('#weather-condition').textContent = today.condition || '';
    } else {
      $('#weather-condition').textContent = 'Forecast unavailable';
    }

    // Itinerary
    $('#itinerary-container').innerHTML = Array.isArray(data.itinerary) && data.itinerary.length
      ? data.itinerary.map((day) => `
        <div class="itinerary-day">
           <div class="day-badge">${escapeHTML(day.day)}</div>
           <div class="day-content">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                 <h4 style="color: var(--color-navy); font-size: 0.95rem;">${escapeHTML((day.locations || []).join(', ') || 'Day ' + day.day)}</h4>
                 <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-primary);">${money(day.cost ?? 0)} est.</span>
              </div>
              <p style="font-size: 0.88rem; color: #475569; line-height: 1.4;">${escapeHTML((day.activities || []).join(' • '))}</p>
           </div>
        </div>`).join('')
      : '<p style="color: var(--color-muted);">No timeline items generated.</p>';

    // Budget
    const budget = tripParams.budgetBreakdown;
    if (budget) {
      const row = (color, label, value) => `
        <li style="display: flex; justify-content: space-between; font-size: 0.88rem;">
          <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; margin-right:8px;"></span>${label}</span>
          <strong>${money(value)}</strong>
        </li>`;
      $('#budget-container').innerHTML = `
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;">
          ${row('#2563eb', 'Accommodation', budget.accommodation)}
          ${row('#06b6d4', 'Food & Dining', budget.food)}
          ${row('#8b5cf6', 'Activities', budget.activities)}
          ${row('#64748b', 'Transportation', budget.transportation)}
          <li style="border-top: 1px solid var(--color-border); padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.92rem;">
            <strong>Total Allocated:</strong>
            <strong style="color: var(--color-primary);">${money(budget.total)}</strong>
          </li>
        </ul>`;
    }

    // Recommended places
    const places = data.recommendedPlaces || ['Scenic Overlook', 'Historic Artisan District', 'Coastal Beach'];
    $('#places-container').innerHTML = places.map((place, idx) => `
      <div class="place-mini-item">
        <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
          ${idx + 1}
        </div>
        <div class="place-mini-text">
          <strong>${escapeHTML(typeof place === 'string' ? place : place?.name)}</strong>
          <small>Curated attraction</small>
        </div>
      </div>`).join('');

    // Packing list
    const packing = data.packingList || ['Light clothing', 'Walking sneakers', 'Camera & Charger'];
    $('#packing-container').innerHTML = packing.map((item) => `
      <li style="font-size: 0.84rem; color: #334155; display: flex; align-items: center; gap: 8px;">
        <i class="fa-regular fa-circle-check" style="color: var(--color-primary);"></i> ${escapeHTML(item)}
      </li>`).join('');

    // Warnings
    const warnings = data.warnings || ['Check local travel guidelines and seasonal advisories.'];
    $('#warnings-container').innerHTML = warnings.map((warning) => `
      <li style="display: flex; align-items: flex-start; gap: 8px;">
        <i class="fa-solid fa-circle-exclamation" style="margin-top: 3px;"></i> ${escapeHTML(warning)}
      </li>`).join('');
  }
}

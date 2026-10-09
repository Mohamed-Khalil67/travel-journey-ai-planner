import { appStore } from '../state/store.js';
import { validateTripForm } from '../utils/validation.js';
import { calculateTripDuration, toLocalISODate } from '../utils/dates.js';
import { calculateBudget } from '../utils/budget.js';
import { escapeHTML } from '../utils/html.js';
import { settingsService } from '../services/settings-service.js';

export class PlanView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'card plan-card';
    
    container.innerHTML = `
      <h3 style="margin-bottom: 20px;">Plan Your Perfect Trip</h3>
      <div id="form-errors" style="color: #ef4444; margin-bottom: 16px; font-size: 0.9rem;"></div>
      <form id="trip-form" class="plan-trip-form">
        
        <div class="form-group" style="grid-column: span 3;">
          <label>Destination</label>
          <div class="input-with-icon">
            <i class="fa-solid fa-location-dot"></i>
            <input type="text" id="destination" placeholder="Bali, Indonesia">
          </div>
        </div>

        <div class="form-group">
          <label>Start Date</label>
          <div class="input-with-icon">
            <input type="date" id="startDate">
          </div>
        </div>

        <div class="form-group">
          <label>End Date</label>
          <div class="input-with-icon">
            <input type="date" id="endDate">
          </div>
        </div>

        <div class="form-group">
          <label>Travelers</label>
          <div class="input-with-icon">
            <i class="fa-solid fa-user-group"></i>
            <input type="number" id="travelers" min="1" value="2">
          </div>
        </div>

        <div class="form-group">
          <label>Budget Amount</label>
          <div class="input-with-icon">
            <i class="fa-solid fa-coins"></i>
            <input type="number" id="budgetAmount" min="100" value="2000">
          </div>
        </div>

        <div class="form-group">
          <label>Budget Currency</label>
          <div class="input-with-icon">
            <select id="budgetCurrency">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Travel Style</label>
          <div class="input-with-icon">
            <select id="travelStyle">
              <option value="balanced">Balanced</option>
              <option value="luxury">Luxury</option>
              <option value="adventure">Adventure</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="grid-column: span 3;">
          <label>Interests</label>
          <div class="pills-container" id="interests-container">
            <div class="pill active" data-value="beaches">Beaches <i class="fa-solid fa-xmark"></i></div>
            <div class="pill active" data-value="culture">Culture <i class="fa-solid fa-xmark"></i></div>
            <div class="pill active" data-value="food">Food <i class="fa-solid fa-xmark"></i></div>
            <div class="pill" data-value="nature">Nature <i class="fa-solid fa-plus"></i></div>
            <div class="pill" data-value="history">History <i class="fa-solid fa-plus"></i></div>
          </div>
        </div>

        <div class="form-group" style="grid-column: span 3;">
          <label>Additional Notes</label>
          <textarea id="notes" rows="3" style="width: 100%; border: 1px solid var(--border-light); border-radius: 8px; padding: 10px;" placeholder="e.g. accessibility needs, dietary restrictions..."></textarea>
        </div>

        <div class="form-footer">
          <button type="submit" id="generate-btn" style="width: 100%; max-width: 300px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Generate My Journey &rarr;
          </button>
        </div>
      </form>
    `;

    // Selected interests live in a Set: O(1) toggle, no duplicates, DOM only reflects it.
    const selectedInterests = new Set(
      Array.from(container.querySelectorAll('.pill.active'), (p) => p.dataset.value)
    );
    container.querySelectorAll('.pill').forEach((pill) => {
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      const toggle = () => {
        const { value } = pill.dataset;
        const isActive = !selectedInterests.has(value);
        if (isActive) selectedInterests.add(value);
        else selectedInterests.delete(value);
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-pressed', String(isActive));
        pill.querySelector('i').className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-plus';
      };
      pill.addEventListener('click', toggle);
      pill.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });

    const form = container.querySelector('#trip-form');
    const errorContainer = container.querySelector('#form-errors');
    const submitBtn = container.querySelector('#generate-btn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const rawData = {
        destination: form.querySelector('#destination').value.trim(),
        startDate: form.querySelector('#startDate').value,
        endDate: form.querySelector('#endDate').value,
        travelers: Number(form.querySelector('#travelers').value),
        budget: Number(form.querySelector('#budgetAmount').value),
        currency: form.querySelector('#budgetCurrency').value,
        interests: [...selectedInterests],
        travelStyle: form.querySelector('#travelStyle').value,
        notes: form.querySelector('#notes').value.trim()
      };

      const validation = validateTripForm(rawData);
      if (!validation.valid) {
        errorContainer.innerHTML = Object.values(validation.errors).map(escapeHTML).join('<br>');
        return;
      }
      errorContainer.innerHTML = '';

      const durationDays = calculateTripDuration(rawData.startDate, rawData.endDate);
      const budgetBreakdown = calculateBudget(rawData.budget, rawData.travelStyle);

      const tripData = {
        ...rawData,
        durationDays,
        budgetBreakdown
      };

      appStore.setState('currentTripParams', tripData);
      window.navigateTo('/results');
    });

    // Preset dates in the user's local timezone (valueAsDate would use UTC and can land on yesterday)
    const today = new Date();
    const lastDay = new Date();
    lastDay.setDate(today.getDate() + 6); // a 7-day trip, both ends inclusive
    const startInput = container.querySelector('#startDate');
    const endInput = container.querySelector('#endDate');
    startInput.value = toLocalISODate(today);
    startInput.min = toLocalISODate(today);
    endInput.value = toLocalISODate(lastDay);
    endInput.min = startInput.value;
    startInput.addEventListener('change', () => { endInput.min = startInput.value; });

    // Defaults from Settings, and a destination handed over via /plan?destination=...
    container.querySelector('#budgetCurrency').value = settingsService.get().currency;
    const prefill = this.params?.query?.destination;
    if (prefill) container.querySelector('#destination').value = prefill;

    return container;
  }
}

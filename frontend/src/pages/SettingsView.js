import { settingsService } from '../services/settings-service.js';
import { storageService } from '../services/storage-service.js';
import { escapeHTML } from '../utils/html.js';

export class SettingsView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'settings-view';

    const current = settingsService.get();

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--color-navy); margin-bottom: 6px;">Settings & Preferences</h2>
        <p style="color: var(--color-muted); font-size: 0.95rem;">Configure default currencies, user profile details, and API configuration.</p>
      </div>

      <div class="card" style="max-width: 680px;">
        <form id="settings-form" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">TRAVELLER PROFILE NAME</label>
            <input type="text" id="settings-name" value="${escapeHTML(current.travelerName)}" maxlength="40" style="padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">DEFAULT CURRENCY</label>
              <select id="settings-currency" style="padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%;">
                <option value="USD" ${current.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${current.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="GBP" ${current.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                <option value="CAD" ${current.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option>
                <option value="AUD" ${current.currency === 'AUD' ? 'selected' : ''}>AUD ($)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">PREFERRED TRAVEL PACE</label>
              <select id="settings-pace" style="padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%;">
                <option value="relaxed" ${current.preferredPace === 'relaxed' ? 'selected' : ''}>Relaxed</option>
                <option value="balanced" ${current.preferredPace === 'balanced' ? 'selected' : ''}>Balanced</option>
                <option value="fast" ${current.preferredPace === 'fast' ? 'selected' : ''}>Fast & Active</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">TEMPERATURE UNITS</label>
            <select id="settings-units" style="padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%;">
              <option value="metric" ${current.units === 'metric' ? 'selected' : ''}>Celsius (°C)</option>
              <option value="imperial" ${current.units === 'imperial' ? 'selected' : ''}>Fahrenheit (°F)</option>
            </select>
          </div>

          <div style="border-top: 1px solid var(--color-border); padding-top: 16px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 6px;">STORAGE & DATA</label>
            <p style="font-size: 0.84rem; color: var(--color-muted); margin-bottom: 12px;">Reset all cached searches and saved itineraries from your browser's local store.</p>
            <button type="button" id="clear-data-btn" class="outline-btn-sm" style="color: #ef4444; border-color: #ef4444;">
              <i class="fa-solid fa-triangle-exclamation"></i> Clear All Saved Trips
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 16px;">
            <button type="submit" class="primary-btn"><i class="fa-solid fa-check"></i> Save Settings</button>
            <span id="save-status-indicator" style="color: var(--color-success); font-size: 0.88rem; font-weight: 600;"></span>
          </div>
        </form>
      </div>
    `;

    const form = container.querySelector('#settings-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      settingsService.save({
        travelerName: form.querySelector('#settings-name').value.trim() || 'Explorer',
        currency: form.querySelector('#settings-currency').value,
        preferredPace: form.querySelector('#settings-pace').value,
        units: form.querySelector('#settings-units').value
      });

      const status = container.querySelector('#save-status-indicator');
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 3000);
    });

    const clearBtn = container.querySelector('#clear-data-btn');
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all saved trips? This cannot be undone.')) {
        storageService.clear();
        const status = container.querySelector('#save-status-indicator');
        status.textContent = 'All saved trips cleared.';
        setTimeout(() => status.textContent = '', 3000);
      }
    });

    return container;
  }
}

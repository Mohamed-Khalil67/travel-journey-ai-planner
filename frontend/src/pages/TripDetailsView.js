import { storageService } from '../services/storage-service.js';
import { escapeHTML } from '../utils/html.js';
import { formatMoney } from '../utils/format.js';

export class TripDetailsView {
  constructor(params) {
    this.params = params; // params.id contains the trip ID
  }

  render() {
    const container = document.createElement('div');
    container.className = 'trip-details-view';
    
    container.innerHTML = `
      <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <button id="back-btn" class="outline-btn"><i class="fa-solid fa-arrow-left"></i> Back to All Saved Trips</button>
        <button id="delete-current-trip-btn" class="outline-btn" style="color: #ef4444; border-color: #ef4444;">
          <i class="fa-solid fa-trash"></i> Delete Trip
        </button>
      </div>
      <div id="trip-content">Loading trip details...</div>
    `;

    const backBtn = container.querySelector('#back-btn');
    backBtn.addEventListener('click', () => {
      window.navigateTo('/trips');
    });

    const deleteBtn = container.querySelector('#delete-current-trip-btn');
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this trip permanently?')) {
        storageService.deleteTrip(this.params.id);
        window.navigateTo('/trips');
      }
    });

    this.loadTripDetails(container.querySelector('#trip-content'));

    return container;
  }

  loadTripDetails(contentContainer) {
    try {
      const trip = storageService.getTrip(this.params.id);

      if (!trip) {
        contentContainer.innerHTML = `
          <div class="card" style="text-align: center; padding: 40px;">
            <h3>Trip not found</h3>
            <p style="color: var(--color-muted);">This trip may have been removed.</p>
            <button data-route="/trips" style="margin-top: 16px;">View All Trips</button>
          </div>
        `;
        return;
      }

      contentContainer.innerHTML = this.renderTripHTML(trip);
      this.attachNotesHandler(contentContainer, trip);
    } catch (err) {
      contentContainer.innerHTML = '<p>Error loading trip details.</p>';
    }
  }

  attachNotesHandler(container, trip) {
    const saveNotesBtn = container.querySelector('#save-notes-btn');
    const notesInput = container.querySelector('#trip-notes-input');
    const notesStatus = container.querySelector('#notes-save-status');

    if (saveNotesBtn && notesInput) {
      saveNotesBtn.addEventListener('click', () => {
        const newNotes = notesInput.value;
        storageService.updateTripNotes(trip.id, newNotes);
        notesStatus.textContent = 'Notes saved successfully!';
        setTimeout(() => {
          notesStatus.textContent = '';
        }, 3000);
      });
    }
  }

  renderTripHTML(trip) {
    const money = (n) => escapeHTML(formatMoney(n, trip.currency || 'USD'));
    let html = `
      <div class="dashboard-grid">
        <div class="main-column">
           <div class="card" style="margin-bottom: 24px;">
              <div class="card-header-row">
                <h3 id="trip-summary-title">${escapeHTML(trip.destination)} - Saved Journey</h3>
                <span class="badge-pill">Saved Plan</span>
              </div>
              <p style="color: #475569; margin-top: 8px; line-height: 1.6;">
                ${escapeHTML(trip.result?.summary || 'Tailored travel plan.')}
              </p>
           </div>
    `;
    
    if (trip.result && trip.result.itinerary) {
      html += `
           <div class="card" style="margin-bottom: 24px;">
              <div class="card-header-row">
                <h3><i class="fa-regular fa-calendar-check" style="color: var(--color-primary);"></i> ${escapeHTML(trip.durationDays || trip.result.itinerary.length)}-Day Timeline</h3>
                <span class="badge-pill">Daily Itinerary</span>
              </div>
              <div class="itinerary-list">
      `;
      trip.result.itinerary.forEach(day => {
        html += `
          <div class="itinerary-day">
             <div class="day-badge">${escapeHTML(day.day)}</div>
             <div class="day-content">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                  <h4 style="color: var(--color-navy); font-size: 0.95rem;">${escapeHTML((day.locations || []).join(', ') || 'Day ' + day.day)}</h4>
                  <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-primary);">${money(day.cost ?? 0)} est.</span>
                </div>
                <p style="font-size: 0.88rem; color: #475569; line-height: 1.4;">${escapeHTML((day.activities || []).join(' • '))}</p>
             </div>
          </div>
        `;
      });
      html += `</div></div></div>`;
    } else {
      html += `</div>`;
    }

    // Side column
    html += `<div class="side-column">`;

    // Editable Notes Card
    html += `
      <div class="card" style="margin-bottom: 24px;">
         <div class="card-header-row">
            <h4><i class="fa-regular fa-note-sticky" style="color: var(--color-primary);"></i> Trip Notes</h4>
            <span class="badge-pill">Editable</span>
         </div>
         <p style="font-size: 0.82rem; color: var(--color-muted); margin-bottom: 8px;">Personal notes, reminders, or itinerary modifications:</p>
         <textarea id="trip-notes-input" rows="4" style="width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px; font-size: 0.88rem; margin-bottom: 10px;">${escapeHTML(trip.notes)}</textarea>
         <div style="display: flex; justify-content: space-between; align-items: center;">
           <button id="save-notes-btn" class="primary-btn" style="padding: 6px 14px; font-size: 0.82rem;">Save Notes</button>
           <span id="notes-save-status" style="font-size: 0.8rem; color: var(--color-success); font-weight: 600;"></span>
         </div>
      </div>
    `;

    if (trip.budgetBreakdown) {
       html += `
         <div class="card" style="margin-bottom: 24px;">
            <div class="card-header-row">
              <h4><i class="fa-solid fa-calculator" style="color: var(--color-primary);"></i> Estimated Budget</h4>
              <span class="badge-pill">Summary</span>
            </div>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              <li style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                <span>Accommodation:</span> 
                <strong>${money(trip.budgetBreakdown.accommodation)}</strong>
              </li>
              <li style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                <span>Food & Dining:</span>
                <strong>${money(trip.budgetBreakdown.food)}</strong>
              </li>
              <li style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                <span>Activities:</span>
                <strong>${money(trip.budgetBreakdown.activities)}</strong>
              </li>
              <li style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                <span>Transportation:</span>
                <strong>${money(trip.budgetBreakdown.transportation)}</strong>
              </li>
              <li style="border-top: 1px solid var(--color-border); padding-top: 6px; display: flex; justify-content: space-between; font-size: 0.92rem;">
                <strong>Total Allocated:</strong>
                <strong style="color: var(--color-primary);">${money(trip.budgetBreakdown.total)}</strong>
              </li>
            </ul>
         </div>
       `;
    }

    html += `</div></div>`;

    return html;
  }
}

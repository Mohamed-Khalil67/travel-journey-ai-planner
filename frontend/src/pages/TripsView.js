import { storageService } from '../services/storage-service.js';
import { escapeHTML } from '../utils/html.js';

export class TripsView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'trips-view';
    
    container.innerHTML = `
      <h2 style="margin-bottom: 24px;">Saved Trips</h2>
      <div id="trips-list" class="dashboard-grid" style="grid-template-columns: 1fr; gap: 16px;">Loading...</div>
    `;

    this.loadTrips(container.querySelector('#trips-list'));

    return container;
  }

  loadTrips(listContainer) {
    try {
      const trips = storageService.getTrips();
      
      if (trips.length === 0) {
        listContainer.innerHTML = `
          <div class="card" style="text-align: center; padding: 40px;">
            <i class="fa-regular fa-map" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 16px;"></i>
            <p style="color: #64748b;">Your journeys will appear here.</p>
            <button data-route="/plan" style="margin-top: 16px;">Plan a Trip</button>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      trips.forEach(trip => {
        const div = document.createElement('div');
        div.className = 'card trip-card';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
          <div>
            <h3>${escapeHTML(trip.destination)} (${escapeHTML(trip.durationDays)} days)</h3>
            <p style="margin-bottom: 0;">Created: ${escapeHTML(new Date(trip.createdAt).toLocaleString())}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="view-btn outline-btn">View Details</button>
            <button class="delete-btn danger-btn" style="background: #ef4444;">Delete</button>
          </div>
        `;
        
        const viewBtn = div.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
          window.navigateTo(`/trips/${encodeURIComponent(trip.id)}`);
        });

        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to delete this trip?')) {
            storageService.deleteTrip(trip.id);
            this.loadTrips(listContainer);
          }
        });

        listContainer.appendChild(div);
      });
    } catch (err) {
      listContainer.innerHTML = '<p>Failed to load trips.</p>';
    }
  }
}

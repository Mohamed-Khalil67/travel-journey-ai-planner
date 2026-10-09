import { escapeHTML } from '../utils/html.js';

export class SavedPlacesView {
  constructor(params) {
    this.params = params;
    this.storageKey = 'travel_journey_saved_places';
  }

  getSavedPlaces() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    // Default initial saved places
    return [
      {
        id: 'place_1',
        name: 'Uluwatu Clifftop Temple',
        destination: 'Bali, Indonesia',
        category: 'Historic Landmark',
        image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=400&q=80',
        note: 'Famous for sunset Kecak fire dance and ocean views.'
      },
      {
        id: 'place_2',
        name: 'Fushimi Inari Shrine',
        destination: 'Kyoto, Japan',
        category: 'Sacred Site',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
        note: 'Must visit early in the morning before crowds arrive.'
      },
      {
        id: 'place_3',
        name: 'Positano Cliffside Beach',
        destination: 'Amalfi Coast, Italy',
        category: 'Beach & Nature',
        image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80',
        note: 'Stunning panorama with seaside seafood trattorias.'
      }
    ];
  }

  savePlaces(places) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(places));
    } catch (e) {
      console.error('Failed to save places', e);
    }
  }

  render() {
    const container = document.createElement('div');
    container.className = 'saved-places-view';

    const places = this.getSavedPlaces();

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--color-navy); margin-bottom: 6px;">Saved Places</h2>
          <p style="color: var(--color-muted); font-size: 0.95rem;">Your collection of bookmarked attractions, landmarks, and travel spots.</p>
        </div>
        <button id="add-custom-place-btn" class="primary-btn"><i class="fa-solid fa-plus"></i> Bookmark Place</button>
      </div>

      <div id="places-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
        ${places.map(p => `
          <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
            <div style="height: 160px; position: relative;">
              <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 10px; right: 10px; background: rgba(15,23,42,0.7); color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.72rem;">
                ${escapeHTML(p.category)}
              </div>
            </div>
            <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h4 style="font-size: 1.05rem; color: var(--color-navy); margin-bottom: 4px;">${escapeHTML(p.name)}</h4>
                <p style="font-size: 0.82rem; color: var(--color-primary); margin-bottom: 8px;"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(p.destination)}</p>
                <p style="font-size: 0.84rem; color: #475569; line-height: 1.35; margin-bottom: 12px;">${escapeHTML(p.note)}</p>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 12px;">
                <button class="outline-btn-sm plan-dest-btn" data-dest="${escapeHTML(p.destination)}">Plan Trip</button>
                <button class="outline-btn-sm delete-place-btn" data-id="${escapeHTML(p.id)}" aria-label="Delete ${escapeHTML(p.name)}" style="color: #ef4444; border-color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Handle delete
    container.querySelectorAll('.delete-place-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const updated = places.filter(p => p.id !== id);
        this.savePlaces(updated);
        window.navigateTo('/saved-places');
      });
    });

    // Handle plan trip
    container.querySelectorAll('.plan-dest-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const destination = e.currentTarget.getAttribute('data-dest');
        window.navigateTo(`/plan?destination=${encodeURIComponent(destination)}`);
      });
    });

    // Add place prompt
    container.querySelector('#add-custom-place-btn').addEventListener('click', () => {
      const name = prompt('Enter place/attraction name:');
      if (!name) return;
      const dest = prompt('Enter destination/city:') || 'World';
      const note = prompt('Add a quick note:') || 'Saved travel spot.';
      const newPlace = {
        id: globalThis.crypto?.randomUUID ? `place_${crypto.randomUUID()}` : `place_${Date.now()}`,
        name: name.trim(),
        destination: dest.trim(),
        category: 'Favorite',
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
        note
      };
      places.unshift(newPlace);
      this.savePlaces(places);
      window.navigateTo('/saved-places');
    });

    return container;
  }
}

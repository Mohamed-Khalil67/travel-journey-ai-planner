import { appStore } from '../state/store.js';
import { PlanView } from './PlanView.js';

export class HomeView {
  constructor(params) {
    this.params = params;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'home-dashboard-layout';

    // 1. Plan Form section embedded right on the dashboard like Page 1 & 10 of PDF
    const planViewInstance = new PlanView({});
    const planFormNode = planViewInstance.render();

    // 2. Featured Destination Banner
    const featuredCard = document.createElement('div');
    featuredCard.className = 'card featured-destination-card';
    featuredCard.innerHTML = `
      <div class="featured-image-wrapper">
        <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80" alt="Bali, Indonesia" class="featured-img" />
        <div class="featured-overlay">
          <div class="featured-badge"><i class="fa-solid fa-location-dot"></i> Bali, Indonesia</div>
          <p class="featured-tags">Temples • Beaches • Rich Culture • Unforgettable Sunsets</p>
          <blockquote class="featured-quote">“A place where every moment feels like a postcard.”</blockquote>
        </div>
      </div>
    `;

    // 3. Bottom Quick Preview Grid matching PDF Page 1 / 10
    const previewGrid = document.createElement('div');
    previewGrid.className = 'dashboard-preview-grid';
    previewGrid.innerHTML = `
      <div class="card preview-summary-card">
        <div class="card-header-row">
          <h4><i class="fa-regular fa-compass"></i> Trip Overview</h4>
          <span class="badge-pill">Your journey at a glance</span>
        </div>
        <div class="preview-mini-content">
          <img src="https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80" class="mini-thumb" alt="Bali overview" />
          <div class="mini-meta">
            <p><strong>Bali, Indonesia</strong></p>
            <p><i class="fa-regular fa-calendar"></i> 5 Days • 2 Travelers</p>
            <p><i class="fa-solid fa-coins"></i> $1,000 - $2,000 Budget</p>
            <p><i class="fa-solid fa-heart"></i> Beaches, Culture, Food</p>
          </div>
        </div>
        <button class="outline-btn-sm" data-route="/plan"><i class="fa-solid fa-wand-magic-sparkles"></i> Customize Plan</button>
      </div>

      <div class="card preview-itinerary-card">
        <div class="card-header-row">
          <h4><i class="fa-regular fa-calendar-check"></i> Sample 5-Day Plan</h4>
          <span class="badge-pill">Culture & Beach</span>
        </div>
        <ul class="mini-itinerary-timeline">
          <li><span class="num-dot">1</span> Arrival, Seminyak Beach sunset & seafood</li>
          <li><span class="num-dot">2</span> Ubud cultural temples & sacred monkey forest</li>
          <li><span class="num-dot">3</span> Tegenungan waterfall & artisan craft villages</li>
          <li><span class="num-dot">4</span> Nusa Penida speedboat tour & snorkeling</li>
          <li><span class="num-dot">5</span> Relaxing Balinese massage & airport departure</li>
        </ul>
      </div>

      <div class="card preview-weather-card">
        <div class="weather-top-row">
          <div>
            <span class="weather-label">Forecast</span>
            <h4>Bali, Indonesia</h4>
          </div>
          <div class="weather-main-temp">
            <i class="fa-solid fa-sun" style="color: #f59e0b;"></i> 30°C
            <small>Partly Sunny</small>
          </div>
        </div>
        <div class="forecast-days-row">
          <div class="f-day"><span>Sat</span><i class="fa-solid fa-sun"></i><span>30°</span></div>
          <div class="f-day"><span>Sun</span><i class="fa-solid fa-cloud-sun"></i><span>31°</span></div>
          <div class="f-day"><span>Mon</span><i class="fa-solid fa-sun"></i><span>31°</span></div>
          <div class="f-day"><span>Tue</span><i class="fa-solid fa-cloud"></i><span>30°</span></div>
          <div class="f-day"><span>Wed</span><i class="fa-solid fa-cloud-sun"></i><span>31°</span></div>
        </div>
      </div>

      <div class="card preview-places-card">
        <div class="card-header-row">
          <h4><i class="fa-solid fa-map-pin"></i> Suggested Places</h4>
          <span class="badge-pill">Handpicked</span>
        </div>
        <div class="places-horizontal-list">
          <div class="place-mini-item">
            <img src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=300&q=80" alt="Uluwatu Temple" />
            <div class="place-mini-text">
              <strong>Uluwatu Temple</strong>
              <small>Iconic ocean clifftop temple</small>
            </div>
          </div>
          <div class="place-mini-item">
            <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=300&q=80" alt="Tegallalang" />
            <div class="place-mini-text">
              <strong>Tegallalang Terraces</strong>
              <small>Lush emerald rice paddies</small>
            </div>
          </div>
        </div>
      </div>
    `;

    // Assemble top row (Form on left, Featured Hero on right)
    const topRow = document.createElement('div');
    topRow.className = 'home-top-grid';
    topRow.appendChild(planFormNode);
    topRow.appendChild(featuredCard);

    container.appendChild(topRow);
    container.appendChild(previewGrid);

    return container;
  }
}

import './styles/main.css';
import { Router } from './router/index.js';
import { settingsService } from './services/settings-service.js';
import { appStore } from './state/store.js';

import { HomeView } from './pages/HomeView.js';
import { PlanView } from './pages/PlanView.js';
import { ResultsView } from './pages/ResultsView.js';
import { TripsView } from './pages/TripsView.js';
import { TripDetailsView } from './pages/TripDetailsView.js';
import { DiscoverView } from './pages/DiscoverView.js';
import { SavedPlacesView } from './pages/SavedPlacesView.js';
import { TravelTipsView } from './pages/TravelTipsView.js';
import { SettingsView } from './pages/SettingsView.js';
import { NotFoundView } from './pages/NotFoundView.js';

const routes = [
  { path: '/', view: HomeView },
  { path: '/plan', view: PlanView },
  { path: '/results', view: ResultsView },
  { path: '/trips', view: TripsView },
  { path: '/trips/:id', view: TripDetailsView },
  { path: '/discover', view: DiscoverView },
  { path: '/saved-places', view: SavedPlacesView },
  { path: '/travel-tips', view: TravelTipsView },
  { path: '/settings', view: SettingsView },
  { path: '*', view: NotFoundView }
];

const IMAGE_PLACEHOLDER = '/placeholder.svg';

/** Swap any remote image that fails to load (offline, blocked CDN) for a local placeholder. */
function installImageFallback() {
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && !img.dataset.fallback) {
      img.dataset.fallback = 'true';
      img.src = IMAGE_PLACEHOLDER;
    }
  }, true); // 'error' doesn't bubble, so listen in the capture phase
}

function renderGreeting(settings = settingsService.get()) {
  const title = document.getElementById('greeting-title');
  if (title) title.textContent = `Hello, ${settings.travelerName || 'Explorer'}!`;
}

document.addEventListener('DOMContentLoaded', () => {
  installImageFallback();
  renderGreeting();
  appStore.subscribe('settings', renderGreeting);

  const router = new Router(routes);
  window.navigateTo = (url) => router.navigate(url);
  router.init();
});

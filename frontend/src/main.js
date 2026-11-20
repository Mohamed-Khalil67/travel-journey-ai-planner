import './styles/main.css';
import { Router } from './router/index.js';
import { settingsService } from './services/settings-service.js';
import { appStore } from './state/store.js';
import { inject } from '@vercel/analytics';

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
  const name = settings.travelerName || 'Explorer';
  const title = document.getElementById('greeting-title');
  if (title) title.textContent = `Hello, ${name}!`;
  const profileName = document.getElementById('profile-name');
  if (profileName) profileName.textContent = name;
}

/**
 * Accessible profile dropdown (WAI-ARIA menu button pattern):
 * toggles on click, Arrow keys move between items, Escape / outside click / navigation close it.
 */
function installProfileMenu() {
  const button = document.getElementById('profile-menu-btn');
  const menu = document.getElementById('profile-dropdown');
  if (!button || !menu) return;
  const items = () => [...menu.querySelectorAll('[role="menuitem"]')];

  const open = (focusIndex = null) => {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (focusIndex !== null) items().at(focusIndex)?.focus();
  };
  const close = ({ restoreFocus = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => (menu.hidden ? open() : close()));
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); open(-1); }
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); list.at(-1).focus(); }
    if (e.key === 'Escape') { e.preventDefault(); close({ restoreFocus: true }); }
    if (e.key === 'Tab') close();
  });
  // Choosing an item navigates (the router's data-route delegation) and closes the menu.
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[role="menuitem"]')) close();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-menu')) close();
  });
  window.addEventListener('popstate', () => close());
}

document.addEventListener('DOMContentLoaded', () => {
  installImageFallback();
  installProfileMenu();
  renderGreeting();
  appStore.subscribe('settings', renderGreeting);

  const router = new Router(routes);
  window.navigateTo = (url) => router.navigate(url);
  router.init();
  
  // Initialize Vercel Web Analytics
  inject();
});

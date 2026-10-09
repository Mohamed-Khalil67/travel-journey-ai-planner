export class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.subscribers = new Map();
    this.loadPersistedParams();
  }

  loadPersistedParams() {
    try {
      const saved = sessionStorage.getItem('travel_journey_current_params');
      if (saved) {
        this.state.currentTripParams = JSON.parse(saved);
      }
    } catch (_) {}
  }

  // Subscribe to changes on a specific key or general updates
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Publish state change
  publish(key, data) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(callback => callback(data));
    }
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => callback(this.state));
    }
  }

  // Update state and notify subscribers
  setState(key, value) {
    this.state[key] = value;
    if (key === 'currentTripParams') {
      try {
        sessionStorage.setItem('travel_journey_current_params', JSON.stringify(value));
      } catch (_) {}
    }
    this.publish(key, value);
  }

  getState(key) {
    return key ? this.state[key] : this.state;
  }
}

// Singleton store instance
export const appStore = new Store({
  currentTripParams: null,
  tripPreferences: null,
  currentTrip: null,
  savedTrips: [],
  isLoading: false,
  error: null
});

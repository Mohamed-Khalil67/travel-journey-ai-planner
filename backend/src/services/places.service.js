/**
 * Placeholder for a points-of-interest provider (e.g. OpenTripMap / Foursquare).
 * Returns an empty list so the AI recommends places itself instead of being fed fake ones.
 */
export class PlacesService {
  async getNearbyPlaces(/* location */) {
    return [];
  }
}

export const placesService = new PlacesService();

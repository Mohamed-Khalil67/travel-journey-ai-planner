import { aiService } from '../services/ai.service.js';
import { geocodingService } from '../services/geocoding.service.js';
import { weatherService } from '../services/weather.service.js';
import { placesService } from '../services/places.service.js';
import { validateTripRequest } from '../validation/trip.validation.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Gathers the context the AI needs. Geocoding must finish first (weather and places
 * need its coordinates); weather and places are independent, so they run in parallel.
 */
async function buildContext(preferences, signal) {
  const destination = await geocodingService.search(preferences.destination, { signal });
  if (!destination) throw badRequest(`Could not find a place called "${preferences.destination}".`);

  const [weather, places] = await Promise.all([
    weatherService.getForecast(destination, { days: preferences.durationDays, signal }),
    placesService.getNearbyPlaces(destination, { signal })
  ]);

  const demoSources = [];
  if (destination.isDemo) demoSources.push('location');
  if (weather.isDemo) demoSources.push('weather');
  if (!aiService.isLive) demoSources.push('itinerary (no GEMINI_API_KEY)');

  return { context: { preferences, destination, weather, places }, demoSources };
}

export const generateItinerary = async (req, res, next) => {
  try {
    const { value, errors } = validateTripRequest(req.body);
    if (errors) throw badRequest(errors.join(' '));

    const { context, demoSources } = await buildContext(value);
    const result = await aiService.generateItinerary(context);
    res.json({ ...result, meta: { destination: context.destination, weather: context.weather, demoSources } });
  } catch (error) {
    next(error);
  }
};

export const streamItinerary = async (req, res, next) => {
  const { value, errors } = validateTripRequest(req.body);
  if (errors) return next(badRequest(errors.join(' ')));

  // Stop all upstream work (geocoding, weather, Gemini) if the browser goes away.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  let context;
  let demoSources;
  try {
    ({ context, demoSources } = await buildContext(value, controller.signal));
  } catch (error) {
    if (controller.signal.aborted) return;
    return next(error); // headers not sent yet: normal JSON error response
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    send({ meta: { destination: context.destination, weather: context.weather, demoSources } });
    for await (const chunk of aiService.streamItinerary(context, { signal: controller.signal })) {
      if (controller.signal.aborted) return;
      send({ chunk });
    }
    res.write('data: [DONE]\n\n');
  } catch (error) {
    if (controller.signal.aborted) return;
    // Headers are already sent, so report the failure in-band instead of via the error middleware.
    console.error('Stream failed:', error);
    send({ error: { message: 'Itinerary generation failed. Please retry.' } });
  } finally {
    res.end();
  }
};

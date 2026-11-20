import { aiService } from '../services/ai.service.js';
import { geocodingService } from '../services/geocoding.service.js';
import { weatherService } from '../services/weather.service.js';
import { placesService } from '../services/places.service.js';
import { validateTripRequest } from '../validation/trip.validation.js';

const AI_FALLBACK_LABEL = 'itinerary (AI service error, showing a demo plan)';

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
  const found = await geocodingService.search(preferences.destination, { signal });
  // An unknown place shouldn't block the trip: the AI can still plan it, just without a map.
  const destination = found ?? {
    name: preferences.destination, country: '', latitude: null, longitude: null, isDemo: true, notFound: true
  };

  const [weather, places] = await Promise.all([
    weatherService.getForecast(destination, { days: preferences.durationDays, signal }),
    placesService.getNearbyPlaces(destination, { signal })
  ]);

  const demoSources = [];
  if (destination.notFound) demoSources.push('location (place not found on the map)');
  else if (destination.isDemo) demoSources.push('location (geocoding service unreachable)');
  if (weather.isDemo) {
    demoSources.push(destination.latitude == null
      ? 'weather (needs a location on the map)'
      : 'weather (forecast service unreachable)');
  }
  if (!aiService.isLive) demoSources.push('itinerary (no GEMINI_API_KEY configured)');

  return { context: { preferences, destination, weather, places }, demoSources };
}

export const generateItinerary = async (req, res, next) => {
  try {
    const { value, errors } = validateTripRequest(req.body);
    if (errors) throw badRequest(errors.join(' '));

    const { context, demoSources } = await buildContext(value);
    const result = await aiService.generateItinerary(context, {
      onFallback: () => demoSources.push(AI_FALLBACK_LABEL)
    });
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

  const sendMeta = () => send({ meta: { destination: context.destination, weather: context.weather, demoSources } });

  try {
    sendMeta();
    const onFallback = () => {
      // The AI failed before streaming anything: resend meta so the UI labels the itinerary as demo data.
      demoSources.push(AI_FALLBACK_LABEL);
      sendMeta();
    };
    for await (const chunk of aiService.streamItinerary(context, { signal: controller.signal, onFallback })) {
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

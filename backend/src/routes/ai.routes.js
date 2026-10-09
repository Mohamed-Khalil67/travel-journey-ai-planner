import { Router } from 'express';
import { generateItinerary, streamItinerary } from '../controllers/ai.controller.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// AI calls cost money: allow a burst of 5, then 1 request every 12 seconds per IP.
const aiRateLimit = createRateLimiter({
  capacity: Number(process.env.AI_RATE_LIMIT_BURST) || 5,
  refillPerSecond: (Number(process.env.AI_RATE_LIMIT_PER_MINUTE) || 5) / 60
});

router.post('/generate', aiRateLimit, generateItinerary);
router.post('/stream', aiRateLimit, streamItinerary);

export default router;

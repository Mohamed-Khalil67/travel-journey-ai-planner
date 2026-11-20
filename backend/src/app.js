import 'dotenv/config'; // must load before services read process.env
import express from 'express';
import cors from 'cors';
import { logger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import aiRoutes from './routes/ai.routes.js';

/**
 * The Express app, without a listener, so it can run either as a long-lived
 * server (backend/server.js) or as the Vercel `backend` service (entrypoint src/app.js).
 */
const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.disable('x-powered-by');
// Behind Vercel's (or any) reverse proxy, req.ip must come from X-Forwarded-For,
// otherwise every visitor shares one rate-limit bucket.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
// Same-origin requests (the deployed SPA) don't need CORS; this only governs other origins.
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use(logger);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Travel Journey Backend is running',
    ai: process.env.GEMINI_API_KEY ? 'gemini' : 'demo'
  });
});

app.use('/api/ai', aiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: { message: 'Not found', status: 404 } });
});
app.use(errorHandler);

export default app;

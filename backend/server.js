import 'dotenv/config'; // must load before services read process.env
import express from 'express';
import cors from 'cors';
import { logger } from './src/middleware/logger.middleware.js';
import { errorHandler } from './src/middleware/error.middleware.js';
import aiRoutes from './src/routes/ai.routes.js';

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use(logger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Travel Journey Backend is running' });
});

app.use('/api/ai', aiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', status: 404 } });
});
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

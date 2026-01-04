import express from 'express';
import cors from 'cors';
import { config } from '../config.js';
import { authMiddleware, devAuthMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscriptions.js';
import syncRoutes from './routes/sync.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.webAppUrl,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Choose auth middleware based on environment
const auth = process.env.NODE_ENV === 'production'
  ? authMiddleware
  : devAuthMiddleware;

// Routes
app.use('/api/auth', auth, authRoutes);
app.use('/api/subscriptions', auth, subscriptionRoutes);
app.use('/api/sync', auth, syncRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export function startApi(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`[API] Server running on port ${config.port}`);
      resolve();
    });
  });
}

export default app;

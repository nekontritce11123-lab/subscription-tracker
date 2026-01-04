import express from 'express';
import cors from 'cors';
import { config } from '../config.js';
import { authMiddleware, devAuthMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscriptions.js';
import syncRoutes from './routes/sync.js';

const app = express();

// CORS - allow multiple origins for phone + PC access
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
      return;
    }

    // Allow any localhost.run subdomain
    if (origin.endsWith('.lhr.life')) {
      callback(null, true);
      return;
    }

    // Allow ngrok
    if (origin.includes('ngrok')) {
      callback(null, true);
      return;
    }

    // Allow configured webapp URL
    if (origin === config.webAppUrl) {
      callback(null, true);
      return;
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
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

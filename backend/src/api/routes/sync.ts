import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { syncSubscriptions } from '../../database/repositories/subscriptions.js';

const router = Router();

/**
 * POST /api/sync
 * Sync subscriptions from CloudStorage to backend for notifications
 * This replaces all subscriptions for the user with the provided list
 */
router.post('/', async (req, res: Response) => {
  try {
    const { telegramUser } = req as AuthenticatedRequest;
    const { subscriptions } = req.body;

    if (!Array.isArray(subscriptions)) {
      res.status(400).json({ error: 'subscriptions must be an array' });
      return;
    }

    // Validate each subscription
    for (const sub of subscriptions) {
      if (!sub.name || typeof sub.amount !== 'number' || typeof sub.billingDay !== 'number') {
        res.status(400).json({ error: 'Invalid subscription data' });
        return;
      }
      if (sub.billingDay < 1 || sub.billingDay > 31) {
        res.status(400).json({ error: 'Billing day must be between 1 and 31' });
        return;
      }
    }

    await syncSubscriptions(telegramUser.id, subscriptions);

    res.json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

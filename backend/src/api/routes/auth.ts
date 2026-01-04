import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { upsertUser } from '../../database/repositories/users.js';
import { getSubscriptionsByUserId } from '../../database/repositories/subscriptions.js';

const router = Router();

/**
 * POST /api/auth/init
 * Initialize user session, create or update user, return subscriptions
 */
router.post('/init', async (req, res: Response) => {
  try {
    const { telegramUser } = req as AuthenticatedRequest;

    // Upsert user in database
    const user = await upsertUser(telegramUser);

    // Get user's subscriptions
    const subscriptions = await getSubscriptionsByUserId(user.id);

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode,
      },
      subscriptions,
    });
  } catch (error) {
    console.error('[Auth] Init error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

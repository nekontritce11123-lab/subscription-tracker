import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getSubscriptionsByUserId,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  markAsPaid,
} from '../../database/repositories/subscriptions.js';
import { CreateSubscriptionData, UpdateSubscriptionData } from '../../types.js';

const router = Router();

/**
 * GET /api/subscriptions
 * Get all subscriptions for the authenticated user
 */
router.get('/', async (req, res: Response) => {
  try {
    const { telegramUser } = req as AuthenticatedRequest;
    const subscriptions = await getSubscriptionsByUserId(telegramUser.id);
    res.json(subscriptions);
  } catch (error) {
    console.error('[Subscriptions] Get all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get a specific subscription
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { telegramUser } = req as unknown as AuthenticatedRequest;
    const subscription = await getSubscriptionById(req.params.id);

    if (!subscription || subscription.userId !== telegramUser.id) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(subscription);
  } catch (error) {
    console.error('[Subscriptions] Get one error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post('/', async (req, res: Response) => {
  try {
    const { telegramUser } = req as AuthenticatedRequest;
    const data: CreateSubscriptionData = req.body;

    // Validate required fields
    if (!data.name || !data.amount || !data.billingDay || !data.startDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate billing day
    if (data.billingDay < 1 || data.billingDay > 31) {
      res.status(400).json({ error: 'Billing day must be between 1 and 31' });
      return;
    }

    const subscription = await createSubscription(telegramUser.id, {
      name: data.name,
      icon: data.icon || data.name.charAt(0).toUpperCase(),
      color: data.color || '#007AFF',
      amount: data.amount,
      currency: data.currency || 'RUB',
      periodMonths: data.periodMonths || 1,
      billingDay: data.billingDay,
      startDate: data.startDate,
      isTrial: data.isTrial || false,
      emoji: data.emoji,
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('[Subscriptions] Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/subscriptions/:id
 * Update a subscription
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { telegramUser } = req as unknown as AuthenticatedRequest;
    const data: UpdateSubscriptionData = req.body;

    // Validate billing day if provided
    if (data.billingDay !== undefined && (data.billingDay < 1 || data.billingDay > 31)) {
      res.status(400).json({ error: 'Billing day must be between 1 and 31' });
      return;
    }

    const subscription = await updateSubscription(
      req.params.id,
      telegramUser.id,
      data
    );

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(subscription);
  } catch (error) {
    console.error('[Subscriptions] Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { telegramUser } = req as unknown as AuthenticatedRequest;
    const deleted = await deleteSubscription(req.params.id, telegramUser.id);

    if (!deleted) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('[Subscriptions] Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/subscriptions/:id/paid
 * Mark a subscription as paid
 */
router.post('/:id/paid', async (req: Request, res: Response) => {
  try {
    const { telegramUser } = req as unknown as AuthenticatedRequest;
    const { paidDate } = req.body;

    const subscription = await markAsPaid(
      req.params.id,
      telegramUser.id,
      paidDate
    );

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(subscription);
  } catch (error) {
    console.error('[Subscriptions] Mark paid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

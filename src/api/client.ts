import { API_URL } from '../config';
import { Subscription } from '../types/subscription';

type ApiSubscription = {
  id: string;
  userId: number;
  name: string;
  icon: string;
  color: string;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  period: 'month' | 'year';
  billingDay: number;
  startDate: string;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapApiToLocal(sub: ApiSubscription): Subscription {
  return {
    id: sub.id,
    name: sub.name,
    icon: sub.icon,
    color: sub.color,
    amount: sub.amount,
    currency: sub.currency,
    period: sub.period,
    billingDay: sub.billingDay,
    startDate: sub.startDate,
    isTrial: sub.isTrial,
    createdAt: sub.createdAt,
  };
}

class ApiClient {
  private initData: string = '';

  setInitData(initData: string): void {
    this.initData = initData;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.initData) {
      headers['X-Telegram-Init-Data'] = this.initData;
    } else if (import.meta.env.DEV) {
      // Development fallback - use test user ID
      headers['X-Dev-User-Id'] = '123456789';
    }

    return headers;
  }

  async init(): Promise<{ subscriptions: Subscription[] }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/init`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Init failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        subscriptions: data.subscriptions.map(mapApiToLocal),
      };
    } catch (error) {
      console.error('[API] Init error:', error);
      throw error;
    }
  }

  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Get subscriptions failed: ${response.status}`);
      }

      const data: ApiSubscription[] = await response.json();
      return data.map(mapApiToLocal);
    } catch (error) {
      console.error('[API] Get subscriptions error:', error);
      throw error;
    }
  }

  async createSubscription(data: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Create subscription failed: ${response.status}`);
      }

      const result: ApiSubscription = await response.json();
      return mapApiToLocal(result);
    } catch (error) {
      console.error('[API] Create subscription error:', error);
      throw error;
    }
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Update subscription failed: ${response.status}`);
      }

      const result: ApiSubscription = await response.json();
      return mapApiToLocal(result);
    } catch (error) {
      console.error('[API] Update subscription error:', error);
      throw error;
    }
  }

  async deleteSubscription(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Delete subscription failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[API] Delete subscription error:', error);
      throw error;
    }
  }

  async markAsPaid(id: string, paidDate?: string): Promise<Subscription> {
    try {
      const response = await fetch(`${API_URL}/api/subscriptions/${id}/paid`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ paidDate }),
      });

      if (!response.ok) {
        throw new Error(`Mark paid failed: ${response.status}`);
      }

      const result: ApiSubscription = await response.json();
      return mapApiToLocal(result);
    } catch (error) {
      console.error('[API] Mark paid error:', error);
      throw error;
    }
  }

  async syncSubscriptions(subscriptions: Subscription[]): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ subscriptions }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[API] Sync error:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

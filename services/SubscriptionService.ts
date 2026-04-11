import { ApiService } from './api';

export interface SubscriptionStatus {
  status: 'active' | 'expired' | 'cancelled';
  plan: 'standard' | 'premium';
  expiryDate?: string;
  endDate?: string;
  transactionId?: string;
  userId: string;
}

export class SubscriptionService {
  /**
   * Get current subscription status for the user
   */
  static async getStatus(): Promise<SubscriptionStatus> {
    const response: any = await ApiService.get('/api/subscription/status');
    return response.data;
  }
}

import { ApiService } from './api';

export interface PaymentInitializationResponse {
  transactionUrl: string;
  transactionId: string;
}

export interface PaymentStatus {
  status: 'pending' | 'success' | 'failed';
  transactionId: string;
  amount?: number;
  currency?: string;
}

export class PaymentService {
  /**
   * Initialize a payment for premium subscription
  @param {number} amount
  @param {string} returnUrl
   */
  static async initializePayment(amount = 1000, returnUrl = 'https://alani-financial-emmalee.ngrok-free.dev/api/payment/success'): Promise<PaymentInitializationResponse> {
    const response: any = await ApiService.post('/api/payment/initialize', {
        amount,
        returnUrl,
        return_url: returnUrl,
        currency: 'XAF',
    });
    return response.data;
  }

  /**
   * Check the status of a specific payment transaction
   */
  static async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    const response: any = await ApiService.get(`/api/payment/status/${transactionId}`);
    return response.data;
  }

  /**
   * Get transaction history for current user
   */
  static async getHistory(): Promise<any[]> {
    const response: any = await ApiService.get('/api/payment/history');
    return response.data;
  }
}

import { ApiService } from '@/services/api';

export interface NotificationActionPayload {
  action: 'REPLY' | 'MARK_AS_READ';
  conversationId: string;
  messageId?: string;
  replyText?: string;
}

class NotificationActionService {
  /**
   * Handle notification action (reply or mark as read)
   */
  static async handleNotificationAction(payload: NotificationActionPayload): Promise<void> {
    try {
      console.log('[NotificationAction] Sending action:', payload.action, 'for conversation:', payload.conversationId);
      
      const response = await ApiService.post('/api/notification/actions', payload);
      
      console.log('[NotificationAction] Action processed successfully:', payload.action);
      return response;
    } catch (error) {
      console.error('[NotificationAction] Failed to process action:', error);
      throw error;
    }
  }

  /**
   * Handle reply action
   */
  static async handleReply(conversationId: string, replyText: string, messageId?: string): Promise<void> {
    return this.handleNotificationAction({
      action: 'REPLY',
      conversationId,
      messageId,
      replyText,
    });
  }

  /**
   * Handle mark as read action
   */
  static async handleMarkAsRead(conversationId: string, messageId?: string): Promise<void> {
    return this.handleNotificationAction({
      action: 'MARK_AS_READ',
      conversationId,
      messageId,
    });
  }
}

export default NotificationActionService;

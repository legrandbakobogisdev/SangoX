import { ApiService } from './api';

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'document' | 'system' | 'video/mp4' | 'media_group';
  status: 'sent' | 'delivered' | 'read';
  metadata?: any;
  replyTo?: any; // Changed from string to any to support nested objects often found in replies
  isDeleted?: boolean;
  reactions?: Record<string, string[]>; // emoji: [userIds] 
  createdAt: string;
  updatedAt: string;
  [key: string]: any; // Allow for extra properties like 'items' in media groups
}

export interface Participant {
  _id: string;
  username: string;
  isPremium?: boolean;
  profilePhotoUrl?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface Conversation {
  _id: string;
  type: 'individual' | 'group';
  participants: (string | Participant)[];
  lastMessage?: Message;
  unreadCounts: Record<string, number>;
  groupMetadata?: {
    name: string;
    description?: string;
    icon?: string;
    creatorId: string;
    admins: string[];
  };
  archivedBy: string[];
  pinnedBy: string[];
  mutedBy: string[];
  blockedBy: string[];
  createdAt: string;
  updatedAt: string;
  name?: string;
  image?: string;
  isPremium?: boolean;
}

export class ChatService {
  /**
   * Get all conversations for the current user
   */
  static async getConversations(): Promise<Conversation[]> {
    const response: any = await ApiService.get('/api/chat/conversations?pagination=false');
    return response.data;
  }

  /**
   * Get archived conversations for the current user
   */
  static async getArchivedConversations(): Promise<Conversation[]> {
    const response: any = await ApiService.get('/api/chat/conversations/archived?pagination=false');
    return response.data;
  }

  /**
   * Get messages for a specific conversation
   */
  static async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    let endpoint = `/api/chat/messages/${conversationId}?limit=${limit}`;
    if (before) {
      endpoint += `&before=${before}`;
    }
    const response: any = await ApiService.get(`${endpoint}&pagination=false`);
    return response.data;
  }

  /**
   * Initiate a new conversation
   */
  static async initiateConversation(participantId: string, type: 'individual' | 'group' = 'individual'): Promise<Conversation> {
    const response: any = await ApiService.post('/api/chat/initiate', {
      participantId,
      type
    });
    return response.data;
  }

  /**
   * Send a message via HTTP (fallback or for attachments)
   */
  static async sendMessage(conversationId: string, content: string, type = 'text', metadata = {}, replyTo?: string): Promise<Message> {
    const response: any = await ApiService.post('/api/chat/messages', {
      conversationId,
      content,
      type,
      metadata,
      replyTo
    });
    return response.data;
  }

  /**
   * Update message status (read/delivered)
   */
  static async updateMessageStatus(messageId: string, status: 'delivered' | 'read', deviceId?: string): Promise<void> {
    await ApiService.patch(`/api/chat/messages/${messageId}/status`, {
      status,
      deviceId
    });
  }

  /**
   * Mark all messages in a conversation as read
   */
  static async markConversationAsRead(conversationId: string, deviceId?: string): Promise<void> {
    await ApiService.patch(`/api/chat/messages/read-all/${conversationId}`, {
      deviceId
    });
  }

  /**
   * Create a group
   */
  static async createGroup(name: string, participants: string[], description?: string, icon?: string): Promise<Conversation> {
    const response: any = await ApiService.post('/api/chat/groups', {
      name,
      participants,
      description,
      icon
    });
    return response.data;
  }

  /**
   * Mute/Unmute a conversation
   */
  static async toggleMute(conversationId: string): Promise<boolean> {
    const response: any = await ApiService.patch(`/api/chat/${conversationId}/mute`);
    return response.data.isMuted;
  }

  /**
   * Archive/Unarchive a conversation
   */
  static async toggleArchive(conversationId: string): Promise<boolean> {
    const response: any = await ApiService.patch(`/api/chat/${conversationId}/archive`);
    return response.data.isArchived;
  }

  /**
   * Toggle block for a user in a conversation
   */
  static async toggleBlock(conversationId: string): Promise<boolean> {
    const response: any = await ApiService.patch(`/api/chat/${conversationId}/block`);
    return response.data.isBlocked;
  }

  /**
   * Pin or unpin a message in a conversation
   */
  static async togglePinMessage(messageId: string): Promise<any> {
    const response: any = await ApiService.patch(`/api/chat/messages/${messageId}/pin`);
    return response.data;
  }

  /**
   * Update a message content
   */
  static async updateMessage(messageId: string, content: string): Promise<Message> {
    const response: any = await ApiService.put(`/api/chat/messages/${messageId}`, {
      content
    });
    return response.data;
  }

  /**
   * Delete a message (mark as deleted)
   */
  static async deleteMessage(messageId: string): Promise<void> {
    await ApiService.delete(`/api/chat/messages/${messageId}`);
  }

  /**
   * Get all pinned messages for a conversation
   */
  static async getPinnedMessages(conversationId: string): Promise<any[]> {
    const response: any = await ApiService.get(`/api/chat/messages/${conversationId}/pinned`);
    return response.data;
  }

  /**
   * Toggle pin for a conversation
   */
  static async togglePinConversation(conversationId: string): Promise<boolean> {
    const response: any = await ApiService.patch(`/api/chat/conversations/${conversationId}/pin`);
    return response.data;
  }

  /**
   * Add/Remove a reaction to a message
   */
  static async toggleReaction(messageId: string, emoji: string): Promise<Record<string, string[]>> {
    const response: any = await ApiService.post(`/api/chat/messages/${messageId}/reactions`, { emoji });
    return response.data.reactions;
  }

  /**
   * Forward a message to one or more conversations
   */
  static async forwardMessage(messageId: string, targetConversationIds: string[]): Promise<any> {
    // Check if it's a virtual group ID
    const baseId = messageId.startsWith('group_') ? messageId.slice(6) : messageId;

    const promises: Promise<any>[] = [];
    
    targetConversationIds.forEach(targetId => {
      promises.push(
        ApiService.post(`/api/chat/messages/${baseId}/forward`, {
          targetConversationId: targetId
        })
      );
    });

    return Promise.all(promises);
  }
}

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
const ACCESS_TOKEN_KEY = '@sangox_access_token';

class SocketService {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<Function>>();
  private activeRooms = new Map<string, string[]>(); // conversationId -> participants[]

  /**
   * Initialize and connect the socket
   */
  async connect(token?: string): Promise<boolean> {
    const actualToken = token || await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!actualToken) {
      console.warn('Socket connection failed: No token found');
      return false;
    }

    if (this.socket?.connected) {
      // If already connected but auth token is outdated after a refresh
      const currentAuthToken = (this.socket as any).auth?.token;
      if (currentAuthToken && currentAuthToken !== actualToken) {
        console.log('[Socket] Token changed, reconnecting socket...');
        (this.socket as any).auth.token = actualToken;
        this.socket.disconnect().connect();
      }
      return true;
    }

    return new Promise((resolve) => {
      // Connect to the Socket.io server
      this.socket = io(API_BASE_URL, {
        auth: { token: actualToken },
        extraHeaders: {
          Authorization: `Bearer ${actualToken}`
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Socket.io connected:', this.socket?.id);
        
        const currentSocket = this.socket;
        if (!currentSocket) return;

        // Automatically mark as online upon connection/reconnection
        currentSocket.emit('set_online', { connectedAt: new Date().toISOString() });
        
        // RE-JOIN ALL ACTIVE ROOMS WITH CONTEXT on reconnection
        if (this.activeRooms.size > 0) {
            this.activeRooms.forEach((participants, conversationId) => {
                if (currentSocket && currentSocket.connected) {
                    currentSocket.emit('join_conversation', { 
                        conversationId, 
                        participants: Array.isArray(participants) ? participants : [] 
                    });
                }
            });
        }

        resolve(true);
      });

      this.socket.on('connect_error', async (error) => {
        console.error('Socket.io connection error:', error.message);
        
        // Handle token expiry: attempt to get fresh token and retry once
        if (error.message.includes('Authentication error') || error.message.includes('Invalid token')) {
            const freshToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
            const currentAuthToken = (this.socket as any)?.auth?.token;
            
            if (freshToken && freshToken !== currentAuthToken) {
                console.log('[Socket] Auth error detected but fresh token found in storage. Retrying...');
                if (this.socket) {
                    (this.socket as any).auth.token = freshToken;
                    // Update extraHeaders as well if they were set
                    if (this.socket.io && (this.socket.io as any).opts) {
                        (this.socket.io as any).opts.extraHeaders = {
                            Authorization: `Bearer ${freshToken}`
                        };
                    }
                    this.socket.disconnect().connect();
                    return; // Don't resolve yet, let the next connect attempt handle it
                }
            }
        }
        
        resolve(false);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
      });

      // Register all previously set handlers
      this.handlers.forEach((handlerSet, eventName) => {
        handlerSet.forEach(handler => {
          this.socket?.on(eventName, (data) => handler(data));
        });
      });
    });
  }

  /**
   * Disconnect the socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Emit an event to the server
   */
  emit(eventName: string, data?: any, callback?: (response: any) => void) {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected, event "${eventName}" not sent`);
      return;
    }
    if (callback) {
        this.socket.emit(eventName, data, callback);
    } else {
        this.socket.emit(eventName, data);
    }
  }

  /**
   * Listen for an event from the server
   */
  on(eventName: string, handler: (data: any) => void) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)?.add(handler);

    if (this.socket) {
      this.socket.on(eventName, handler);
    }
  }

  /**
   * Remove a listener for an event
   */
  off(eventName: string, handler: (data: any) => void) {
    this.handlers.get(eventName)?.delete(handler);
    if (this.socket) {
      this.socket.off(eventName, handler);
    }
  }

  /**
   * Specific Chat Actions
   */
  joinConversation(conversationId: string, participants: string[] = []) {
    this.activeRooms.set(conversationId, participants);
    this.emit('join_conversation', { conversationId, participants });
  }

  leaveConversation(conversationId: string) {
    this.activeRooms.delete(conversationId);
    this.emit('leave_conversation', conversationId);
  }

  startTyping(conversationId: string) {
    this.emit('typing_start', conversationId);
  }

  stopTyping(conversationId: string) {
    this.emit('typing_stop', conversationId);
  }

  markAsRead(conversationId: string, deviceId?: string) {
    this.emit('mark_conversation_read', { conversationId, deviceId });
  }

  setOnline(deviceId?: string) {
    this.emit('set_online', { deviceId });
  }

  checkPresence(userIds: string[]) {
    this.emit('check_presence', userIds);
  }

  pinMessage(conversationId: string, messageId: string | null) {
      this.emit('pin_message', { conversationId, messageId });
  }

  deleteMessage(messageId: string) {
      this.emit('delete_message', { messageId });
  }

  editMessage(messageId: string, content: string) {
      this.emit('edit_message', { messageId, content });
  }

  archiveConversation(conversationId: string, archive: boolean) {
      this.emit('archive_conversation', { conversationId, archive });
  }

  blockUser(conversationId: string, userId: string, block: boolean) {
      this.emit('block_user', { conversationId, userId, block });
  }
}

export default new SocketService();

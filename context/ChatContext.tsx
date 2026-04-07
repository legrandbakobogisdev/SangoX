import { useAuth } from '@/context/AuthContext';
import { ApiService } from '@/services/api';
import { ChatService, Conversation, Message } from '@/services/ChatService';
import { ContactItem } from '@/services/ContactService';
import SocketService from '@/services/SocketService';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  refreshConversations: (isSilent?: boolean) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, type?: string, metadata?: any, replyTo?: string) => Promise<void>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  initiateConversation: (participantId: string, type?: 'individual' | 'group') => Promise<Conversation>;
  createGroup: (name: string, participants: string[], description?: string, icon?: string) => Promise<Conversation>;
  onlineUsers: Record<string, boolean>;
  pinnedMessages: Record<string, Message[]>;
  checkStatus: (userId: string) => void;
  toggleArchive: (conversationId: string) => Promise<void>;
  toggleBlock: (conversationId: string) => Promise<void>;
  pinMessage: (conversationId: string, messageId: string | null) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  typingStatus: Record<string, boolean>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, any>>({});
  const [deviceContacts, setDeviceContacts] = useState<ContactItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, Message[]>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  const checkStatus = useCallback((userId: string) => {
    SocketService.emit('check_presence', [userId]);
  }, []);

  const getDisplayName = useCallback((participant: any) => {
    if (!participant) return '';

    // 1. Try to find in device contacts by phone
    if (participant.phoneNumber) {
      const normalizedParticipantPhone = participant.phoneNumber.replace(/[^\d+]/g, '');
      const match = deviceContacts.find(c =>
        c.phoneNumbers.some(pn => pn.replace(/[^\d+]/g, '').includes(normalizedParticipantPhone) || normalizedParticipantPhone.includes(pn.replace(/[^\d+]/g, '')))
      );
      if (match) return match.name;
    }

    // 2. Fallback to profile name
    const profileName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
    if (profileName) return profileName;

    // 3. Last fallback to phone number
    return participant.phoneNumber || participant.id || participant._id;
  }, [deviceContacts]);

  const fetchUserIfNeeded = useCallback(async (userId: string) => {
    if (userCache[userId]) return userCache[userId];
    try {
      const response: any = await ApiService.get(`/api/auth/users/${userId}`);
      const userData = response.data;
      setUserCache(prev => ({ ...prev, [userId]: userData }));
      return userData;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return null;
    }
  }, [userCache]);

  // Initialize conversations when the user is logged in
  const refreshConversations = useCallback(async (isSilent = false) => {
    if (!user || !accessToken) return;
    try {
      if (!isSilent) setLoading(true);
      const [activeData, archivedData] = await Promise.all([
        ChatService.getConversations(),
        ChatService.getArchivedConversations().catch(() => [])
      ]);
      const data = [...activeData, ...archivedData];

      // Auto-fetch participant info for individual chats to avoid "chat" label
      const augmentedConversations = await Promise.all(data.map(async (conv) => {
        if (conv.type === 'individual') {
          const otherId = conv.participants.find(p => p !== user?._id);
          if (otherId) {
            const participant = await fetchUserIfNeeded(otherId);
            if (participant) {
              return {
                ...conv,
                name: getDisplayName(participant) || conv.name,
                image: participant.avatar || conv.groupMetadata?.icon
              };
            }
          }
        }
        return {
          ...conv,
          name: conv.groupMetadata?.name || conv.name,
          image: conv.groupMetadata?.icon || conv.image
        };
      }));

      setConversations(augmentedConversations as any);

      // JOIN ALL CONVERSATIONS to receive message updates
      const AllParticipants = new Set<string>();
      data.forEach(conversation => {
        const otherParticipants = conversation.participants.filter(p => p !== user?._id);
        otherParticipants.forEach(p => AllParticipants.add(p));
        SocketService.joinConversation(conversation._id);
      });

      // Request explicit status for all contacts found in conversations ONCE on load
      if (AllParticipants.size > 0) {
        SocketService.checkPresence(Array.from(AllParticipants));
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user, accessToken]);

  // Handle active conversation selection
  const setActiveConversation = useCallback(async (conversation: Conversation | null) => {
    setActiveConversationState(conversation);

    if (conversation) {
      // 1. Optimistically reset unread count locally for immediate UI feedback
      const userId = user?._id;
      if (userId) {
        setConversations(prev => prev.map(c =>
          c._id === conversation._id
            ? { ...c, unreadCounts: { ...c.unreadCounts, [userId]: 0 } }
            : c
        ));
      }

      try {
        // SILENT FETCH - No loading indicators for background updates
        // Add fetching pinned messages
        const [data, pinnedData] = await Promise.all([
          ChatService.getMessages(conversation._id),
          ChatService.getPinnedMessages(conversation._id)
        ]);

        // Update states silently
        setMessages(data);
        setPinnedMessages(prev => ({ ...prev, [conversation._id]: pinnedData }));

        // Inform the socket that we joined this conversation room
        SocketService.joinConversation(conversation._id);

        // Mark as read via both Socket and REST for maximum robustness
        SocketService.markAsRead(conversation._id);
        await ChatService.markConversationAsRead(conversation._id);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        // ...
      }
    } else {
      // Don't clear messages immediately to allow for smooth transitions
      //setActiveConversationState(null);
    }
  }, []);

  // Send message
  const sendMessage = async (content: string, type: string = 'text', metadata = {}, replyTo?: string) => {
    if (!activeConversation || !user) return;

    // CLIENT-SIDE BLOCK CHECK
    const myId = String(user._id);
    const iBlocked = activeConversation.blockedBy?.includes(myId);
    const partnerId = activeConversation.participants.find(p => String(p) !== myId);
    const imBlocked = partnerId ? activeConversation.blockedBy?.includes(String(partnerId)) : false;

    if (iBlocked || imBlocked) {
      console.warn('Cannot send message: conversation is blocked');
      return;
    }

    // OPTIMISTIC UPDATE: Add message to list locally WITH A TEMP ID
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      conversationId: activeConversation._id,
      senderId: user._id,
      content: content,
      type: type as any,
      metadata: metadata,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyTo: replyTo,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Force stop typing on our end
      SocketService.stopTyping(activeConversation._id);

      const newMessage = await ChatService.sendMessage(activeConversation._id, content, type, metadata, replyTo);

      // Update the local list with the real message from server
      setMessages(prev => prev.map(m => m._id === tempId ? newMessage : m));

      // Update the conversation list silently
      setConversations(prev => prev.map(c =>
        c._id === activeConversation._id ? { ...c, lastMessage: newMessage } : c
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(m => m._id !== tempId));
      throw error;
    }
  };

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    SocketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    SocketService.stopTyping(conversationId);
  }, []);

  const initiateConversation = async (participantId: string, type: 'individual' | 'group' = 'individual') => {
    const conversation = await ChatService.initiateConversation(participantId, type);
    // Add to conversations list if not present
    setConversations(prev => {
      if (!prev.find(c => c._id === conversation._id)) {
        return [conversation, ...prev];
      }
      return prev;
    });
    return conversation;
  };

  const createGroup = async (name: string, participants: string[], description?: string, icon?: string) => {
    const conversation = await ChatService.createGroup(name, participants, description, icon);
    setConversations(prev => [conversation, ...prev]);
    return conversation;
  };

  // Manage AppState for immediate presence updates
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (user && accessToken) {
          // Re-establish connection if lost
          await SocketService.connect(accessToken);
        }
      } else {
        // App is in background or inactive (closing)
        SocketService.disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [user, accessToken, refreshConversations]);

  // Initialize Socket.io connection - following PressingExpress robust pattern
  const initializeSocket = useCallback(async () => {
    if (user && accessToken) {
      const connected = await SocketService.connect(accessToken);
      if (connected) {
        console.log('[Socket] Connected to SangoX');
        refreshConversations();
      }
    }
  }, [user?._id, accessToken, refreshConversations]);

  useEffect(() => {
    initializeSocket();

    return () => {
      // Logic for cleanup as per PressingExpress
      // SocketService.disconnect(); // Generally kept alive in chat apps unless logout
    };
  }, [initializeSocket]);

  // Real-time Event Listeners
  useEffect(() => {
    if (!user) return;

    // Receive new messages
    const handleNewMessage = (message: Message) => {
      const conv = conversations.find(c => c._id === message.conversationId);
      if (conv) {
        const myId = String(user?._id);
        const iBlocked = conv.blockedBy?.includes(myId);
        const partnerId = conv.participants.find(p => String(p) !== myId);
        const imBlocked = partnerId ? conv.blockedBy?.includes(String(partnerId)) : false;

        if (iBlocked || imBlocked) {
          console.log('[Socket] Received message but conversation is blocked. Ignoring.');
          return;
        }
      }

      if (activeConversation && message.conversationId === activeConversation._id) {
        setMessages(prev => {
          // 1. Prevent duplicate by ID
          if (prev.some(m => m._id === message._id)) return prev;

          // 2. Prevent duplicate by Content + Sender if it's a very recent message (optimistic match)
          // This handles the case where Socket arrives faster than API response
          const isDuplicateOptimistic = prev.some(m =>
            m.senderId === message.senderId &&
            m._id.startsWith('temp_') &&
            m.content === message.content
          );

          if (isDuplicateOptimistic) {
            return prev.map(m =>
              (m.senderId === message.senderId && m._id.startsWith('temp_') && m.content === message.content)
                ? message : m
            );
          }

          return [...prev, message];
        });
        // Also mark as read
        SocketService.markAsRead(activeConversation._id);
        ChatService.markConversationAsRead(activeConversation._id).catch(e => console.log('mark read err:', e));
      }

      // Update the conversation list to show the last message and unread count
      setConversations(prev => {
        const index = prev.findIndex(c => c._id === message.conversationId);
        if (index !== -1) {
          const updatedConv = {
            ...prev[index],
            lastMessage: message,
            unreadCounts: {
              ...prev[index].unreadCounts,
              [user._id]: (prev[index].unreadCounts[user._id] || 0) + (message.senderId !== user._id && (!activeConversation || activeConversation._id !== message.conversationId) ? 1 : 0)
            }
          };
          const newConversations = [...prev];
          newConversations.splice(index, 1);
          return [updatedConv, ...newConversations];
        }
        // If it's a new conversation, we probably need to fetch it
        refreshConversations();
        return prev;
      });
    };

    // Message status updates (Traits)
    const handleStatusUpdate = (data: { messageId: string, isDelivered?: boolean, isRead?: boolean, status?: string }) => {
      setMessages(prev => prev.map(m =>
        m._id === data.messageId
          ? { ...m, ...data, status: (data.status || m.status) as any }
          : m
      ));
    };

    const handleConversationReadBatch = (data: { conversationId: string, readerId: string }) => {
      if (!user) return;
      const myId = String(user._id);
      const readerId = String(data.readerId);

      // 1. If someone else read my messages, update blue checks
      if (readerId !== myId) {
        setMessages(prev => prev.map(m =>
          m.conversationId === data.conversationId && m.senderId === myId
            ? { ...m, isRead: true, isDelivered: true, status: 'read' }
            : m
        ));
      }

      // 2. Synchronize unread counts in the conversation list (Multi-device sync)
      setConversations(prev => prev.map(c =>
        c._id === data.conversationId
          ? { ...c, unreadCounts: { ...c.unreadCounts, [readerId]: 0 } }
          : c
      ));
    };

    const handleMessageDeleted = (data: { messageId: string, conversationId: string }) => {
      // 1. Update active view
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, isDeleted: true, content: 'Message supprimé' } : m));

      // 2. Update conversation list
      setConversations(prev => prev.map(c => {
        if (c._id === data.conversationId && c.lastMessage?._id === data.messageId) {
          return {
            ...c,
            lastMessage: { ...c.lastMessage, isDeleted: true, content: 'Message supprimé' }
          };
        }
        return c;
      }));
    };

    const handleMessageUpdated = (message: Message) => {
      // 1. Update active view
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, isEdited: true } : m));

      // 2. Update conversation list
      setConversations(prev => prev.map(c => {
        if (c._id === message.conversationId && (c.lastMessage?._id === message._id || !c.lastMessage)) {
          return { ...c, lastMessage: message };
        }
        return c;
      }));
    };

    const handleMessagePinnedStatus = async (data: { conversationId: string, messageId: string, isPinned: boolean }) => {
      if (data.isPinned) {
        const message = messages.find(m => m._id === data.messageId);
        if (!message) {
          // Fetch all pinned messages to ensure we have the full content if it was an old message
          try {
            const pinned = await ChatService.getPinnedMessages(data.conversationId);
            setPinnedMessages(prev => ({ ...prev, [data.conversationId]: pinned }));
          } catch (e) { console.error('Fetch pinned err:', e); }
          return;
        }
        setPinnedMessages(prev => {
          const currentPinned = prev[data.conversationId] || [];
          if (!currentPinned.some(m => m._id === message._id)) {
            return { ...prev, [data.conversationId]: [message, ...currentPinned] };
          }
          return prev;
        });
      } else {
        setPinnedMessages(prev => {
          const currentPinned = prev[data.conversationId] || [];
          return { ...prev, [data.conversationId]: currentPinned.filter(m => m._id !== data.messageId) };
        });
      }
    };

    let isMounted = true;

    // User status (global presence)
    const handleUserStatusChanged = (data: { userId: string, status: string }) => {
      if (!isMounted) return;
      setOnlineUsers(prev => ({
        ...prev,
        [data.userId]: data.status === 'online'
      }));
    };

    // Presence sync (initial fetch)
    const handlePresenceSync = (statusMap: Record<string, string>) => {
      if (!isMounted) return;
      setOnlineUsers(prev => {
        const next = { ...prev };
        Object.entries(statusMap).forEach(([uid, status]) => {
          next[uid] = status === 'online';
        });
        return next;
      });
    };

    SocketService.on('new_message', handleNewMessage);
    SocketService.on('message_status_update', handleStatusUpdate);
    SocketService.on('messages_read', handleConversationReadBatch);
    SocketService.on('user_status_changed', handleUserStatusChanged);
    SocketService.on('user_status_change', handleUserStatusChanged);
    SocketService.on('presence_sync', handlePresenceSync);
    SocketService.on('message_updated', handleMessageUpdated);
    SocketService.on('message_deleted', handleMessageDeleted);
    SocketService.on('message_pinned_status', handleMessagePinnedStatus);

    // User blocking synchronization (Global blocks)
    const handleUserBlockStatus = (data: { targetUserId?: string, blockerId?: string, status: 'blocked' | 'unblocked' }) => {
      if (!isMounted) return;
      const isBlocked = data.status === 'blocked';
      const otherPartyId = data.targetUserId || data.blockerId;

      if (!otherPartyId) return;
      console.log(`[Socket] Block status update: ${otherPartyId} -> ${data.status}`);

      const updateConv = (conv: Conversation): Conversation => {
        if (conv.type === 'individual' && conv.participants.some(p => String(p) === String(otherPartyId))) {
          let newBlockedBy = [...(conv.blockedBy || [])];
          const myId = String(user?._id);
          const themId = String(otherPartyId);

          if (data.targetUserId && myId) {
            // I am the blocker
            if (isBlocked) {
              if (!newBlockedBy.includes(myId)) newBlockedBy.push(myId);
            } else {
              newBlockedBy = newBlockedBy.filter(id => String(id) !== myId);
            }
          } else if (data.blockerId && themId) {
            // I am being blocked
            if (isBlocked) {
              if (!newBlockedBy.includes(themId)) newBlockedBy.push(themId);
            } else {
              newBlockedBy = newBlockedBy.filter(id => String(id) !== themId);
            }
          }

          return { ...conv, blockedBy: newBlockedBy };
        }
        return conv;
      };

      setConversations(prev => prev.map(updateConv));

      // Also update activeConversation directly for immediate UI feedback
      setActiveConversationState(prev => {
        if (prev) return updateConv(prev);
        return prev;
      });
    };

    SocketService.on('user_block_status', handleUserBlockStatus);

    // Typing global sync
    const handleGlobalTypingStart = (data: { conversationId: string, userId: string }) => {
      if (data.userId !== user?._id) {
        setTypingStatus(prev => ({ ...prev, [data.conversationId]: true }));
      }
    };

    const handleGlobalTypingStop = (data: { conversationId: string, userId: string }) => {
      if (data.userId !== user?._id) {
        setTypingStatus(prev => ({ ...prev, [data.conversationId]: false }));
      }
    };

    SocketService.on('user_typing_start', handleGlobalTypingStart);
    SocketService.on('user_typing_stop', handleGlobalTypingStop);

    return () => {
      isMounted = false;
      SocketService.off('new_message', handleNewMessage);
      SocketService.off('message_status_update', handleStatusUpdate);
      SocketService.off('messages_read', handleConversationReadBatch);
      SocketService.off('user_status_changed', handleUserStatusChanged);
      SocketService.off('user_status_change', handleUserStatusChanged);
      SocketService.off('presence_sync', handlePresenceSync);
      SocketService.off('message_updated', handleMessageUpdated);
      SocketService.off('message_deleted', handleMessageDeleted);
      SocketService.off('message_pinned_status', handleMessagePinnedStatus);
      SocketService.off('user_block_status', handleUserBlockStatus);
      SocketService.off('user_typing_start', handleGlobalTypingStart);
      SocketService.off('user_typing_stop', handleGlobalTypingStop);
    };
  }, [user?._id, activeConversation?._id, refreshConversations, messages]);

  const toggleArchive = async (conversationId: string) => {
    try {
      const isArchived = await ChatService.toggleArchive(conversationId);
      SocketService.archiveConversation(conversationId, isArchived);
      await refreshConversations(true);
    } catch (e) { console.error('Archive error:', e); }
  };

  const toggleBlock = async (conversationId: string) => {
    try {
      const partnerId = conversations.find(c => c._id === conversationId)?.participants.find(p => p !== user?._id);
      if (!partnerId) return;

      // Calling the auth API directly for global block
      await ApiService.post(`/api/auth/settings/block/${partnerId}`);

      // No need to manually refresh or emit; the backend will publish to Kafka, 
      // and the chat-service will emit 'user_block_status' which we now handle above.
    } catch (e) {
      console.error('Block error:', e);
    }
  };

  const pinMessage = async (conversationId: string, messageId: string | null) => {
    if (!messageId) return;
    try {
      await ChatService.togglePinMessage(messageId);
    } catch (e) { console.error('Pin error:', e); }
  };

  const editMessage = async (messageId: string, content: string) => {
    try {
      // Emit via socket directly for ultra-fast response
      SocketService.editMessage(messageId, content);

      // Inform server to stop typing status
      if (activeConversation) SocketService.stopTyping(activeConversation._id);

      await ChatService.updateMessage(messageId, content);
    } catch (e) {
      console.error('Edit error:', e);
      throw e;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await ChatService.deleteMessage(messageId);
      // Socket will broadcast 'message_deleted' which we listen to
    } catch (e) {
      console.error('Delete error:', e);
      throw e;
    }
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      loading,
      refreshConversations,
      setActiveConversation,
      sendMessage,
      startTyping,
      stopTyping,
      initiateConversation,
      createGroup,
      onlineUsers,
      pinnedMessages,
      checkStatus,
      toggleArchive,
      toggleBlock,
      pinMessage,
      editMessage,
      deleteMessage,
      typingStatus,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

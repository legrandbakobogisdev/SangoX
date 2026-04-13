import { ChatItem } from '@/components/chat/ChatItem';
import { StoryCircle } from '@/components/chat/StoryCircle';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useTheme } from '@/context/ThemeContext';
import SocketService from '@/services/SocketService';
import StoryService from '@/services/StoryService';
import { useRouter } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatsScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const { conversations, refreshConversations, loading, onlineUsers, typingStatus, toggleArchive, togglePinConversation } = useChat();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'online' | 'groups' | 'archives'>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeStories, setActiveStories] = useState<any[]>([]);

  const lastFetchedIdsRef = useRef<string>('');
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const fetchStories = useCallback(async () => {
    if (!user?._id) return;

    try {
      const participantIds = new Set<string>();
      participantIds.add(user._id);
      
      const convs = conversationsRef.current;
      if (convs && convs.length > 0) {
        convs.forEach(chat => {
          if (chat.participants && Array.isArray(chat.participants)) {
            chat.participants.forEach((pId: any) => {
                const idStr = typeof pId === 'string' ? pId : pId?._id || pId?.id;
                if (idStr) participantIds.add(idStr);
            });
          }
        });
      }

      const idsArray = Array.from(participantIds).sort();
      const currentIdsStr = JSON.stringify(idsArray);
      
      if (currentIdsStr === lastFetchedIdsRef.current) {
        return;
      }
      lastFetchedIdsRef.current = currentIdsStr;

      const data = await StoryService.getActiveStories(idsArray);
      const rawData = Array.isArray(data) ? data : (data?.data || data?.stories || []);
      
      const userStoriesMap = new Map<string, any>();
      rawData.forEach((userGroup: any) => {
        const userId = userGroup.userId || userGroup._id;
        const groupStories = userGroup.stories || [];

        if (userId && groupStories.length > 0) {
          const latestStory = groupStories[0];
          let unseenCount = 0;
          groupStories.forEach((s: any) => {
             const isViewed = s.viewers && Array.isArray(s.viewers) ? s.viewers.includes(user._id) : (s.isViewed || false);
             if (!isViewed) unseenCount++;
          });

          userStoriesMap.set(userId, { 
            ...latestStory, 
            userId,
            storyCount: groupStories.length,
            unseenCount: unseenCount
          });
        }
      });

      const groupedStories = Array.from(userStoriesMap.values());
      setActiveStories(groupedStories);
    } catch (e) {
      console.error('[fetchStories] Error:', e);
    }
  }, [user?._id]);

  // Fetch on mount and when user changes
  useEffect(() => {
    if (user?._id) {
       fetchStories();
    }
  }, [user?._id, fetchStories]);

  // Re-fetch when conversations list actually changes (new contacts)
  useEffect(() => {
    if (user?._id && conversations.length > 0) {
      lastFetchedIdsRef.current = ''; // Allow re-check
      fetchStories();
    }
  }, [conversations.length, user?._id]);

  useEffect(() => {
    const handleStoryUpdate = () => {
        lastFetchedIdsRef.current = ''; // Reset to force update
        fetchStories();
    };

    SocketService.on('story_new', handleStoryUpdate);
    SocketService.on('story_deleted', handleStoryUpdate);
    SocketService.on('story_view_update', handleStoryUpdate);

    return () => {
        SocketService.off('story_new', handleStoryUpdate);
        SocketService.off('story_deleted', handleStoryUpdate);
        SocketService.off('story_view_update', handleStoryUpdate);
    };
  }, [fetchStories]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshConversations(),
      fetchStories()
    ]);
  }, [refreshConversations, fetchStories]);

  const filteredConversations = conversations.filter(chat => {
    const myId = user?._id;
    const isArchived = myId && chat.archivedBy?.includes(myId);
    
    if (filter === 'archives') return isArchived;
    if (isArchived) return false; 
    
    if (filter === 'unread') return myId && (chat.unreadCounts?.[myId] || 0) > 0;
    if (filter === 'online') {
        const partnerParticipant = chat.type === 'individual' ? chat.participants.find(p => {
          const pId = typeof p === 'string' ? p : p._id;
          return String(pId) !== String(myId);
        }) : null;
        const partnerId = typeof partnerParticipant === 'string' ? partnerParticipant : partnerParticipant?._id;
        return partnerId && onlineUsers[partnerId];
    }
    if (filter === 'groups') return chat.type === 'group';
    return true;
  }).sort((a, b) => {
    const myId = user?._id as string;
    const aPinned = a.pinnedBy?.includes(myId);
    const bPinned = b.pinnedBy?.includes(myId);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        {/* Stories */}
        <View style={styles.sectionHeader}>
           {/* In the image, Stories doesn't have a label, but it's part of the top bar */}
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.storiesContent}
        >
          <StoryCircle id="add" isAdd onPress={() => router.push('/status/create')} name={t('add_story')} />
          {activeStories.map((story, index) => {
            if (!story) return null;
            
            const storyId = story._id || story.id || `story-${index}`;
            const creatorId = (typeof story.user === 'string' ? story.user : (story.user?._id || story.user?.id)) || story.userId || story.creatorId;
            
            if (!creatorId) return null;
            
            const isMe = creatorId === user?._id;
            const profileName = typeof story.user === 'object' 
              ? `${story.user?.firstName || ''} ${story.user?.lastName || ''}`.trim() 
              : '';
            const displayName = isMe ? t('me', 'Moi') : (profileName || story.user?.username || story.user?.name || t('user'));
            const displayImage = (typeof story.user === 'object' ? (story.user?.profilePicture || story.user?.avatar || story.user?.profilePhotoUrl) : null) 
                                || story.mediaParams?.uri 
                                || story.content 
                                || 'https://via.placeholder.com/150';



            const storyIsPremium = typeof story.user === 'object' ? story.user?.isPremium : false;

            return (
              <StoryCircle 
                key={storyId} 
                id={storyId}
                name={displayName} 
                image={displayImage}
                storyCount={story.storyCount || 1}
                unseenCount={story.unseenCount || 0}
                isPremium={storyIsPremium}
                onPress={() => router.push(`/status/${storyId}`)} 
              />
            );
          })}
        </ScrollView>

        <View style={styles.chatListHeader}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('chats')}</Text>
            {filter !== 'all' && (
              <View style={[styles.filterBadge, { backgroundColor: colors.secondary }]}>
                 <Text style={[styles.filterBadgeText, { color: colors.primary }]}>{t(filter)}</Text>
              </View>
            )}
          </View>
          <Pressable 
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <MoreHorizontal size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Global Filter Menu Modal */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setMenuVisible(false)} 
          >
            <View style={[styles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { key: 'all', label: t('all') },
                { key: 'unread', label: t('unread') },
                { key: 'online', label: t('online') },
                { key: 'groups', label: t('groups') },
                { key: 'archives', label: t('archives') }
              ].map(item => (
                <Pressable 
                  key={item.key}
                  onPress={() => {
                      setFilter(item.key as any);
                      setMenuVisible(false);
                  }}
                  style={({ pressed }) => [
                      styles.menuItem,
                      filter === item.key && { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      pressed && { opacity: 0.7 }
                  ]}
                >
                  <Text style={[
                      styles.menuItemText, 
                      { color: filter === item.key ? colors.primary : colors.text }
                  ]}>
                      {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        <View style={styles.chatList}>
          {filteredConversations.map(chat => {
            const partnerParticipant = chat.type === 'individual' ? chat.participants.find(p => {
                const pId = typeof p === 'string' ? p : ((p as any)._id || (p as any).id);
                return String(pId) !== String(user?._id) && String(pId) !== String(user?.id);
            }) : null;
            const partnerId = typeof partnerParticipant === 'string' ? partnerParticipant : ((partnerParticipant as any)?._id || (partnerParticipant as any)?.id);
            const isOnline = partnerId ? onlineUsers[partnerId] : false;
            const isLastMessageFromMe = chat.lastMessage?.senderId === user?._id;

            const formatLastMessage = () => {
              if ((chat as any).isTyping || typingStatus[chat._id]) return t('typing');
              const msg = chat.lastMessage;
              if (!msg) return '';
              
              if (msg.type === 'text') return msg.content;
              if (msg.type === 'image') return `📷 ${t('photo')}`;
              if (msg.type === 'video') return `🎥 ${t('video')}`;
              if ((msg.type as any) === 'audio') return `🎵 ${t('audio')}`;
              if (msg.type === 'voice') return `🎤 ${t('voice')}`;
              if ((msg.type as any) === 'document' || (msg.type as any) === 'file') return `📄 ${t('document')}`;
              
              return msg.content || '';
            };
            
            return (
              <ChatItem 
                key={chat._id} 
                id={chat._id}
                type={chat.type}
                name={chat.name || (chat.type === 'individual' ? t('chat') : (chat.groupMetadata?.name || t('group')))}
                text={formatLastMessage()}
                time={chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                count={user?._id ? (chat.unreadCounts?.[user._id] || 0) : 0}
                image={chat.image || chat.groupMetadata?.icon}
                online={isOnline}
                isTyping={typingStatus[chat._id]}
                onArchive={toggleArchive}
                onPin={togglePinConversation}
                messageStatus={chat.lastMessage?.status as 'sent' | 'delivered' | 'read' | undefined}
                isLastMessageFromMe={isLastMessageFromMe}
                isPremium={chat.isPremium}
                isPinned={chat.pinnedBy?.includes(user?._id as string)}
              />
            );
          })}
          {filteredConversations.length === 0 && !loading && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted }}>
                {t('no_results_found')}
              </Text>
            </View>
          )}
        </View>
        
        {/* Extra space at the end */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storiesContent: {
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  chatListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chatList: {
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuContainer: {
    position: 'absolute',
    top: 215, // Adjusted to appear near the ... button
    right: 20,
    width: 180,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingVertical: 5,
    zIndex: 1000,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40, // Uniform height for better alignment
  },
  filterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

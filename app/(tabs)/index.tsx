import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, Animated, Pressable, Image, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { MoreHorizontal, MessageSquarePlus, MessageSquare, Users, UserPlus } from 'lucide-react-native';
import { StoryCircle } from '@/components/chat/StoryCircle';
import { ChatItem } from '@/components/chat/ChatItem';
import { CHATS, STORIES } from '@/constants/MockData';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl } from 'react-native';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import StoryService from '@/services/StoryService';
import { useCallback, useEffect } from 'react';

export default function ChatsScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const { conversations, refreshConversations, loading, onlineUsers, typingStatus, toggleArchive } = useChat();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'online' | 'groups' | 'archives'>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeStories, setActiveStories] = useState<any[]>([]);

  const fetchStories = useCallback(async () => {
    // We need at least the user to fetch stories (for option 1 orchestration)
    if (!user?._id) return;

    try {
      // Collect IDs from all conversation participants + current user
      const participantIds = new Set<string>();
      participantIds.add(user._id);
      
      if (conversations && conversations.length > 0) {
        conversations.forEach(chat => {
          if (chat.participants && Array.isArray(chat.participants)) {
            chat.participants.forEach((pId: string) => participantIds.add(pId));
          }
        });
      }

      const idsArray = Array.from(participantIds);
      console.log('[fetchStories] Fetching for IDs:', idsArray.length, idsArray);

      const data = await StoryService.getActiveStories(idsArray);
      console.log('[fetchStories] Received data type:', Array.isArray(data) ? 'Array' : typeof data);
      
      const rawStories = Array.isArray(data) ? data : (data?.stories || data?.data || []);
      
      // Handle the provided nested structure: [{ userId, stories: [] }, ...]
      const userStoriesMap = new Map<string, any>();
      
      // rawData is the 'data' array from the JSON response
      const rawData = Array.isArray(data) ? data : (data?.data || data?.stories || []);
      
      rawData.forEach((userGroup: any) => {
        const userId = userGroup.userId || userGroup._id;
        const groupStories = userGroup.stories || [];

        if (userId && groupStories.length > 0) {
          // Take the most recent story as the representative (assuming they are sorted)
          const latestStory = groupStories[0];
          
          let unseenCount = 0;
          groupStories.forEach((s: any) => {
             // Assuming if 'viewers' is missing, it's unseen. If present, check for current user ID.
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
      console.log('[fetchStories] Grouped total users:', groupedStories.length);
      setActiveStories(groupedStories);
    } catch (e) {
      console.error('[fetchStories] Error:', e);
    }
  }, [conversations, user?._id]);

  useEffect(() => {
    if (user?._id) {
      fetchStories();
    }
  }, [user?._id, fetchStories]);

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
    if (isArchived) return false; // Hide archived by default in other filters
    
    if (filter === 'unread') return myId && (chat.unreadCounts?.[myId] || 0) > 0;
    if (filter === 'online') {
        const partnerId = chat.type === 'individual' ? chat.participants.find(p => p !== myId) : null;
        return partnerId && onlineUsers[partnerId];
    }
    if (filter === 'groups') return chat.type === 'group';
    return true;
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
            const displayName = isMe ? t('me', 'Moi') : (story.user?.username || story.user?.name || t('user'));
            const displayImage = (typeof story.user === 'object' ? (story.user?.profilePicture || story.user?.avatar || story.user?.profilePhotoUrl) : null) 
                                || story.mediaParams?.uri 
                                || story.content 
                                || 'https://via.placeholder.com/150';

            console.log(`[fetchStories] User ${displayName} has ${story.storyCount || 1} story(ies)`);

            return (
              <StoryCircle 
                key={storyId} 
                id={storyId}
                name={displayName} 
                image={displayImage}
                storyCount={story.storyCount || 1}
                unseenCount={story.unseenCount || 0}
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
            const partnerId = chat.type === 'individual' ? chat.participants.find(p => p !== user?._id) : null;
            const isOnline = partnerId ? onlineUsers[partnerId] : false;
            return (
              <ChatItem 
                key={chat._id} 
                id={chat._id}
                name={chat.name || (chat.type === 'individual' ? t('chat') : (chat.groupMetadata?.name || t('group')))}
                text={chat.lastMessage?.content || ''}
                time={chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                count={user?._id ? (chat.unreadCounts?.[user._id] || 0) : 0}
                image={chat.image || chat.groupMetadata?.icon}
                online={isOnline}
                isTyping={typingStatus[chat._id]}
                onArchive={toggleArchive}
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

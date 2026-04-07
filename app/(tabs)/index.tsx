import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, Animated, Pressable, Image, Platform } from 'react-native';
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

export default function ChatsScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const { conversations, refreshConversations, loading, onlineUsers } = useChat();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshConversations} />
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
          {STORIES.map(story => (
            <StoryCircle key={story.id} {...story} onPress={() => router.push(`/status/${story.id}`)} />
          ))}
        </ScrollView>

        {/* Chats List */}
        <View style={styles.chatListHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('chats')}</Text>
          <Pressable style={styles.iconBtn}>
            <MoreHorizontal size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.chatList}>
          {conversations.map(chat => {
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
              />
            );
          })}
          {conversations.length === 0 && !loading && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted }}>{t('no_chats')}</Text>
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
});

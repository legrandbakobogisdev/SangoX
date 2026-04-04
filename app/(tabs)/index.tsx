import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, Animated, Pressable, Image, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { MoreHorizontal, MessageSquarePlus, MessageSquare, Users, UserPlus } from 'lucide-react-native';
import { StoryCircle } from '@/components/chat/StoryCircle';
import { ChatItem } from '@/components/chat/ChatItem';
import { CHATS, STORIES } from '@/constants/MockData';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatsScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories */}
        <View style={styles.sectionHeader}>
           {/* In the image, Stories doesn't have a label, but it's part of the top bar */}
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.storiesContent}
        >
          <StoryCircle id="add" isAdd onPress={() => {}} name={t('add_story')} />
          {STORIES.map(story => (
            <StoryCircle key={story.id} {...story} onPress={() => {}} />
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
          {CHATS.map(chat => (
            <ChatItem key={chat.id} {...chat} />
          ))}
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

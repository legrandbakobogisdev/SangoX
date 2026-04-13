import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, MoreVertical, Bell, Eye, Bookmark, Lock, ChevronRight, User as UserIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const StatCard = ({ label, value, colors }: any) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const ActionItem = ({ icon: Icon, label, value, showArrow = true, colors, isSwitch = false, switchValue = false }: any) => (
  <Pressable style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}>
    <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary + '20' }]}>
      <Icon size={20} color={colors.text} />
    </View>
    <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    <View style={styles.actionRight}>
      {value && <Text style={[styles.actionValue, { color: colors.textMuted }]}>{value}</Text>}
      {isSwitch ? (
        <View style={[styles.switch, { backgroundColor: switchValue ? colors.primary : colors.border }]}>
          <View style={[styles.switchThumb, { transform: [{ translateX: switchValue ? 14 : 0 }] }]} />
        </View>
      ) : showArrow && <ChevronRight size={18} color={colors.textMuted} />}
    </View>
  </Pressable>
);

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { conversations, onlineUsers } = useChat();
  const { t } = useTranslation();
  const router = useRouter();

  const { user } = useAuth();

  const chat = useMemo(() => 
    conversations.find(c => c._id === id), 
    [conversations, id]
  );
  
  const { messages } = useChat();

  const conversationMedia = useMemo(() => {
    return messages
      .filter(m => m.type === 'image' || m.type === 'video')
      .map(m => m.content)
      .reverse();
  }, [messages]);

  const isOnline = id && onlineUsers[id as string];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Header */}
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerBar}>
              <Pressable onPress={() => router.back()} style={styles.iconButton}>
                <ChevronLeft size={24} color={colors.text} />
              </Pressable>
              <Pressable style={styles.iconButton}>
                <MoreVertical size={24} color={colors.text} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarWrapper, { borderColor: colors.border }]}>
              {chat?.image ? (
                <Image source={{ uri: chat.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
                  <UserIcon size={60} color={colors.text} />
                </View>
              )}
              {isOnline && <View style={[styles.onlineBadge, { backgroundColor: colors.success, borderColor: colors.background }]} />}
            </View>
          </View>
          
          <Text style={[styles.name, { color: colors.text }]}>{chat?.name || 'User'}</Text>
          <Text style={[styles.subText, { color: colors.textMuted }]}>{chat?.type === 'group' ? t('group') : (chat?.name ? `@${chat.name.toLowerCase().replace(/\s/g, '')}` : '')}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label="Message" value={messages.length.toLocaleString()} colors={colors} />
          <StatCard label="Media" value={conversationMedia.length} colors={colors} />
          <StatCard label="Spaces" value="0" colors={colors} />
        </View>

        {/* Media and Photos */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable 
            style={styles.sectionHeader}
            onPress={() => router.push(`/chat/media/${id}`)}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('media_and_photos', 'Média et photos')}</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaScroll}>
            {conversationMedia.length > 0 ? (
              conversationMedia.slice(0, 10).map((uri, index) => (
                <Pressable 
                  key={index} 
                  style={styles.mediaWrapper}
                  onPress={() => router.push(`/chat/media/${id}`)}
                >
                  <Image source={{ uri }} style={styles.mediaThumb} contentFit="cover" />
                </Pressable>
              ))
            ) : (
              <Text style={{ color: colors.textMuted, paddingVertical: 10 }}>Aucun média partagé</Text>
            )}
          </ScrollView>
        </View>

        {/* Actions List */}
        <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActionItem icon={Bell} label="Notification" colors={colors} />
          <ActionItem icon={Eye} label="Media visibility" colors={colors} />
          <ActionItem icon={Bookmark} label="Bookmarked" colors={colors} />
          <ActionItem icon={Lock} label="Lock Chat" colors={colors} isSwitch={true} switchValue={false} />
        </View>

        {/* Extra Actions */}
        <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
          <ActionItem icon={Bell} label="Notification" colors={colors} />
          <ActionItem icon={Eye} label="Media visibility" colors={colors} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    padding: 3,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 57,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 57,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#111', // Adjust to background
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mediaScroll: {
    gap: 12,
  },
  mediaWrapper: {
    width: (width - 100) / 4,
    height: (width - 100) / 4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionsCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionValue: {
    fontSize: 14,
    marginRight: 8,
  },
  switch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});

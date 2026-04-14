import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MoreVertical, Bell, Eye, Bookmark, Lock, ChevronRight, User as UserIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '@/services/api';
import LottieView from 'lottie-react-native';

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

export default function GroupProfileScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { conversations, messages } = useChat();
  const { t } = useTranslation();
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const chat = useMemo(() => 
    conversations.find(c => c._id === id), 
    [conversations, id]
  );
  
  const conversationMedia = useMemo(() => {
    return messages
      .filter(m => m.type === 'image' || m.type === 'video')
      .map(m => m.content)
      .reverse();
  }, [messages]);

  useEffect(() => {
    if (id) {
      ApiService.get(`/api/chat/conversations/${id}/members`)
        .then((res: any) => {
          let fetchedMembers = [];
          if (Array.isArray(res)) fetchedMembers = res;
          else if (res?.data && Array.isArray(res.data)) fetchedMembers = res.data;
          else if (res?.data?.members && Array.isArray(res.data.members)) fetchedMembers = res.data.members;
          else if (res?.members && Array.isArray(res.members)) fetchedMembers = res.members;
          
          setMembers(fetchedMembers);
        })
        .catch((err) => {
          console.error('Failed to fetch group members', err);
          setMembers([]);
        })
        .finally(() => {
          setLoadingMembers(false);
        });
    }
  }, [id]);

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
              {chat?.image || chat?.groupMetadata?.icon ? (
                <Image source={{ uri: chat?.groupMetadata?.icon || chat?.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
                  <UserIcon size={60} color={colors.text} />
                </View>
              )}
            </View>
          </View>
          
          <Text style={[styles.name, { color: colors.text }]}>{chat?.name || chat?.groupMetadata?.name || 'Group'}</Text>
          <Text style={[styles.subText, { color: colors.textMuted }]}>{t('group')}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label="Message" value={messages.length.toLocaleString()} colors={colors} />
          <StatCard label="Media" value={conversationMedia.length} colors={colors} />
        </View>

        {/* Members Section */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Membres du groupe ({members.length})</Text>
          </View>
          {loadingMembers ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <View style={{ gap: 16 }}>
              {members.map((member: any) => {
                const isPremium = member.isPremium;
                const displayName = member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : (member.username || member.name || 'Utilisateur');
                const photo = member.profilePicture || member.avatar || member.profilePhotoUrl;
                
                return (
                  <View key={member._id} style={styles.memberRow}>
                    <View style={styles.memberAvatarContainer}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.memberAvatar} />
                      ) : (
                        <View style={[styles.memberAvatarPlaceholder, { backgroundColor: colors.secondary }]}>
                          <UserIcon size={20} color={colors.text} />
                        </View>
                      )}
                      {member.onlineStatus === 'online' && <View style={[styles.memberOnlineBadge, { backgroundColor: colors.success, borderColor: colors.surface }]} />}
                    </View>
                    
                    <View style={styles.memberInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {isPremium && (
                          <LottieView
                            source={require('@/assets/lottie/Disabled premium.json')}
                            autoPlay
                            loop
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        
                        {(member.isAdmin || member.isCreator) && (
                           <View style={[styles.adminBadge, { backgroundColor: member.isCreator ? 'rgba(255, 165, 0, 0.2)' : 'rgba(0, 122, 255, 0.2)' }]}>
                             <Text style={[styles.adminBadgeText, { color: member.isCreator ? '#FFA500' : '#007AFF' }]}>{member.isCreator ? 'Créateur' : 'Admin'}</Text>
                           </View>
                        )}
                      </View>
                      <Text style={[styles.memberStatus, { color: member.onlineStatus === 'online' ? colors.success : colors.textMuted }]}>
                        {member.onlineStatus === 'online' ? 'En ligne' : 'Hors ligne'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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

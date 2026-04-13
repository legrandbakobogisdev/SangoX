import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useChat } from '@/context/ChatContext';
import { Archive, Check, CheckCheck, Pin, PinOff } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

interface ChatItemProps {
  id: string;
  name: string;
  text: string;
  time: string;
  type?: 'individual' | 'group';
  count?: number;
  image?: string;
  online?: boolean;
  isTyping?: boolean;
  onArchive?: (id: string) => void;
  onPin?: (id: string) => void;
  messageStatus?: 'sent' | 'delivered' | 'read';
  isLastMessageFromMe?: boolean;
  isPremium?: boolean;
  isPinned?: boolean;
}

export const ChatItem = ({ id, name, text, time, type = 'individual', count, image, online, isTyping, onArchive, onPin, messageStatus, isLastMessageFromMe, isPremium, isPinned }: ChatItemProps) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const isNavigating = React.useRef(false);

  const handlePress = () => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    if (type === 'group') {
      router.push(`/chat/group/${id}`);
    } else {
      router.push(`/chat/${id}`);
    }
    
    // Reset after a short delay to allow future navigation
    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);
  };

  const renderRightActions = (progress: any, dragX: any) => {
    return (
      <Pressable 
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onArchive?.(id);
        }}
        style={[styles.archiveAction, { backgroundColor: colors.primary }]}
      >
        <Archive size={24} color="#000" />
      </Pressable>
    );
  };

  const renderLeftActions = (progress: any, dragX: any) => {
    return (
      <Pressable 
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPin?.(id);
        }}
        style={[styles.pinAction, { backgroundColor: colors.secondary }]}
      >
        {isPinned ? (
          <PinOff size={24} color={colors.primary} />
        ) : (
          <Pin size={24} color={colors.primary} />
        )}
      </Pressable>
    );
  };

  const renderStatusIcon = () => {
    if (!isLastMessageFromMe || isTyping) return null;
    
    // read = 2 checkmarks bleus
    if (messageStatus === 'read') {
      return <CheckCheck size={14} color={colors.primary} />;
    } 
    // delivered = 2 checkmarks gris
    else if (messageStatus === 'delivered') {
      return <CheckCheck size={14} color={colors.textMuted} />;
    } 
    // sent = 1 checkmark gris
    else if (messageStatus === 'sent') {
      return <Check size={14} color={colors.textMuted} />;
    }
    return null;
  };

  return (
    <Swipeable 
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
        overshootRight={false}
        overshootLeft={false}
    >
        <Pressable
            onPress={handlePress}
            android_ripple={{ 
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                foreground: true 
            }}
            style={({ pressed }) => [
                styles.container, 
                { 
                    backgroundColor: Platform.OS === 'ios' && pressed 
                    ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)') 
                    : colors.background // Ensure background for swipeable contrast
                }
            ]}
        >
            <View style={styles.avatarContainer}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.secondary }]} />
                )}
                {online && (
                    <View style={[styles.onlineIndicator, { backgroundColor: colors.success, borderColor: colors.background }]} />
                )}
            </View>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                          {name}
                      </Text>
                      {type === 'group' && (
                        <View style={[styles.groupBadge, { backgroundColor: theme === 'dark' ? '#2A2F32' : '#F0F2F5' }]}>
                          <Text style={[styles.groupBadgeText, { color: colors.textMuted }]}>{t('group').toUpperCase()}</Text>
                        </View>
                      )}
                      {isPinned && (
                        <View style={[styles.pinBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.pinBadgeText, { color: colors.primary }]}>{t('pin').toUpperCase()}</Text>
                        </View>
                      )}
                      {isPremium && (
                        <View style={styles.premiumBadge}>
                          <LottieView 
                            source={require('@/assets/lottie/Disabled premium.json')} 
                            autoPlay 
                            loop 
                            style={{ width: 20, height: 20 }} 
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.timeRow}>
                      {isPinned && <Pin size={12} color={colors.primary} style={styles.pinIcon} fill={colors.primary} />}
                      <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
                    </View>
                </View>
                <View style={styles.footer}>
                    <View style={styles.messageWithStatus}>
                        {renderStatusIcon()}
                        <Text 
                            style={[
                                styles.message, 
                                { color: isTyping ? colors.primary : ((count && count > 0) ? colors.text : colors.textMuted) },
                                (count && count > 0 || isTyping) ? { fontWeight: '700' } : null
                            ]} 
                            numberOfLines={1}
                        >
                            {isTyping ? t('typing') : text}
                        </Text>
                    </View>
                    {count !== undefined && count > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadText}>{count}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  premiumBadge: {
    marginLeft: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  time: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing.sm,
  },
  messageWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  archiveAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  pinAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  groupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinIcon: {
    transform: [{ rotate: '45deg' }],
  },
  pinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

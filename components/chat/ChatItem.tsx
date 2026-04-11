import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Archive, Check, CheckCheck } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface ChatItemProps {
  id: string;
  name: string;
  text: string;
  time: string;
  count?: number;
  image?: string;
  online?: boolean;
  isTyping?: boolean;
  onArchive?: (id: string) => void;
  messageStatus?: 'sent' | 'delivered' | 'read';
  isLastMessageFromMe?: boolean;
}

export const ChatItem = ({ id, name, text, time, count, image, online, isTyping, onArchive, messageStatus, isLastMessageFromMe }: ChatItemProps) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const isNavigating = React.useRef(false);

  const handlePress = () => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.push(`/chat/${id}`);
    
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
        friction={2}
        rightThreshold={40}
        overshootRight={false}
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
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
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
    flex: 1,
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
});

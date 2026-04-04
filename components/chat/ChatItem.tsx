import React from 'react';
import { StyleSheet, View, Text, Image, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface ChatItemProps {
  id: string;
  name: string;
  message: string;
  time: string;
  unread?: number;
  image: string;
  online?: boolean;
}

export const ChatItem = React.memo<ChatItemProps>(({ id, name, message, time, unread, image, online }) => {
  const { colors, theme } = useTheme();
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

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ 
        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
        foreground: true // Makes it look like InkWell (on top of content)
      }}
      style={({ pressed }) => [
        styles.container, 
        { 
          backgroundColor: Platform.OS === 'ios' && pressed 
            ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)') 
            : 'transparent' 
        }
      ]}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: image }} style={styles.avatar} />
        {online && <View style={[styles.onlineIndicator, { backgroundColor: colors.success, borderColor: colors.background }]} />}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={1}>
            {message}
          </Text>
          {unread !== undefined && unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

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
});

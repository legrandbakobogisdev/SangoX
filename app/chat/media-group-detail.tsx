import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Dimensions, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { ChevronLeft, Play, MoreVertical, X, Share2, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function MediaGroupDetailScreen() {
  const { messageId, conversationId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { messages, conversations } = useChat();
  const router = useRouter();

  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const message = useMemo(() => {
    if (!messageId || !messages.length) return null;
    
    // If it's a virtual group ID, get the base ID
    const baseId = typeof messageId === 'string' && messageId.startsWith('group_') 
      ? messageId.slice(6) 
      : messageId;
    
    const baseMsg = messages.find(m => m._id === baseId);
    if (!baseMsg) return null;

    // If it was already a group, returned as is
    if (baseMsg.type === 'media_group') return baseMsg;

    // Reconstruct the group logic from [id].tsx
    // Find consecutive media from same sender in same minute
    const baseDate = new Date(baseMsg.createdAt);
    const baseMinute = baseDate.getHours() * 60 + baseDate.getMinutes();
    
    const groupItems = messages.filter(m => {
      if (m.senderId !== baseMsg.senderId) return false;
      if (m.type !== 'image' && m.type !== 'video' && m.type !== 'video/mp4') return false;
      
      const mDate = new Date(m.createdAt);
      const mMinute = mDate.getHours() * 60 + mDate.getMinutes();
      return Math.abs(mMinute - baseMinute) <= 1; // Tolerance 1 min
    });

    return {
      ...baseMsg,
      type: 'media_group',
      items: groupItems
    };
  }, [messages, messageId]);

  const chat = useMemo(() => 
    conversations.find(c => c._id === conversationId),
    [conversations, conversationId]
  );

  const stats = useMemo(() => {
    if (!message || (message.type as any) !== 'media_group' || !message.items) return { photos: 0, videos: 0 };
    const photos = message.items.filter((i: any) => i.type === 'image').length;
    const videos = message.items.filter((i: any) => i.type.includes('video')).length;
    return { photos, videos };
  }, [message]);

  const dateStr = useMemo(() => {
    if (!message) return '';
    return new Date(message.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [message]);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isVideo = item.type.includes('video');
    return (
      <Pressable 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedIndex(index);
          setViewerVisible(true);
        }}
        style={styles.mediaContainer}
      >
        <Image 
          source={{ uri: item.type === 'image' ? item.content : (item.metadata?.thumbnailUrl || item.content) }} 
          style={styles.mediaImage} 
          contentFit="cover"
        />
        {isVideo && (
          <View style={styles.playOverlay}>
            <Play size={40} color="#FFF" fill="#FFF" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{chat?.name || 'Contact'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {stats.photos} Photos, {stats.videos} Vidéos • {dateStr}
            </Text>
          </View>
          <Pressable style={styles.headerIcon}>
            <MoreVertical size={24} color={colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={message?.items || []}
        renderItem={renderItem}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Fullscreen Viewer */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <Pressable onPress={() => setViewerVisible(false)} style={styles.headerIcon}>
              <X size={28} color="#FFF" />
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerIcon}>
                <Share2 size={24} color="#FFF" />
              </Pressable>
              <Pressable style={styles.headerIcon}>
                <Download size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={message?.items || []}
            horizontal
            pagingEnabled
            initialScrollIndex={selectedIndex}
            keyExtractor={(item, index) => 'view_' + (item._id || index)}
            onScrollToIndexFailed={() => {}} 
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => {
              const isVideo = item.type.includes('video');
              const uri = item.type === 'image' ? item.content : (item.metadata?.thumbnailUrl || item.content);
              return (
                <View style={styles.viewerSlide}>
                  <Image source={{ uri }} style={styles.viewerImage} contentFit="contain" />
                  {isVideo && (
                    <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
                      <View style={styles.playCircle}>
                        <Play size={40} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    padding: 0,
    gap: 6,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerActions: {
    flexDirection: 'row',
  },
  viewerSlide: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  playCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

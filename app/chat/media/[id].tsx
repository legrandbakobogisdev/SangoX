import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Play, X, Share2, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

export default function MediaGalleryScreen() {
  const { id } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { conversations, messages } = useChat();
  const { t } = useTranslation();
  const router = useRouter();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const chat = useMemo(() => 
    conversations.find(c => c._id === id), 
    [conversations, id]
  );

  const conversationMedia = useMemo(() => {
    // Collect all media from messages. In a real app, you might want to fetch this from an API 
    // but here we filter current local messages for simplicity.
    const mediaItems: any[] = [];
    
    // Support for media_group (clusters of images/videos)
    messages.forEach(m => {
      if (m.type === 'image' || m.type === 'video' || m.type === 'video/mp4') {
        mediaItems.push(m);
      } else if (m.type === 'media_group' && m.items) {
        m.items.forEach((sub: any) => mediaItems.push(sub));
      }
    });

    return mediaItems.reverse();
  }, [messages]);

  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');

  const filteredMedia = useMemo(() => {
    if (activeTab === 'all') return conversationMedia;
    if (activeTab === 'images') return conversationMedia.filter(m => m.type === 'image');
    if (activeTab === 'videos') return conversationMedia.filter(m => m.type === 'video' || m.type === 'video/mp4');
    return conversationMedia;
  }, [conversationMedia, activeTab]);

  const renderItem = ({ item }: { item: any }) => {
    const isVideo = item.type === 'video' || item.type === 'video/mp4';
    const uri = item.type === 'image' ? item.content : (item.metadata?.thumbnailUrl || item.content);

    return (
      <Pressable 
        style={styles.mediaItem}
        onPress={() => {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
           setSelectedIndex(conversationMedia.indexOf(item));
           setViewerVisible(true);
        }}
      >
        <Image 
          source={{ uri }} 
          style={styles.mediaThumb} 
          contentFit="cover"
          transition={200}
        />
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Play size={20} color="#FFF" fill="#FFF" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('media_and_photos', 'Médias et photos')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{chat?.name || ''}</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(['all', 'images', 'videos'] as const).map((tab) => (
            <Pressable 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem, 
                activeTab === tab && { borderBottomColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === tab ? colors.primary : colors.textMuted }
              ]}>
                {t(tab, tab.charAt(0).toUpperCase() + tab.slice(1))}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredMedia}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        numColumns={COLUMN_COUNT}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('no_media_found', 'Aucun média trouvé')}
            </Text>
          </View>
        }
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
            <Pressable onPress={() => setViewerVisible(false)} style={styles.backButton}>
              <X size={28} color="#FFF" />
            </Pressable>
            <View style={{ flexDirection: 'row' }}>
              <Pressable style={styles.backButton}>
                <Share2 size={24} color="#FFF" />
              </Pressable>
              <Pressable style={styles.backButton}>
                <Download size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={conversationMedia}
            horizontal
            pagingEnabled
            initialScrollIndex={selectedIndex}
            onScrollToIndexFailed={() => {}}
            keyExtractor={(item, index) => 'view_' + (item._id || index)}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => {
              const isVideo = item.type === 'video' || item.type === 'video/mp4';
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
  backButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabItem: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 0,
  },
  mediaItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    padding: 1,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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

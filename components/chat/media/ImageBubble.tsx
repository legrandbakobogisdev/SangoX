import React, { memo, useCallback, useEffect, useState } from 'react';
import { DimensionValue, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Download, X, Check, Share2, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import MediaDownloadManager, { DownloadInfo, DownloadState } from '@/services/MediaDownloadManager';
import { DownloadButton } from './DownloadButton';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_WIDTH = SCREEN_WIDTH * 0.68;
const IMAGE_MAX_HEIGHT = 320;

interface ImageBubbleProps {
  messageId: string;
  uri: string;
  isMine: boolean;
  fileName?: string;
  fileSize?: number;
  colors: any;
  time?: string;
  status?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onCancelUpload?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
}

/**
 * Telegram-style image bubble.
 * - Shows blurred preview first with a download button overlay
 * - On download complete, shows the full-quality image
 * - Tap the image to view fullscreen
 */
export const ImageBubble = memo<ImageBubbleProps>(({
  messageId,
  uri,
  isMine,
  fileName,
  fileSize,
  colors,
  time,
  status,
  isUploading,
  uploadProgress,
  onCancelUpload,
  width,
  height,
}) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    state: 'idle',
    progress: 0,
    localUri: null,
  });
  const [fullscreen, setFullscreen] = useState(false);

  // Subscribe to download state
  useEffect(() => {
    const unsub = MediaDownloadManager.subscribe(messageId, setDownloadInfo);
    // Check if already cached
    MediaDownloadManager.checkCache(messageId, uri);
    return unsub;
  }, [messageId, uri]);

  const handleDownloadPress = useCallback(async () => {
    if (isMine) return; // Sender doesn't need to download
    if (downloadInfo.state === 'downloading') {
      await MediaDownloadManager.cancelDownload(messageId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await MediaDownloadManager.startDownload(messageId, uri);
    }
  }, [downloadInfo.state, messageId, uri, isMine]);

  const handleSaveToGallery = useCallback(async () => {
    const activeUri = downloadInfo.localUri || uri;
    if (activeUri) {
      const saved = await MediaDownloadManager.saveToGallery(activeUri);
      if (saved) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [downloadInfo.localUri, uri]);

  const handleShare = useCallback(async () => {
    const activeUri = downloadInfo.localUri || uri;
    if (activeUri) {
      await MediaDownloadManager.shareFile(activeUri);
    }
  }, [downloadInfo.localUri, uri]);

  const isDownloaded = isUploading ? false : (isMine || downloadInfo.state === 'downloaded');
  // For sending media, the original uri is local and we want to display it
  const displayUri = isUploading ? uri : ((downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri);

  return (
    <>
      <Pressable
        onPress={() => isDownloaded && setFullscreen(true)}
        style={[styles.imageContainer, width ? { width } : {}, height ? { height, maxHeight: height } : {}]}
      >
        {/* The image itself */}
        <Image
          source={{ uri: displayUri }}
          style={[styles.image, width ? { width } : {}, height ? { height } : {}]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={messageId}
        />

        {/* Blur overlay when not downloaded or when uploading */}
        {(!isDownloaded || isUploading) && (
          <View style={styles.blurOverlay}>
            <BlurView intensity={isUploading ? 60 : 100} style={StyleSheet.absoluteFill} tint="dark" />

            {/* File size badge */}
            {fileSize && fileSize > 0 && !isUploading && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>
                  {MediaDownloadManager.formatFileSize(fileSize)}
                </Text>
              </View>
            )}

            {/* Download/Upload button */}
            {isUploading ? (
              <DownloadButton
                progress={uploadProgress || 0}
                state="downloading"
                onPress={onCancelUpload || (() => {})}
                size={52}
                color="#FFF"
                isMine={isMine}
              />
            ) : (
              <DownloadButton
                progress={downloadInfo.progress}
                state={downloadInfo.state}
                onPress={handleDownloadPress}
                size={52}
                color="#FFF"
                isMine={isMine}
              />
            )}
          </View>
        )}

        {/* Downloaded checkmark (Telegram style) */}
        {isDownloaded && !isMine && (
          <View style={styles.downloadedBadge}>
            <Check size={10} color="#FFF" strokeWidth={3} />
          </View>
        )}

        {/* TIME & STATUS OVERLAY */}
        {isDownloaded && (
          <View style={styles.metaOverlay}>
            <View style={styles.metaBackground}>
              <Text style={styles.metaText}>{time}</Text>
              {isMine && (
                <View style={styles.statusIcon}>
                  {status === 'read' ? (
                    <CheckCheck size={13} color="#45B1FF" strokeWidth={2.5} />
                  ) : status === 'delivered' ? (
                    <CheckCheck size={13} color="#FFF" strokeWidth={2} />
                  ) : status === 'sent' ? (
                    <Check size={13} color="#FFF" strokeWidth={2} />
                  ) : (
                    <Ionicons name="time-outline" size={12} color="#FFF" />
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </Pressable>

      {/* Fullscreen viewer */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenContainer}>
          <Image
            source={{ uri: displayUri }}
            style={styles.fullscreenImage}
            contentFit="contain"
          />

          {/* Top bar */}
          <View style={styles.fullscreenTopBar}>
            <Pressable
              onPress={() => setFullscreen(false)}
              style={styles.fullscreenBtn}
            >
              <X size={24} color="#FFF" />
            </Pressable>
            <View style={styles.fullscreenActions}>
              <Pressable onPress={handleShare} style={styles.fullscreenBtn}>
                <Share2 size={22} color="#FFF" />
              </Pressable>
              <Pressable onPress={handleSaveToGallery} style={styles.fullscreenBtn}>
                <Download size={22} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {/* Tap to close */}
          <Pressable
            onPress={() => setFullscreen(false)}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  imageContainer: {
    width: IMAGE_WIDTH,
    maxHeight: IMAGE_MAX_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_MAX_HEIGHT,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sizeBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  downloadedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  metaBackground: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
  },
  statusIcon: {
    marginLeft: 0,
  },
  // Fullscreen modal
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenTopBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  fullscreenBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fullscreenActions: {
    flexDirection: 'row',
  },
});

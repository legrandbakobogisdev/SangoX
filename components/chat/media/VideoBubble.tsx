import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { DimensionValue, Dimensions, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Play, Share2, Check, CheckCheck, X, Download, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import MediaDownloadManager, { DownloadInfo } from '@/services/MediaDownloadManager';
import { DownloadButton } from './DownloadButton';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_WIDTH = SCREEN_WIDTH * 0.68;
const VIDEO_HEIGHT = 200;

interface VideoBubbleProps {
  messageId: string;
  uri: string;
  isMine: boolean;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  thumbnailUri?: string;
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
 * Telegram-style video bubble.
 * - Shows blurred thumbnail with download overlay
 * - Duration badge + file size
 * - After download: tap to open/play the video
 */
export const VideoBubble = memo<VideoBubbleProps>(({
  messageId,
  uri,
  isMine,
  fileName,
  fileSize,
  duration,
  thumbnailUri,
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
  const [playerVisible, setPlayerVisible] = useState(false);
  
  const sourceUri = (downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri;
  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (playerVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [playerVisible, player]);

  useEffect(() => {
    const unsub = MediaDownloadManager.subscribe(messageId, setDownloadInfo);
    MediaDownloadManager.checkCache(messageId, uri);
    return unsub;
  }, [messageId, uri]);

  const isDownloaded = isUploading ? false : (isMine || downloadInfo.state === 'downloaded');

  // Use the video URL as a thumbnail if none provided (Cloudinary can generate thumbs)
  const thumbUri = thumbnailUri || uri;

  const handleDownloadPress = useCallback(async () => {
    if (isMine) return;
    if (downloadInfo.state === 'downloading') {
      await MediaDownloadManager.cancelDownload(messageId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await MediaDownloadManager.startDownload(messageId, uri);
    }
  }, [downloadInfo.state, messageId, uri, isMine]);

  const handlePlay = useCallback(async () => {
    if (isDownloaded) {
      setPlayerVisible(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    }
  }, [isDownloaded]);

  const handleShare = useCallback(async () => {
    const activeUri = (downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri;
    if (activeUri) {
      await MediaDownloadManager.shareFile(activeUri);
    }
  }, [downloadInfo.localUri, uri, downloadInfo.state]);

  const handleSaveToGallery = useCallback(async () => {
    const activeUri = downloadInfo.localUri || uri;
    if (activeUri) {
      const saved = await MediaDownloadManager.saveToGallery(activeUri);
      if (saved) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [downloadInfo.localUri, uri]);

  return (
    <Pressable
      onPress={isDownloaded ? handlePlay : undefined}
      style={[styles.container, width ? { width } : {}, height ? { height } : {}]}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: thumbUri }}
        style={[styles.thumbnail, width ? { width } : {}, height ? { height } : {}]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      {/* Dark gradient overlay */}
      <View style={styles.overlay} />

      {/* Blur when not downloaded or uploading */}
      {(!isDownloaded || isUploading) && (
        <View style={styles.blurOverlay}>
          <BlurView intensity={isUploading ? 60 : 100} style={StyleSheet.absoluteFill} tint="dark" />
        </View>
      )}

      {/* Center content */}
      <View style={styles.centerContent}>
        {isDownloaded ? (
          <View style={styles.playCircle}>
            <Play size={28} color="#FFF" fill="#FFF" />
          </View>
        ) : isUploading ? (
          <DownloadButton
            progress={uploadProgress || 0}
            state="downloading"
            onPress={onCancelUpload || (() => {})}
            size={56}
            color="#FFF"
          />
        ) : (
          <DownloadButton
            progress={downloadInfo.progress}
            state={downloadInfo.state}
            onPress={handleDownloadPress}
            size={56}
            color="#FFF"
          />
        )}
      </View>

      {/* Bottom info bar */}
      <View style={styles.bottomBar}>
        {/* Duration */}
        {duration && duration > 0 && (
          <View style={styles.durationBadge}>
            <Play size={10} color="#FFF" fill="#FFF" />
            <Text style={styles.durationText}>
              {MediaDownloadManager.formatDuration(duration / 1000)}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* TIME & STATUS OVERLAY */}
        {isDownloaded && (
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
        )}
      </View>

      {/* Video label */}
      {!isDownloaded && (
        <View style={styles.labelBadge}>
          <Text style={styles.labelText}>VIDÉO</Text>
        </View>
      )}

      {/* PLAYER MODAL */}
      <Modal
        visible={playerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlayerVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.playerContainer}>
          <VideoView
            player={player}
            style={styles.fullVideo}
            contentFit="contain"
            allowsPictureInPicture
          />

          {/* Top Bar Overlay */}
          <View style={styles.playerTopBar}>
            <Pressable onPress={() => setPlayerVisible(false)} style={styles.playerBtn}>
              <X size={24} color="#FFF" />
            </Pressable>
            <View style={{ flexDirection: 'row' }}>
              <Pressable onPress={handleShare} style={styles.playerBtn}>
                <Share2 size={20} color="#FFF" />
              </Pressable>
              <Pressable onPress={handleSaveToGallery} style={styles.playerBtn}>
                <Download size={20} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sizeBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sizeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
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
  labelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  labelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Player Modal
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  playerTopBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  playerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

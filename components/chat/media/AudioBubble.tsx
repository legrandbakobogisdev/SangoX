import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Pause, Play, Mic, Check, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import MediaDownloadManager, { DownloadInfo } from '@/services/MediaDownloadManager';
import { DownloadButton } from './DownloadButton';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const AUDIO_WIDTH = SCREEN_WIDTH * 0.65;
const WAVEFORM_BARS = 30;

interface AudioBubbleProps {
  messageId: string;
  uri: string;
  isMine: boolean;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  colors: any;
  time?: string;
  status?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onCancelUpload?: () => void;
}

/**
 * WhatsApp/Telegram-style audio message bubble.
 * - Animated waveform bars
 * - Play/pause with seek
 * - Duration display
 * - Download management
 */
export const AudioBubble = memo<AudioBubbleProps>(({
  messageId,
  uri,
  isMine,
  fileName,
  fileSize,
  duration: initialDuration,
  colors,
  time,
  status,
  isUploading,
  uploadProgress,
  onCancelUpload,
}) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    state: 'idle',
    progress: 0,
    localUri: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Generate consistent pseudo-random waveform bars
  const waveformBars = useRef<number[]>(
    Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      // Deterministic "random" from messageId
      const seed = messageId.charCodeAt(i % messageId.length) + i;
      return 0.2 + (Math.sin(seed * 2.4) * 0.5 + 0.5) * 0.8;
    })
  ).current;

  useEffect(() => {
    const unsub = MediaDownloadManager.subscribe(messageId, setDownloadInfo);
    MediaDownloadManager.checkCache(messageId, uri);
    return () => {
      unsub();
      // Cleanup sound on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [messageId, uri]);

  const handleDownloadPress = useCallback(async () => {
    if (isMine) return;
    if (downloadInfo.state === 'downloading') {
      await MediaDownloadManager.cancelDownload(messageId);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await MediaDownloadManager.startDownload(messageId, uri);
    }
  }, [downloadInfo.state, messageId, uri, isMine]);

  const handlePlayPause = useCallback(async () => {
    const audioUri = (downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        // Resume
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      // Create new sound
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(status.durationMillis);
            }
            setCurrentPosition(status.positionMillis);
            setPlaybackProgress(
              status.durationMillis
                ? status.positionMillis / status.durationMillis
                : 0
            );
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackProgress(0);
              setCurrentPosition(0);
              soundRef.current?.setPositionAsync(0);
            }
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
    }
  }, [isPlaying, downloadInfo.localUri, uri]);

  const handleSeek = useCallback(async (barIndex: number) => {
    if (!soundRef.current || !duration) return;
    const seekPosition = (barIndex / WAVEFORM_BARS) * duration;
    await soundRef.current.setPositionAsync(seekPosition);
    setCurrentPosition(seekPosition);
    setPlaybackProgress(barIndex / WAVEFORM_BARS);
    Haptics.selectionAsync();
  }, [duration]);

  const isDownloaded = isUploading ? false : (isMine || downloadInfo.state === 'downloaded');
  const displayDuration = duration
    ? MediaDownloadManager.formatDuration(duration / 1000)
    : (initialDuration ? MediaDownloadManager.formatDuration(initialDuration / 1000) : '0:00');

  const currentTime = currentPosition > 0
    ? MediaDownloadManager.formatDuration(currentPosition / 1000)
    : displayDuration;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isMine
          ? colors.bubbleSelf
          : colors.bubbleOther,
        borderColor: isMine ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.05)',
      }
    ]}>
      {/* Left: play/pause or download button */}
      <View style={styles.leftSection}>
        {isUploading ? (
          <DownloadButton
            progress={uploadProgress || 0}
            state="downloading"
            onPress={onCancelUpload || (() => {})}
            size={42}
            color={isMine ? colors.text : colors.primary}
            isMine={isMine}
          />
        ) : !isDownloaded ? (
          <DownloadButton
            progress={downloadInfo.progress}
            state={downloadInfo.state}
            onPress={handleDownloadPress}
            size={42}
            color={isMine ? colors.text : colors.primary}
          />
        ) : (
          <Pressable
            onPress={handlePlayPause}
            style={[
              styles.playButton,
              { backgroundColor: isMine ? 'rgba(0,0,0,0.15)' : `${colors.primary}25` },
            ]}
          >
            {isPlaying ? (
              <Pause size={20} color={isMine ? colors.text : colors.primary} fill={isMine ? colors.text : colors.primary} />
            ) : (
              <Play size={20} color={isMine ? colors.text : colors.primary} fill={isMine ? colors.text : colors.primary} style={{ marginLeft: 2 }} />
            )}
          </Pressable>
        )}
      </View>

      {/* Right: waveform + time */}
      <View style={styles.rightSection}>
        {/* Waveform bars */}
        <View style={styles.waveformContainer}>
          {waveformBars.map((height, index) => {
            const barProgress = index / WAVEFORM_BARS;
            const isActive = playbackProgress > barProgress;
            return (
              <Pressable
                key={index}
                onPress={() => isDownloaded && handleSeek(index)}
                style={[
                  styles.waveformBar,
                  {
                    height: 4 + height * 22,
                    backgroundColor: isActive
                      ? (isMine ? colors.text : colors.primary)
                      : (isMine ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)'),
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Bottom info */}
        <View style={styles.bottomRow}>
          {/* Mic icon */}
          <Mic size={11} color={isMine ? 'rgba(0,0,0,0.4)' : colors.textMuted} />
          {/* Duration */}
          <Text style={[styles.durationText, { color: isMine ? 'rgba(0,0,0,0.5)' : colors.textMuted }]}>
            {isPlaying ? currentTime : displayDuration}
          </Text>
          {fileSize && fileSize > 0 && !isDownloaded && (
            <Text style={[styles.sizeText, { color: isMine ? 'rgba(0,0,0,0.35)' : colors.textMuted }]}>
              • {MediaDownloadManager.formatFileSize(fileSize)}
            </Text>
          )}

          <View style={{ flex: 1 }} />

          {/* TIME & STATUS OVERLAY */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: isMine ? 'rgba(0,0,0,0.45)' : colors.textMuted }]}>
              {time}
            </Text>
            {isMine && (
              <View style={styles.statusIcon}>
                {status === 'read' ? (
                  <CheckCheck size={13} color="#45B1FF" strokeWidth={2.5} />
                ) : status === 'delivered' ? (
                  <CheckCheck size={13} color="rgba(0,0,0,0.4)" strokeWidth={2} />
                ) : status === 'sent' ? (
                  <Check size={13} color="rgba(0,0,0,0.4)" strokeWidth={2} />
                ) : (
                  <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.4)" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: AUDIO_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 12,
    borderWidth: 0,
  },
  leftSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 2,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sizeText: {
    fontSize: 10,
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusIcon: {
    marginLeft: 0,
  },
});

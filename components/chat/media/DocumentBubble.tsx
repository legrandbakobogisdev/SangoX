import React, { memo, useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { FileText, File, FileImage, FileSpreadsheet, FileArchive, Download, Share2, Check, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import MediaDownloadManager, { DownloadInfo } from '@/services/MediaDownloadManager';
import { DownloadButton } from './DownloadButton';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DOC_WIDTH = SCREEN_WIDTH * 0.65;

interface DocumentBubbleProps {
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
}

const getFileIcon = (fileName: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { icon: FileText, color: '#E74C3C' };
  if (['doc', 'docx'].includes(ext)) return { icon: FileText, color: '#2B5797' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: FileSpreadsheet, color: '#217346' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: FileImage, color: '#E67E22' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: FileArchive, color: '#8E44AD' };
  return { icon: File, color: '#7F8C8D' };
};

const getFileExtension = (fileName: string): string => {
  const ext = fileName?.split('.').pop()?.toUpperCase() || '';
  return ext || 'FILE';
};

/**
 * Telegram-style document bubble.
 * - Shows file icon with extension badge
 * - File name and size
 * - Download/share/open actions
 */
export const DocumentBubble = memo<DocumentBubbleProps>(({
  messageId,
  uri,
  isMine,
  fileName = 'Document',
  fileSize,
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

  useEffect(() => {
    const unsub = MediaDownloadManager.subscribe(messageId, setDownloadInfo);
    MediaDownloadManager.checkCache(messageId, uri);
    return unsub;
  }, [messageId, uri]);

  const handleDownloadPress = useCallback(async () => {
    if (isMine) return; // Sender already has it
    if (downloadInfo.state === 'downloading') {
      await MediaDownloadManager.cancelDownload(messageId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await MediaDownloadManager.startDownload(messageId, uri);
    }
  }, [downloadInfo.state, messageId, uri, isMine]);

  const handleShare = useCallback(async () => {
    const activeUri = (downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri;
    if (activeUri) {
      await MediaDownloadManager.shareFile(activeUri);
    }
  }, [downloadInfo.localUri, uri, downloadInfo.state]);

  const handleOpen = useCallback(async () => {
    const activeUri = (downloadInfo.state === 'downloaded' && downloadInfo.localUri) ? downloadInfo.localUri : uri;
    if (activeUri) {
      await MediaDownloadManager.shareFile(activeUri);
    }
  }, [downloadInfo.localUri, uri, downloadInfo.state]);

  const isDownloaded = isUploading ? false : (isMine || downloadInfo.state === 'downloaded');
  const { icon: FileIcon, color: iconColor } = getFileIcon(fileName);
  const extension = getFileExtension(fileName);

  return (
    <Pressable
      onPress={isDownloaded ? handleOpen : undefined}
      style={[
        styles.container,
        {
          backgroundColor: isMine
            ? colors.bubbleSelf
            : colors.bubbleOther,
          borderColor: isMine ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.05)',
        },
      ]}
    >
      {/* File icon with extension badge */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <FileIcon size={28} color={iconColor} />
        <View style={[styles.extBadge, { backgroundColor: iconColor }]}>
          <Text style={styles.extText}>{extension}</Text>
        </View>
      </View>

      {/* File info */}
      <View style={styles.infoSection}>
        <Text
          style={[
            styles.fileName,
            { color: isMine ? colors.text : colors.text },
          ]}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <View style={styles.metaRow}>
          {fileSize && fileSize > 0 && (
            <Text
              style={[
                styles.fileSize,
                { color: isMine ? 'rgba(0,0,0,0.45)' : colors.textMuted },
              ]}
            >
              {MediaDownloadManager.formatFileSize(fileSize)}
            </Text>
          )}
          
          <View style={{ flex: 1 }} />

          {/* TIME & STATUS OVERLAY */}
          <View style={styles.timeStatusRow}>
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

      {/* Action button */}
      <View style={styles.actionSection}>
        {isUploading ? (
          <DownloadButton
            progress={uploadProgress || 0}
            state="downloading"
            onPress={onCancelUpload || (() => {})}
            size={40}
            color={isMine ? colors.text : colors.primary}
            isMine={isMine}
          />
        ) : isDownloaded ? (
          <Pressable onPress={handleShare} style={[styles.shareBtn, { backgroundColor: `${colors.primary}20` }]}>
            <Share2 size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <DownloadButton
            progress={downloadInfo.progress}
            state={downloadInfo.state}
            onPress={handleDownloadPress}
            size={40}
            color={isMine ? colors.text : colors.primary}
          />
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: DOC_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    gap: 12,
    borderWidth: 0,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  extBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  extText: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '400',
  },
  downloadedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  downloadedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeStatusRow: {
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

import { ApiService } from './api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUploadTask,
  FileSystemUploadType,
  UploadTask,
  UploadProgressData,
} from 'expo-file-system/legacy';

export type MediaContext = 'chat' | 'story' | 'profile' | 'other';

export interface MediaUploadResponse {
  url: string;
  publicId: string;
  type: 'image' | 'video' | 'voice' | 'document';
  mediaId: string;
  thumbnailUrl?: string;
  blurhash?: string;
  fileHash?: string;
}

export interface UploadOptions {
    isEncrypted?: boolean;
    fileHash?: string;
    blurhash?: string;
    customThumbnailUrl?: string;
    fileName?: string;
}

export interface MediaLimits {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  isPremium: boolean;
}

export type UploadProgressCallback = (progress: number) => void;

class MediaService {
  // Active upload tasks for cancellation
  private activeUploads: Map<string, UploadTask> = new Map();

  /**
   * Upload a single file with progress tracking
   */
  async uploadFile(
    uri: string,
    context: MediaContext,
    ownerId?: string,
    onProgress?: UploadProgressCallback,
    uploadId?: string,
    options: UploadOptions = {}
  ): Promise<MediaUploadResponse> {
    const formData = new FormData();
    
    // Create the file object
    const fileName = options.fileName || uri.split('/').pop() || 'file';
    const match = /\.(\w+)$/.exec(fileName);
    let type = 'application/octet-stream';
    if (match) {
        const ext = match[1].toLowerCase();
        if (['mp4', 'avi', 'mkv'].includes(ext)) {
            type = `video/${ext}`;
        } else if (ext === 'mov') {
            type = 'video/quicktime';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
            type = ext === 'jpg' ? 'image/jpeg' : (ext === 'heic' ? 'image/heic' : `image/${ext}`);
        } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) {
            type = ext === 'm4a' ? 'audio/mp4' : (ext === 'ogg' ? 'audio/ogg' : `audio/${ext}`);
        } else if (ext === 'pdf') {
            type = 'application/pdf';
        } else if (['doc', 'docx'].includes(ext)) {
            type = ext === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (['xls', 'xlsx'].includes(ext)) {
            type = ext === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (['zip', 'rar', '7z'].includes(ext)) {
            type = 'application/zip';
        }
    }

    // @ts-ignore - React Native FormData accepts this shape
    formData.append('file', {
      uri: uri.startsWith('file://') ? uri : `file://${uri}`,
      name: fileName,
      type,
    });
    
    formData.append('context', context);
    if (ownerId) {
      formData.append('ownerId', ownerId);
    }

    // Add metadata options to formData
    if (options.isEncrypted !== undefined) formData.append('isEncrypted', String(options.isEncrypted));
    if (options.fileHash) formData.append('fileHash', options.fileHash);
    if (options.blurhash) formData.append('blurhash', options.blurhash);
    if (options.customThumbnailUrl) formData.append('customThumbnailUrl', options.customThumbnailUrl);

    try {
      // If onProgress is provided, use FileSystem upload for real progress
      if (onProgress) {
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
        const token = await AsyncStorage.getItem('@sangox_access_token');

        const uploadTask = createUploadTask(
          `${API_BASE_URL}/api/media/upload`,
          uri.startsWith('file://') ? uri : `file://${uri}`,
          {
            uploadType: FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: type,
            parameters: {
              context,
              ...(ownerId ? { ownerId } : {}),
              ...(options.isEncrypted !== undefined ? { isEncrypted: String(options.isEncrypted) } : {}),
              ...(options.fileHash ? { fileHash: options.fileHash } : {}),
              ...(options.blurhash ? { blurhash: options.blurhash } : {}),
              ...(options.customThumbnailUrl ? { customThumbnailUrl: options.customThumbnailUrl } : {}),
            },
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          },
          (data: UploadProgressData) => {
            if (data.totalBytesExpectedToSend > 0) {
              onProgress(data.totalBytesSent / data.totalBytesExpectedToSend);
            }
          }
        );

        // Track for cancellation
        if (uploadId) {
          this.activeUploads.set(uploadId, uploadTask);
        }

        const result = await uploadTask.uploadAsync();

        // Cleanup
        if (uploadId) {
          this.activeUploads.delete(uploadId);
        }

        if (!result || result.status >= 400) {
          throw new Error(`Upload failed: ${result?.status || 'unknown'}`);
        }

        const parsed = JSON.parse(result.body);
        return parsed.data || parsed;
      }

      // Standard upload without progress (simpler)
      const response = await ApiService.post<any>('/api/media/upload', formData, {
          headers: {
              'Content-Type': 'multipart/form-data',
          }
      });
      return response.data || response;
    } catch (error: any) {
      if (uploadId) {
        this.activeUploads.delete(uploadId);
      }
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string) {
    const task = this.activeUploads.get(uploadId);
    if (task) {
      task.cancelAsync();
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Get media upload limits for the current user
   */
  async getLimits(): Promise<MediaLimits> {
    const response = await ApiService.get<any>('/api/media/limits');
    return response.data || response;
  }

  /**
   * Helper to check if a file size is within limits
   */
  async checkLimit(fileSizeInBytes: number, limits?: MediaLimits): Promise<boolean> {
    const currentLimits = limits || await this.getLimits();
    return fileSizeInBytes <= currentLimits.maxFileSize;
  }

  /**
   * Determine the message type from a file extension
   */
  getMediaType(fileName: string): 'image' | 'video' | 'voice' | 'document' {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', '3gp'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'].includes(ext)) return 'voice';
    return 'document';
  }
}

export default new MediaService();

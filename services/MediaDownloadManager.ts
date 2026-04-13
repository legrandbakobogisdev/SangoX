import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  createDownloadResumable,
  DownloadResumable,
  DownloadProgressData,
} from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

export type DownloadState = 'idle' | 'downloading' | 'downloaded' | 'error';

export interface DownloadInfo {
  state: DownloadState;
  progress: number; // 0-1
  localUri: string | null;
  error?: string;
}

type DownloadCallback = (info: DownloadInfo) => void;

const MEDIA_CACHE_DIR = `${cacheDirectory}sangox_media/`;

class MediaDownloadManager {
  private downloads: Map<string, DownloadInfo> = new Map();
  private listeners: Map<string, Set<DownloadCallback>> = new Map();
  private activeResumables: Map<string, DownloadResumable> = new Map();
  private initialized = false;

  /** Ensure cache directory exists */
  private async ensureCacheDir() {
    if (this.initialized) return;
    const dirInfo = await getInfoAsync(MEDIA_CACHE_DIR);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(MEDIA_CACHE_DIR, { intermediates: true });
    }
    this.initialized = true;
  }

  /** Generate a deterministic local filename from a URL */
  private getLocalPath(remoteUrl: string): string {
    const urlPath = remoteUrl.split('?')[0];
    const segments = urlPath.split('/');
    const filename = segments[segments.length - 1] || 'file';
    const hash = this.simpleHash(remoteUrl);
    const ext = filename.includes('.') ? '' : this.guessExtension(remoteUrl);
    return `${MEDIA_CACHE_DIR}${hash}_${filename}${ext}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private guessExtension(url: string): string {
    if (url.includes('image') || url.includes('.jpg') || url.includes('.jpeg')) return '.jpg';
    if (url.includes('.png')) return '.png';
    if (url.includes('.mp4')) return '.mp4';
    if (url.includes('.mp3')) return '.mp3';
    if (url.includes('.pdf')) return '.pdf';
    if (url.includes('.m4a')) return '.m4a';
    return '';
  }

  /** Subscribe to download state changes for a message */
  subscribe(messageId: string, callback: DownloadCallback): () => void {
    if (!this.listeners.has(messageId)) {
      this.listeners.set(messageId, new Set());
    }
    this.listeners.get(messageId)!.add(callback);

    // Immediately emit current state if available
    const info = this.downloads.get(messageId);
    if (info) callback(info);

    return () => {
      this.listeners.get(messageId)?.delete(callback);
    };
  }

  private notify(messageId: string, info: DownloadInfo) {
    this.downloads.set(messageId, info);
    this.listeners.get(messageId)?.forEach(cb => cb(info));
  }

  /** Get current download state */
  getState(messageId: string): DownloadInfo {
    return this.downloads.get(messageId) || {
      state: 'idle',
      progress: 0,
      localUri: null,
    };
  }

  /** Check if a file is already cached */
  async checkCache(messageId: string, remoteUrl: string): Promise<boolean> {
    await this.ensureCacheDir();
    const localPath = this.getLocalPath(remoteUrl);
    const info = await getInfoAsync(localPath);
    if (info.exists) {
      this.notify(messageId, {
        state: 'downloaded',
        progress: 1,
        localUri: localPath,
      });
      return true;
    }
    return false;
  }

  /** Start downloading a media file */
  async startDownload(messageId: string, remoteUrl: string): Promise<string | null> {
    await this.ensureCacheDir();

    // Already downloaded?
    const localPath = this.getLocalPath(remoteUrl);
    const existing = await getInfoAsync(localPath);
    if (existing.exists) {
      this.notify(messageId, {
        state: 'downloaded',
        progress: 1,
        localUri: localPath,
      });
      return localPath;
    }

    // Already downloading?
    if (this.activeResumables.has(messageId)) {
      return null;
    }

    this.notify(messageId, {
      state: 'downloading',
      progress: 0,
      localUri: null,
    });

    const progressCallback = (data: DownloadProgressData) => {
      const progress = data.totalBytesExpectedToWrite > 0
        ? data.totalBytesWritten / data.totalBytesExpectedToWrite
        : 0;
      this.notify(messageId, {
        state: 'downloading',
        progress,
        localUri: null,
      });
    };

    const resumable = createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      progressCallback
    );

    this.activeResumables.set(messageId, resumable);

    try {
      const result = await resumable.downloadAsync();
      this.activeResumables.delete(messageId);

      if (result && result.uri) {
        this.notify(messageId, {
          state: 'downloaded',
          progress: 1,
          localUri: result.uri,
        });
        return result.uri;
      }

      this.notify(messageId, {
        state: 'error',
        progress: 0,
        localUri: null,
        error: 'Download returned empty result',
      });
      return null;
    } catch (error: any) {
      this.activeResumables.delete(messageId);
      if (error.message?.includes('cancel') || error.code === 'ERR_CANCELED') {
        this.notify(messageId, {
          state: 'idle',
          progress: 0,
          localUri: null,
        });
      } else {
        this.notify(messageId, {
          state: 'error',
          progress: 0,
          localUri: null,
          error: error.message,
        });
      }
      return null;
    }
  }

  /** Cancel an active download */
  async cancelDownload(messageId: string) {
    const resumable = this.activeResumables.get(messageId);
    if (resumable) {
      try {
        await resumable.pauseAsync();
      } catch (e) {
        // ignore
      }
      this.activeResumables.delete(messageId);
      this.notify(messageId, {
        state: 'idle',
        progress: 0,
        localUri: null,
      });
    }
  }

  /** Save downloaded media to device gallery */
  async saveToGallery(localUri: string): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }
      await MediaLibrary.saveToLibraryAsync(localUri);
      return true;
    } catch (e) {
      console.error('Save to gallery error:', e);
      return false;
    }
  }

  /** Share a downloaded file */
  async shareFile(localUri: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    }
  }

  /** Get file size in human-readable format */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /** Format duration from seconds */
  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default new MediaDownloadManager();

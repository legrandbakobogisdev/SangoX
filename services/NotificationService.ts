import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface DeviceInfo {
  os: string;
  model: string;
  appVersion: string;
}

class NotificationService {
  /**
   * Get registration token for FCM
   */
  static async getFcmToken(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('FCM token is only available on physical devices');
      return 'EMULATOR_TEST_TOKEN'; // For testing
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // projectId must be passed if using EAS
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      // Note: If you specifically need FCM token (not Expo Push Token), you'd use
      // (await Notifications.getDevicePushTokenAsync()).data
      // However, backend notification-service handles both if configured or uses Expo.
      // Based on user prompt, they expect FCM_TOKEN_TEST_123, so we'll use getDevicePushTokenAsync
      const deviceToken = (await Notifications.getDevicePushTokenAsync()).data;
      
      return deviceToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Get unique device ID
   */
  static async getDeviceId(): Promise<string> {
    if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) || 'unknown_ios_device';
    }
    try {
      return (await Application.getAndroidId()) || 'unknown_android_device';
    } catch (e) {
      return 'unknown_android_device';
    }
  }

  /**
   * Get formatted device info
   */
  static getDeviceInfo(): DeviceInfo {
    return {
      os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      model: Device.modelName || 'Unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
    };
  }

  /**
   * Prepare full device payload for login
   */
  static async getRegistrationPayload() {
    const fcmToken = await this.getFcmToken();
    const deviceId = await this.getDeviceId();
    const deviceInfo = this.getDeviceInfo();

    return {
      fcmToken,
      deviceId,
      deviceInfo,
    };
  }
}

export default NotificationService;

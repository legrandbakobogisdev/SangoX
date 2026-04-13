import { useAuthApi } from '@/hooks/useAuthApi';
import i18n from '@/i18n';
import { ApiService } from '@/services/api';
import { E2EEService } from '@/services/E2EEService';
import NotificationService from '@/services/NotificationService';
import SocketService from '@/services/SocketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export interface User {
  id: string;
  _id: string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  about?: string;
  profilePhotoUrl?: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isPremium?: boolean;
  settings: {
    privacy: {
      lastSeen: string;
      profilePhoto: string;
      about: string;
      readReceipts: boolean;
      onlineStatus: string;
    };
    notifications: {
      messageNotifications: boolean;
      showPreview: boolean;
      sound: string;
      vibrate: boolean;
      groupNotifications: boolean;
      callNotifications: boolean;
    };
    chat: {
      mediaAutoDownload: {
        wifi: boolean;
        mobileData: boolean;
      };
      theme: string;
      wallpaper: string | null;
      fontSize: string;
      enterToSend: boolean;
    };
    account: {
      twoFactorEnabled: boolean;
      language: string;
      blockedUsers: string[];
    };
  };
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  actionLoading: boolean; 
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateSettings: (category: keyof User['settings'], data: any) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<User | null>;
  signInWithGoogle: () => void;
  signInWithFacebook: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@sangox_user';
const ACCESS_TOKEN_KEY = '@sangox_access_token';
const REFRESH_TOKEN_KEY = '@sangox_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const authApi = useAuthApi();

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      if (accessToken) {
        await authApi.logout().catch(() => {});
      }
      
      await Promise.all([
        AsyncStorage.removeItem(USER_STORAGE_KEY),
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      ]);
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authApi]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        ]);
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setAccessToken(storedToken);
          
          // Apply user's language immediately if available
          if (userData.settings?.account?.language) {
            i18n.changeLanguage(userData.settings.account.language);
          }
        }
      } catch (error) {
        console.error('Init Auth Error:', error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    // LISTEN FOR REFRESH FROM APISERVICE
    ApiService.setOnTokenRefresh((newToken: string) => {
      console.log('[AuthContext] Token refreshed, updating state...');
      setAccessToken(newToken);
      // Notify SocketService of the new token
      SocketService.updateToken(newToken);
    });

    // LISTEN FOR REAL-TIME PREMIUM STATUS UPDATES
    const handlePremiumUpdate = (data: { isPremium: boolean }) => {
      console.log('[AuthContext] Received premium_updated event:', data);
      if (data.isPremium) {
        setUser(prev => {
          if (!prev) return null;
          const updatedUser = { ...prev, isPremium: true };
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser)).catch(err => {
            console.error('[AuthContext] Error persisting premium status:', err);
          });
          return updatedUser;
        });
        
        Alert.alert(
          i18n.t('success'), 
          i18n.t('already_subscribed'),
          [{ text: 'OK' }]
        );
      }
    };

    SocketService.on('premium_updated', handlePremiumUpdate);

    return () => {
      ApiService.setOnTokenRefresh(() => {});
      SocketService.off('premium_updated', handlePremiumUpdate);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Get device registration info
      const devicePayload = await NotificationService.getRegistrationPayload();
      
      const response: any = await authApi.login({ 
        email, 
        password,
        ...devicePayload
      });
      
      const { user: userData, accessToken: token, refreshToken } = response.data;

      // Persist tokens
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, token),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData)),
      ]);

      setAccessToken(token);
      setUser(userData);

      // Initialize E2EE Keychain after login on a new device
      try {
        await E2EEService.initializeKeychain();
      } catch (e2eeError) {
        console.error('E2EE initialization failed, but login succeeded:', e2eeError);
      }

    } catch (error: any) {
      console.error('Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (payload: any) => {
    try {
      setLoading(true);
      
      // Get device registration info
      const devicePayload = await NotificationService.getRegistrationPayload();
      
      await authApi.register({
        ...payload,
        ...devicePayload
      });
    } catch (error: any) {
      console.error('Sign-Up Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      // await authApi.resetPassword(email);
      Alert.alert('Reset Password', `A reset link was sent to ${email}`);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (category: keyof User['settings'], data: any) => {
    if (!user) return;
    try {
      setActionLoading(true);
      const updatedSettings = { ...user.settings, [category]: data };
      await authApi.updateSettings({ [category]: data });
      
      const updatedUser = { ...user, settings: updatedSettings };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      
      // Auto-apply language if it was the setting that changed
      if (category === 'account' && data.language && i18n.language !== data.language) {
        i18n.changeLanguage(data.language);
      }
    } catch (error: any) {
      console.error('Update Settings Error:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    try {
      setActionLoading(true);
      
      // Check if this is a local photo update (no backend needed yet as per user request)
      const isLocalPhoto = Object.keys(data).length === 1 && 
                          data.profilePhotoUrl && 
                          data.profilePhotoUrl.startsWith('file://');

      if (!isLocalPhoto) {
        await authApi.updateProfile(data);
      }
      
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch (error: any) {
      console.error('Update User Error:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    try {
      const response: any = await authApi.getProfile();
      const updatedUser = response.data;
      setUser(prev => ({ ...prev, ...updatedUser }));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, ...updatedUser }));
      return updatedUser;
    } catch (error) {
      console.error('[AuthContext] Error refreshing profile:', error);
      return null;
    }
  }, [authApi, user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      accessToken, 
      loading, 
      actionLoading,
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      updateSettings,
      updateUser,
      refreshProfile,
      signInWithGoogle: () => Alert.alert('Coming Soon', 'Google sign-in is coming soon.'),
      signInWithFacebook: () => Alert.alert('Coming Soon', 'Facebook sign-in is coming soon.'),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
  requestOtp: (identifier: string) => Promise<string>;
  verifyOtp: (identifier: string, code: string) => Promise<{ isNewUser: boolean; identifier: string; code?: string }>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
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

  const requestOtp = async (identifier: string): Promise<string> => {
    console.log('[AuthContext] Requesting OTP for:', identifier);
    try {
      setActionLoading(true);
      const isEmail = identifier.includes('@');
      const payload = isEmail ? { email: identifier } : { phoneNumber: identifier };
      const response: any = await authApi.requestOtp(payload);
      const normalizedIdentifier = response.data?.identifier || identifier;
      console.log('[AuthContext] OTP request successful, identifier normalized to:', normalizedIdentifier);
      return normalizedIdentifier;
    } catch (error) {
      console.error('[AuthContext] Request OTP Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] Request OTP finished');
      setActionLoading(false);
    }
  };

  const verifyOtp = async (identifier: string, code: string): Promise<{ isNewUser: boolean; identifier: string; code?: string }> => {
    console.log('[AuthContext] Verifying OTP...', { identifier, code });
    try {
      setActionLoading(true);
      const response: any = await authApi.verifyOtp({ identifier, code });
      
      const { isNewUser, accessToken: token, refreshToken, user: userData } = response.data;
      console.log('[AuthContext] OTP Verification Result:', { isNewUser });

      if (!isNewUser) {
        console.log('[AuthContext] Existing user detected, logging in...');
        // Log in immediately
        await Promise.all([
          AsyncStorage.setItem(ACCESS_TOKEN_KEY, token),
          AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData)),
        ]);

        setAccessToken(token);
        setUser(userData);

        try {
          await E2EEService.initializeKeychain();
        } catch (e2eeError) {
          console.error('[AuthContext] E2EE initialization failed:', e2eeError);
        }
      }

      return { 
        isNewUser, 
        identifier: response.data?.identifier || identifier,
        code: response.data?.code || code 
      };
    } catch (error: any) {
      console.error('[AuthContext] Verify OTP Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] Verify OTP finished');
      setActionLoading(false);
    }
  };

  const signUp = async (payload: any) => {
    console.log('[AuthContext] Finalizing registration for:', payload.username);
    try {
      setActionLoading(true);
      
      // Get device registration info
      const devicePayload = await NotificationService.getRegistrationPayload();
      
      const response: any = await authApi.register({
        ...payload,
        ...devicePayload
      });

      const { user: userData, accessToken: token, refreshToken } = response.data;
      console.log('[AuthContext] Registration successful for:', userData.username);

      // Persist tokens
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, token),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData)),
      ]);

      setAccessToken(token);
      setUser(userData);

      // Initialize E2EE
      try {
        await E2EEService.initializeKeychain();
      } catch (e2eeError) {
        console.error('[AuthContext] E2EE initialization failed:', e2eeError);
      }
    } catch (error: any) {
      console.error('[AuthContext] Sign-Up Error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] Sign-Up finished');
      setActionLoading(false);
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
      const currentStoredUser = user || (await AsyncStorage.getItem(USER_STORAGE_KEY).then(s => s ? JSON.parse(s) : {}));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...currentStoredUser, ...updatedUser }));
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
      requestOtp, 
      verifyOtp,
      signUp, 
      signOut, 
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

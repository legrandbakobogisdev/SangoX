import { ApiService } from '@/services/api';

export const useAuthApi = () => {
  // Auth & Lifecycle
  // Auth & Lifecycle (Passwordless OTP)
  const requestOtp = async (payload: { email?: string; phoneNumber?: string }) => 
    ApiService.post('/api/auth/request-otp', payload);
    
  const verifyOtp = async (payload: { identifier: string; code: string }) => 
    ApiService.post('/api/auth/verify-otp', payload);

  const register = async (payload: any) => ApiService.post('/api/auth/register', payload);
  const logout = async () => ApiService.post('/api/auth/logout');
  const refreshTokens = async (refreshToken: string) => ApiService.post('/api/auth/refresh', { refreshToken });

  // Profile & User Management
  const getProfile = async () => ApiService.get('/api/auth/profile');
  const updateProfile = async (payload: any) => ApiService.put('/api/auth/profile', payload);
  const changePassword = async (payload: any) => ApiService.put('/api/auth/change-password', payload);
  const getUserById = async (userId: string) => ApiService.get(`/api/auth/users/${userId}`);
  const updateLastSeen = async (userId: string) => ApiService.patch(`/api/auth/users/${userId}/last-seen`);

  // Settings
  const updateSettings = async (payload: any) => ApiService.put('/api/auth/settings', payload);
  const blockUser = async (targetUserId: string) => ApiService.post(`/api/auth/settings/block/${targetUserId}`);

  // Cryptographic Keys (E2EE)
  const uploadKeys = async (payload: any) => ApiService.post('/api/auth/keys', payload);
  const getKeysForUser = async (userId: string) => ApiService.get(`/api/auth/keys/${userId}`);
  const replenishKeys = async (payload: any) => ApiService.post('/api/auth/keys/replenish', payload);

  return {
    requestOtp,
    verifyOtp,
    register,
    logout,
    refreshTokens,
    getProfile,
    updateProfile,
    getUserById,
    updateLastSeen,
    updateSettings,
    blockUser,
    uploadKeys,
    getKeysForUser,
    replenishKeys,
  };
};


import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
const ACCESS_TOKEN_KEY = '@sangox_access_token';

interface RequestOptions extends RequestInit {
  data?: any;
}

export class ApiService {
  private static async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private static isRefreshing = false;
  private static onTokenRefresh: ((token: string) => void) | null = null;

  public static setOnTokenRefresh(callback: (token: string) => void) {
    this.onTokenRefresh = callback;
  }

  private static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.data) {
      if (options.data instanceof FormData) {
        config.body = options.data;
        // Let fetch auto-set the Content-Type with the correct boundary for multipart/form-data
        delete (headers as Record<string, string>)['Content-Type'];
      } else {
        config.body = JSON.stringify(options.data);
      }
    }

    console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`, options.data ? options.data : '');

    try {
      const response = await fetch(url, config);
      const result = await response.json();

      console.log(`[API Response] ${response.status} ${endpoint}`, result);

      if (!response.ok) {
        // Handle Token Expiry - but NOT for login/register endpoints
        const isAuthEndpoint = endpoint.includes('/login') || endpoint.includes('/register') || endpoint.includes('/refresh') || endpoint.includes('/verify-otp');
        
        if (response.status === 401 && !isAuthEndpoint && !this.isRefreshing) {
          // ... (keep refresh logic as is but maybe add logs)
          console.log('[API] Attempting token refresh...');
          this.isRefreshing = true;
          try {
            const refreshToken = await AsyncStorage.getItem('@sangox_refresh_token');
            if (refreshToken) {
               const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken }),
               });
               const refreshResult = await refreshResponse.json();
               if (refreshResponse.ok && refreshResult.data?.accessToken) {
                  console.log('[API] Token refresh succeeded');
                  const newAccessToken = refreshResult.data.accessToken;
                  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
                  if (refreshResult.data.refreshToken) {
                    await AsyncStorage.setItem('@sangox_refresh_token', refreshResult.data.refreshToken);
                  }
                  if (this.onTokenRefresh) {
                    this.onTokenRefresh(newAccessToken);
                  }
                  this.isRefreshing = false;
                  return this.request<T>(endpoint, options);
               } else {
                  console.error('[API] Refresh token response not ok:', refreshResponse.status);
                  this.isRefreshing = false;
                  throw new Error('Token refresh failed');
               }
            } else {
              this.isRefreshing = false;
              throw new Error('No refresh token available');
            }
          } catch (e) {
             console.error('[API] Refresh Token flow failed', e);
             this.isRefreshing = false;
             throw new Error('Token refresh failed');
          }
        }
        
        // Detailed error message
        const errorMessage = result.errors 
          ? `${result.message}: ${Object.values(result.errors).join(', ')}`
          : result.message || 'API request failed';
          
        console.error(`[API Error Output] ${endpoint}:`, errorMessage);
        throw new Error(errorMessage);
      }

      return result;
    } catch (error: any) {
      console.error(`[API Network Error] ${endpoint}:`, error.message);
      throw error;
    }
  }

  public static get<T>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public static post<T>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }

  public static put<T>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }

  public static patch<T>(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', data });
  }

  public static delete<T>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

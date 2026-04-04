import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import '../i18n'; // Initialize i18n

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AuthMiddleware({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // User is not signed in and not on an auth screen, redirect to login
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // User is signed in and on an auth screen, redirect to app
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Standard fonts, but we can add more premium ones here
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthMiddleware>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'ios_from_right', // Premium iOS-like slide animation
                animationDuration: 250,
                gestureEnabled: true, // Enable swipe-back gesture
                gestureDirection: 'horizontal',
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen 
                name="chat/[id]" 
                options={{ 
                  animation: 'ios_from_right', // Consistent Telegram-like animation
                  animationDuration: 300,
                  gestureEnabled: true,
                }} 
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        </AuthMiddleware>
      </AuthProvider>
    </ThemeProvider>
  );
}

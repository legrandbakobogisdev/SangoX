import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n';
import NotificationService from '@/services/NotificationService';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AuthMiddleware({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/onboarding');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF4D4D" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      NotificationService.setupNotificationCategories();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <AuthMiddleware>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'ios_from_right',
                  animationDuration: 250,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              >
                <Stack.Screen name="auth/onboarding" />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="profile" options={{ animation: 'ios_from_right' }} />
                <Stack.Screen name="profile/edit" options={{ animation: 'ios_from_right' }} />
                <Stack.Screen
                  name="chat/[id]"
                  options={{
                    animation: 'ios_from_right', // Consistent Telegram-like animation
                    animationDuration: 300,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="status/[id]"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    animationDuration: 200,
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="status/create"
                  options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    animationDuration: 250,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </GestureHandlerRootView>
          </AuthMiddleware>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

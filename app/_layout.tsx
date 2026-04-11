import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import NotificationActionService from '@/services/NotificationActionService';
import NotificationService from '@/services/NotificationService';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n';

let appState = 'active';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: appState !== 'active',
    shouldPlaySound: appState !== 'active',
    shouldSetBadge: true,
    shouldShowBanner: appState !== 'active',
    shouldShowList: true,
  }),
});

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

function RootLayoutContent() {
  const [loaded, error] = useFonts({});
  const appStateRef = useRef(appState);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      NotificationService.setupNotificationCategories();
    }
  }, [loaded, error]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (state: string) => {
    appState = state;
    appStateRef.current = state;
    console.log('[AppState]', state);
  };

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { actionIdentifier, notification } = response;
        const data = notification.request.content.data as any;

        console.log('[Notification Action]', actionIdentifier, data);

        if (actionIdentifier === 'reply') {
          const userText = (response as any).userText;
          if (userText && data?.conversationId) {
            try {
              // Send reply via notification action endpoint
              await NotificationActionService.handleReply(data.conversationId, userText, data.messageId);
              console.log('[Notification] Reply sent via notification action');
            } catch (error) {
              console.error('[Notification] Reply failed:', error);
            }
          }
        } else if (actionIdentifier === 'markAsRead') {
          if (data?.conversationId) {
            try {
              // Mark as read via notification action endpoint
              await NotificationActionService.handleMarkAsRead(data.conversationId, data.messageId);
              console.log('[Notification] Marked as read via notification action');
            } catch (error) {
              console.error('[Notification] Mark as read failed:', error);
            }
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const content = notification.request.content;
        
        if (!content.categoryIdentifier && content.data?.conversationId) {
          console.log('[Notification] Adding message category to notification');
          content.categoryIdentifier = 'message';
        }
      }
    );

    return () => subscription.remove();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
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
          animation: 'ios_from_right',
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
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <AuthMiddleware>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutContent />
              <StatusBar style="auto" />
            </GestureHandlerRootView>
          </AuthMiddleware>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

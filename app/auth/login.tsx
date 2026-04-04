import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { FaFacebook, FaGoogle } from 'react-icons/fa'; // Error: This is for Web.

// Use SVGs or local images for logos? I'll use simple views with icons from lucide briefly or generic colors.
// Actually, I'll use views with background colors for now.

export default function LoginScreen() {
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [isFacebookLoading, setFacebookLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Auth changes handled in _layout.tsx middleware
    } catch (error) {
       Alert.alert('Sign-In Failed', 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setFacebookLoading(true);
    try {
      await signInWithFacebook();
    } catch (error) {
       Alert.alert('Sign-In Failed', 'Facebook authentication failed.');
    } finally {
      setFacebookLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {/* Logo Placeholder */}
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>SangoX</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Connecting you faster.</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.instruction, { color: colors.textMuted }]}>
          Sign in to your account with your social apps
        </Text>

        <Pressable 
          style={[styles.socialBtn, { backgroundColor: '#4285F4' }]} 
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading || isFacebookLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View style={styles.iconPlaceholder} />
              <Text style={styles.socialText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Pressable 
          style={[styles.socialBtn, { backgroundColor: '#1877F2', marginTop: Spacing.md }]} 
          onPress={handleFacebookSignIn}
          disabled={isGoogleLoading || isFacebookLoading}
        >
          {isFacebookLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View style={styles.iconPlaceholder} />
              <Text style={styles.socialText}>Continue with Facebook</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            By signing in, you agree to our{' '}
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Terms of Use</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 50,
    color: 'white',
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: Spacing.md,
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  instruction: {
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  socialBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    marginRight: Spacing.md,
  },
  socialText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

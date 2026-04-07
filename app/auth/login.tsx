import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Chrome, Mail, Smartphone, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView
} from 'react-native';

const { width, height } = Dimensions.get('window');

type LoginView = 'WELCOME' | 'EMAIL';

export default function LoginScreen() {
  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [view, setView] = useState<LoginView>('WELCOME');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // We'll add password after email for security
  const [step, setStep] = useState(1); // 1: Email, 2: Password
  const [loading, setLoading] = useState(false);

  const handleNextStep = () => {
    if (step === 1 && email.includes('@')) {
      setStep(2);
    } else if (step === 2 && password) {
      handleSignIn();
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <ScrollView 
      style={styles.viewContainer} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.mediaContainer}>
        {/* Avatar Gallery (Inspired by Image 2) */}
        <View style={styles.avatarGrid}>
          <View style={[styles.avatarCircle, { top: 20, left: 20, backgroundColor: '#FF4D4D' }]}>
            <Star size={24} color="white" />
          </View>
          <View style={[styles.avatarCircle, { top: 0, right: 30, width: 90, height: 90, backgroundColor: '#222' }]} />
          <View style={[styles.avatarCircle, { bottom: 40, left: 10, width: 100, height: 100, backgroundColor: '#333' }]} />
          <View style={[styles.avatarCircle, { bottom: 0, right: 20, width: 70, height: 70, backgroundColor: '#444' }]} />
          <Star size={24} color="#F2E3BC" style={{ position: 'absolute', top: 50, left: -10 }} />
        </View>
      </View>

      <View style={styles.glassContainer}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>Get started</Text>
          <Text style={styles.welcomeSubtitle}>
            Secure, fast, and encrypted messaging. Your privacy is our priority.
          </Text>

          <View style={styles.socialButtons}>
            <Pressable
              style={[styles.socialButton, { backgroundColor: '#FFFFFF' }]}
              onPress={() => signInWithGoogle()}
            >
              <Chrome size={20} color="#000" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, { color: '#000' }]}>Sign up with google</Text>
            </Pressable>

            <Pressable
              style={[styles.socialButton, { backgroundColor: '#1A1A1A' }]}
              onPress={() => router.push('/auth/register')}
            >
              <Mail size={20} color="#FFF" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, { color: '#FFF' }]}>Sign up with email</Text>
            </Pressable>

            <Pressable
              style={[styles.socialButton, { backgroundColor: '#1A1A1A' }]}
              onPress={() => { }}
            >
              <Smartphone size={20} color="#FFF" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, { color: '#FFF' }]}>Sign up with phone number</Text>
            </Pressable>
          </View>

          <Pressable style={styles.loginLink} onPress={() => setView('EMAIL')}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={{ color: '#F2E3BC', fontWeight: '700' }}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  const renderEmailView = () => (
    <ScrollView 
      style={styles.viewContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={{ paddingHorizontal: 24 }}>
        <Pressable style={styles.backButton} onPress={() => {
          if (step === 2) setStep(1);
          else setView('WELCOME');
        }}>
          <ArrowLeft size={32} color="white" />
        </Pressable>

        <View style={styles.emailHeader}>
          <Text style={styles.emailTitle}>
            {step === 1 ? 'Continue with email' : 'Enter your password'}
          </Text>
          <Text style={styles.emailSubtitle}>
            {step === 1 ? 'Sign in or sign up with your email.' : `Enter password for ${email}`}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{step === 1 ? 'Email' : 'Password'}</Text>
          <View style={[
            styles.emailInputContainer,
            { borderColor: email ? '#F2E3BC66' : '#222' }
          ]}>
            <TextInput
              style={styles.emailInput}
              placeholder={step === 1 ? "Enter Address" : "Enter Password"}
              placeholderTextColor="#555"
              value={step === 1 ? email : password}
              onChangeText={step === 1 ? setEmail : setPassword}
              keyboardType={step === 1 ? "email-address" : "default"}
              autoCapitalize="none"
              secureTextEntry={step === 2}
              autoFocus
            />
          </View>

          <Pressable
            style={[
              styles.continueButton,
              { backgroundColor: (step === 1 ? email.includes('@') : password.length > 5) ? '#F2E3BC' : '#333' }
            ]}
            onPress={handleNextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {view === 'WELCOME' ? renderWelcome() : renderEmailView()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
  },
  glassContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    flex: 1,
    borderWidth: 1,
    borderColor: '#222',
  },
  mediaContainer: {
    height: height < 700 ? 180 : height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGrid: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  avatarCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: 'white',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#888',
    lineHeight: 22,
    marginBottom: 40,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#888',
    fontSize: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emailHeader: {
    marginBottom: 40,
  },
  emailTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  emailSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  inputSection: {
    flex: 1,
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  emailInputContainer: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#F2E3BC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  emailInput: {
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});





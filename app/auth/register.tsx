import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Mail, Smartphone, Smile } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const { height } = Dimensions.get('window');

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const identifier = params.identifier as string;
  const code = params.code as string;

  useEffect(() => {
    if (!identifier || !code) {
      router.replace('/auth/login');
    }
  }, [identifier, code]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: identifier?.includes('@') ? '' : identifier,
    email: identifier?.includes('@') ? identifier : '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName) {
        Alert.alert('Error', 'First name and Last name are required.');
        return;
      }
      setStep(2);
    } else {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    const { username } = formData;
    if (!username) {
      Alert.alert('Error', 'Username is required.');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        ...formData,
        email: identifier?.includes('@') ? identifier : formData.email,
        phoneNumber: !identifier?.includes('@') ? identifier : formData.phoneNumber,
        code,
      });
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : router.back()}>
            <ArrowLeft size={32} color="white" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1 ? 'Hello there!' : 'Almost done'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Let\'s start with the basics' : 'Complete your profile'}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color="#555" style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. John"
                      placeholderTextColor="#555"
                      value={formData.firstName}
                      onChangeText={(v) => handleChange('firstName', v)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color="#555" style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Doe"
                      placeholderTextColor="#555"
                      value={formData.lastName}
                      onChangeText={(v) => handleChange('lastName', v)}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <View style={styles.inputContainer}>
                    <Smile size={20} color="#555" style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Pick a unique username"
                      placeholderTextColor="#555"
                      value={formData.username}
                      onChangeText={(v) => handleChange('username', v)}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {!identifier?.includes('@') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address (Recommended)</Text>
                    <View style={styles.inputContainer}>
                      <Mail size={20} color="#555" style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor="#555"
                        value={formData.email}
                        onChangeText={(v) => handleChange('email', v)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                {identifier?.includes('@') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <Smartphone size={20} color="#555" style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder="+237 ..."
                        placeholderTextColor="#555"
                        value={formData.phoneNumber}
                        onChangeText={(v) => handleChange('phoneNumber', v)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                )}
              </>
            )}

            <Pressable
              style={[styles.mainBtn, { backgroundColor: '#F2E3BC' }]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.mainBtnText}>
                  {step === 1 ? 'Continue' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By joining, you agree to our <Text style={styles.link}>Terms</Text> and <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: -10,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
  inputContainer: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  mainBtn: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  mainBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 30,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#888',
    textDecorationLine: 'underline',
  },
});



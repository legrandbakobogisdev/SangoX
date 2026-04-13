import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Linking, Dimensions, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { 
  Zap, 
  Heart, 
  Eye, 
  Mail, 
  RotateCcw, 
  Puzzle, 
  X, 
  CheckCircle2,
  Sparkles
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { SubscriptionService, SubscriptionStatus } from '@/services/SubscriptionService';
import { PaymentService } from '@/services/PaymentService';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const FeatureCard = ({ title, desc, status, icon: Icon, color }: any) => {
  return (
    <View style={[styles.featureCard, { backgroundColor: 'rgba(28, 28, 30, 0.8)' }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={styles.featureInfo}>
        <Text style={styles.featureTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.featureDesc} numberOfLines={2}>{desc}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData] = await Promise.all([
        SubscriptionService.getStatus(),
        refreshProfile()
      ]);
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      const response = await PaymentService.initializePayment();
      if (response?.transactionUrl) {
         const supported = await Linking.canOpenURL(response.transactionUrl);
         if (supported) {
           await Linking.openURL(response.transactionUrl);
         } else {
           Alert.alert('Error', 'Unable to open payment link');
         }
      } else {
        Alert.alert('Error', 'Failed to initialize payment');
      }
    } catch (error: any) {
      Alert.alert(t('subscription_failed'), error.message || 'An error occurred');
    } finally {
      setSubscribing(false);
    }
  };

  const features = [
    {
      title: 'Boosts',
      desc: 'Obtenez jusqu\'à 8x plus de visibilité',
      status: '1 toutes les 6h',
      icon: Zap,
      color: '#A855F7'
    },
    {
      title: 'Réactions',
      desc: 'Réagissez à plus de profils',
      status: 'Illimité',
      icon: Heart,
      color: '#EC4899'
    },
    {
      title: 'Défloutage',
      desc: 'Voyez qui a réagi à votre profil',
      status: 'Illimité',
      icon: Eye,
      color: '#3B82F6'
    },
    {
      title: 'Coup de foudre',
      desc: 'Envoyez des messages directs',
      status: '10/jour',
      icon: Mail,
      color: '#F59E0B'
    },
    {
      title: 'Retours',
      desc: 'Annulez votre dernier swipe',
      status: '10/jour',
      icon: RotateCcw,
      color: '#10B981'
    },
    {
      title: 'Compatibilité',
      desc: 'Vérifiez vos affinités',
      status: '10/jour',
      icon: Puzzle,
      color: '#6366F1'
    }
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  const isPremium = (status?.plan === 'premium' && status?.status === 'active') || user?.isPremium;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a0b2e', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Starry background effect - simple simulation with sparkles */}
      <View style={StyleSheet.absoluteFill}>
        <Sparkles size={12} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', top: 100, left: 50 }} />
        <Sparkles size={10} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', top: 250, right: 80 }} />
        <Sparkles size={8} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', bottom: 200, left: 120 }} />
      </View>

      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={styles.closeButton}
        >
          <X color="rgba(255,255,255,0.6)" size={24} />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <LottieView
            source={require('@/assets/lottie/Disabled premium.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.mainTitle}>Enjoy SangoX Ultimate</Text>
        </View>

        <View style={styles.grid}>
          {features.map((item, index) => (
            <FeatureCard key={index} {...item} />
          ))}
        </View>

        <View style={styles.bottomSection}>
          <Pressable 
            style={({ pressed }) => [
              styles.continueButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
            onPress={handleSubscribe}
            disabled={subscribing || isPremium}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {subscribing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.continueText}>
                  {isPremium ? 'Premium Actif' : 'Continuer'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
          <Text style={styles.priceInfo}>1000 FCFA/mois. Annulable à tout moment</Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
    zIndex: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 50) / 2,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'space-between',
    minHeight: 150,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 14,
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  priceInfo: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 12,
  },
});


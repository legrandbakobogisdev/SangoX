import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Crown, CheckCircle2, Zap, ShieldCheck, Image as ImageIcon, Sparkles, ArrowRight, History, CreditCard, XCircle, Clock, ChevronRight, User, Users } from 'lucide-react-native';
import { SubscriptionService, SubscriptionStatus } from '@/services/SubscriptionService';
import { PaymentService } from '@/services/PaymentService';
import CustomHeader from '@/components/CustomHeader';

const FeatureItem = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.featureItem}>
      <CheckCircle2 size={16} color={colors.primary} />
      <Text style={[styles.featureText, { color: 'rgba(255,255,255,0.7)' }]}>{title}</Text>
    </View>
  );
};

const PlanCard = ({ title, icon: Icon, color, selected, onPress, subtitle }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      style={[styles.planCard, { backgroundColor: '#1C1C1E' }]}
      onPress={onPress}
    >
      <View style={[styles.planIconBox, { backgroundColor: color }]}>
        <Icon size={20} color="white" />
      </View>
      <View style={styles.planInfo}>
        <Text style={[styles.planTitle, { color: 'white' }]}>{title}</Text>
        <Text style={[styles.planSubtitle, { color: 'rgba(255,255,255,0.5)' }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
    </Pressable>
  );
};

const TransactionItem = ({ item }: { item: any }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={16} color="#1DB954" />;
      case 'failed': return <XCircle size={16} color="#FF4D4D" />;
      default: return <Clock size={16} color="#BFBFBF" />;
    }
  };

  return (
    <View style={[styles.transactionCard, { backgroundColor: '#1C1C1E' }]}>
      <View style={[styles.transactionIcon, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
        <CreditCard size={18} color="#FFD700" />
      </View>
      <View style={styles.transactionMain}>
        <Text style={[styles.transactionTitle, { color: 'white' }]}>Premium Monthly</Text>
        <Text style={[styles.transactionDate, { color: 'rgba(255,255,255,0.4)' }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, { color: 'white' }]}>{item.amount} {item.currency}</Text>
        <View style={styles.statusRow}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: 'rgba(255,255,255,0.4)' }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
};

export default function SubscriptionScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, historyData] = await Promise.all([
        SubscriptionService.getStatus(),
        PaymentService.getHistory()
      ]);
      setStatus(statusData);
      setHistory(historyData);
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  const isPremium = (status?.plan === 'premium' && status?.status === 'active') || user?.isPremium;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
       <CustomHeader 
         title={t('subscription')} 
         containerStyle={{ backgroundColor: '#000', borderBottomColor: 'transparent' }}
         titleStyle={{ color: 'white' }} 
       />
       
       <ScrollView 
         contentContainerStyle={styles.scrollContent} 
         showsVerticalScrollIndicator={false}
       >
          <Text style={[styles.mainHeading, { color: 'white' }]}>
            {isPremium ? t('your_subscription') : t('subscribe_premium')}
          </Text>
          <Text style={styles.subHeading}>
             {isPremium 
               ? t('premium_welcome_msg') 
               : t('premium_promo_msg')}
          </Text>

          {/* Current / Targeted Plan Card */}
          <View style={[styles.heroCard, { backgroundColor: '#1C1C1E' }]}>
            <View style={styles.heroTop}>
               <View style={styles.crownCircle}>
                 <Crown size={24} color="white" />
               </View>
               <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{isPremium ? t('active') : "Current Plan"}</Text>
               </View>
            </View>

            <Text style={[styles.planLabel, { color: 'white' }]}>
               {isPremium ? "Premium Monthly" : "Individual Plan"}
            </Text>

            <View style={styles.featuresList}>
               <FeatureItem title="Unlimited End-to-End Chat" />
               <FeatureItem title="Original Media Quality" />
               <FeatureItem title="Exclusive Premium Badge" />
            </View>

            <View style={styles.priceRow}>
               <Text style={[styles.priceText, { color: 'white' }]}>
                  {isPremium ? "1 000 FCFA" : "1 000 FCFA"}
                  <Text style={styles.pricePeriod}>/ month</Text>
               </Text>
               {isPremium && (
                 <Pressable onPress={() => Alert.alert('Coming Soon', 'Manage your subscription anytime.')}>
                   <Text style={[styles.manageLink, { color: 'rgba(255,255,255,0.5)' }]}>Manage Plan {'>'}</Text>
                 </Pressable>
               )}
            </View>

            {!isPremium && (
              <Pressable 
                style={({ pressed }) => [
                  styles.ctaButton, 
                  { backgroundColor: '#1DB954' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.ctaText}>Get Premium</Text>
                )}
              </Pressable>
            )}
          </View>

          {!isPremium && (
            <View style={styles.availableSection}>
              <Text style={[styles.sectionTitle, { color: 'white' }]}>Available Plan</Text>
              
              <PlanCard 
                title="Basic premium"
                subtitle="1 Premium account"
                color="#F59E0B"
                icon={User}
              />
              <PlanCard 
                title="Premium Family"
                subtitle="Up to 6 accounts"
                color="#10B981"
                icon={Users}
              />
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={[styles.sectionTitle, { color: 'white' }]}>{t('payment_history')}</Text>
              {history.map((item) => <TransactionItem key={item._id} item={item} />)}
            </View>
          )}

          <View style={{ height: 60 }} />
       </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  
  mainHeading: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subHeading: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20, marginBottom: 28 },
  
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  crownCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentBadgeText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  
  planLabel: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  featuresList: { marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 14, marginLeft: 10 },
  
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  priceText: { fontSize: 18, fontWeight: '700' },
  pricePeriod: { fontSize: 13, fontWeight: '400', opacity: 0.6 },
  manageLink: { fontSize: 13, fontWeight: '600' },
  
  ctaButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: { color: 'white', fontSize: 16, fontWeight: '800' },
  
  availableSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  planIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  planSubtitle: { fontSize: 12 },
  
  historySection: { marginBottom: 32 },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  transactionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionMain: { flex: 1 },
  transactionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  transactionDate: { fontSize: 12 },
  transactionAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 11, marginLeft: 4, textTransform: 'capitalize' },
});

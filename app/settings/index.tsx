import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  ChevronRight, 
  Shield, 
  Lock, 
  Eye, 
  Palette, 
  Trash2, 
  LogOut, 
  ArrowRightCircle,
  LayoutGrid,
  Globe,
  Crown,
  Zap,
  Sparkles
} from 'lucide-react-native';
import { SubscriptionService, SubscriptionStatus } from '@/services/SubscriptionService';
import { useState, useEffect } from 'react';

const SectionHeader = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>
  );
};

const SettingRow = ({ icon, label, description, onPress, destructive }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.row, 
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7 }
      ]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: destructive ? 'rgba(220,53,69,0.1)' : colors.secondary }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: destructive ? '#DC3545' : colors.text }]}>{label}</Text>
        {description && <Text style={[styles.rowDescription, { color: colors.textMuted }]}>{description}</Text>}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
};

import CustomHeader from '@/components/CustomHeader';

export default function SettingsScreen() {
  const { colors, theme, ...themeContext } = useTheme();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const status = await SubscriptionService.getStatus();
        setSubscription(status);
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      }
    };

    if (user) {
      fetchSubscription();
    }
  }, [user]);

  if (!user) return null;

  const isPremium = (subscription?.plan === 'premium' && subscription?.status === 'active') || user?.isPremium;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Wallpaper */}
      {themeContext.wallpaper && (
        <Image 
          source={{ uri: themeContext.wallpaper }} 
          style={StyleSheet.absoluteFill} 
        />
      )}
      <CustomHeader title="Settings" backText="Close" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Pressable 
          onPress={() => router.push('/profile')}
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.profileMain}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
               {user.profilePhotoUrl ? (
                 <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
               ) : (
                 <User size={32} color="white" />
               )}
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.name, { color: colors.text }]}>{user.fullName || user.username}</Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
            </View>
          </View>
        </Pressable>

        {/* Premium Banner (for non-premium users) */}
        {!isPremium && (
          <Pressable 
            onPress={() => router.push('/settings/subscription')}
            style={styles.premiumBanner}
          >
            <View style={styles.premiumBannerContent}>
              <View style={styles.premiumIconBox}>
                <Crown size={24} color="#000" />
              </View>
              <View style={styles.premiumInfo}>
                <Text style={styles.premiumTitle}>{t('upgrade_banner_title')}</Text>
                <Text style={styles.premiumSubtitle}>{t('upgrade_banner_desc')}</Text>
              </View>
              <ArrowRightCircle size={22} color="#000" />
            </View>
          </Pressable>
        )}

        {/* Insights */}
        <Pressable style={[styles.insightsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.insightsHeader}>
             <View style={styles.insightsTitleRow}>
               <LayoutGrid size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
               <Text style={[styles.insightsTitle, { color: colors.text }]}>Your SangoX Insights</Text>
             </View>
             <ChevronRight size={18} color={colors.textMuted} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>128</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Chats</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>24.5K</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Messages</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>3</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Stories</Text>
            </View>
          </View>
        </Pressable>

        {/* Account & Identity */}
        <SectionHeader title={t('settings_account_section')} />
        <SettingRow 
          label={t('profile')} 
          description={t('profile_desc')}
          icon={<User size={20} color={colors.text} />}
          onPress={() => router.push('/profile')}
        />
        <SettingRow 
          label={t('account_security')} 
          description={t('security_desc')}
          icon={<Lock size={20} color={colors.text} />}
          onPress={() => router.push('/settings/account')}
        />
        {isPremium && (
          <SettingRow 
            label={t('premium')} 
            description={t('subscription_desc')}
            icon={<Crown size={20} color="#FFD700" />}
            onPress={() => router.push('/settings/subscription')}
          />
        )}

        {/* Privacy */}
        <SectionHeader title={t('settings_privacy_section')} />
        <SettingRow 
          label={t('privacy')} 
          description={t('privacy_desc')}
          icon={<Eye size={20} color={colors.text} />}
          onPress={() => router.push('/settings/privacy')}
        />

        {/* Application Settings */}
        <SectionHeader title={t('settings_app_section')} />
        <SettingRow 
          label={t('appearance')} 
          description={t('appearance_desc')}
          icon={<Palette size={20} color={colors.text} />}
          onPress={() => router.push('/settings/chat')}
        />
        <SettingRow 
          label={t('language')} 
          description={t('language_desc')}
          icon={<Globe size={20} color={colors.text} />}
          onPress={() => router.push('/settings/language')}
        />

        {/* Additional Settings */}
        <SectionHeader title={t('settings_management_section')} />
        <SettingRow 
          label={t('delete_account')} 
          description={t('delete_account_desc')}
          icon={<Trash2 size={20} color="#DC3545" />}
          destructive
          onPress={() => {}}
        />
        <SettingRow 
          label={t('logout')} 
          description={t('logout_desc')}
          icon={<LogOut size={20} color="#DC3545" />}
          destructive
          onPress={signOut}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  
  profileCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  profileMain: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: 48, height: 48 },
  profileMeta: { marginLeft: 12, flex: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  profileChevron: { paddingLeft: 8 },

  insightsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  insightsTitleRow: { flexDirection: 'row', alignItems: 'center' },
  insightsTitle: { fontSize: 15, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'flex-start' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 4, letterSpacing: 0.3 },

  sectionHeader: { fontSize: 13, fontWeight: '700', marginBottom: 12, marginTop: 16, paddingLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowDescription: { fontSize: 12, marginTop: 2 },
  
  premiumBanner: {
    backgroundColor: '#FFD700', 
    borderRadius: 24,
    marginBottom: 28,
    overflow: 'hidden',
    padding: 18,
    // Higher elevation for premium feel
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  premiumSubtitle: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});

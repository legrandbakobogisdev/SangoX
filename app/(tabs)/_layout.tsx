import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { StyleSheet, View, Text, Pressable, Switch, Image, Platform } from 'react-native';
import { Home, User, Sun, Moon, LogOut, Search, Plus, MessageCircle, ChevronRight, Shield, Bell, CircleHelp, Globe, Crown, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ContactsModal } from '@/components/contacts/ContactsModal';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionStatus } from '@/services/SubscriptionService';
import { useState, useEffect } from 'react';

// Premium Custom Drawer Content
function CustomDrawerContent(props: any) {
  const { colors, theme, toggleTheme } = useTheme();
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

  return (
    <View style={[styles.drawerRoot, { backgroundColor: colors.background }]}>
      {/* Header with gradient-like accent */}
      <View style={[styles.drawerHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarRow}>
          {user?.profilePhotoUrl ? (
            <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarBox}>
              <User size={32} color="#000" />
            </View>
          )}
          <View style={styles.onlineDot} />
        </View>
        <Text style={styles.drawerName}>{user?.fullName || user?.firstName || 'User'}</Text>
        <Text style={styles.drawerHandle}>@{user?.username || 'user'}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>128</Text>
            <Text style={styles.statLabel}>{t('chats_count')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>{t('groups')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>{t('stories_count')}</Text>
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.drawerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navSection}>
          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/(tabs)')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.primary + '15' }]}>
              <MessageCircle size={18} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('discussions')}</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/settings/subscription')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FFD700' + '15' }]}>
              {subscription?.plan === 'premium' ? (
                <Crown size={18} color="#FFD700" />
              ) : (
                <CreditCard size={18} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{t('your_subscription')}</Text>
              <View style={[styles.badge, { backgroundColor: subscription?.plan === 'premium' ? '#FFD700' : colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: subscription?.plan === 'premium' ? '#000' : colors.primary }]}>
                  {subscription?.plan === 'premium' ? t('premium') : t('subscribe')}
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.primary + '15' }]}>
              <User size={18} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('settings')}</Text>
          </Pressable>
        </View>

        {/* Shortcuts Section */}
        <View style={[styles.menuSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('shortcuts')}</Text>
          

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            android_ripple={{ color: colors.border }}
            onPress={() => router.push('/settings/privacy')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
              <Shield size={18} color={colors.text} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('privacy')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            android_ripple={{ color: colors.border }}
            onPress={() => router.push('/settings/notifications')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
              <Bell size={18} color={colors.text} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('notifications')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            android_ripple={{ color: colors.border }}
            onPress={() => router.push('/settings/chat')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
              <MessageCircle size={18} color={colors.text} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('theme')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
            android_ripple={{ color: colors.border }}
            onPress={() => router.push('/settings/help')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
              <CircleHelp size={18} color={colors.text} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('help')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </DrawerContentScrollView>

      {/* Footer: Theme Toggle + Logout */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
        <View style={styles.themeRow}>
          <View style={styles.themeIconLabel}>
            {theme === 'dark' ? <Moon size={18} color={colors.text} /> : <Sun size={18} color={colors.text} />}
            <Text style={[styles.themeLabel, { color: colors.text }]}>
              {theme === 'dark' ? t('dark_mode') : t('light_mode')}
            </Text>
          </View>
          <Switch 
            value={theme === 'dark'} 
            onValueChange={toggleTheme}
            trackColor={{ false: '#E0E0E0', true: colors.primary }}
            thumbColor={'#fff'}
            style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : {}}
          />
        </View>
        
        <Pressable 
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          android_ripple={{ color: 'rgba(220,53,69,0.1)' }}
          onPress={signOut}
        >
          <LogOut size={18} color={'#DC3545'} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}


export default function DrawerLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [contactsVisible, setContactsVisible] = React.useState(false);

  return (
    <>
      <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
        headerTitle: 'SangoX',
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
        drawerActiveBackgroundColor: `${colors.primary}20`, // 12% opacity
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: '600',
          marginLeft: -8,
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 8,
          paddingVertical: 2,
        },
        drawerStyle: {
          width: 300,
          backgroundColor: colors.background,
        },
        swipeEdgeWidth: 80,
        swipeMinDistance: 20,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: t('chats'),
          drawerItemStyle: { display: 'none' }, // Manual handle in CustomDrawerContent
          drawerIcon: ({ color }) => <MessageCircle size={22} color={color} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 12 }}>
              <Pressable 
                style={({ pressed }) => [{ padding: 8, borderRadius: 20, marginRight: 4 }, pressed && { opacity: 0.6 }]}
                android_ripple={{ color: colors.border, radius: 20 }}
              >
                <Search size={22} color={colors.text} />
              </Pressable>
              <Pressable 
                style={({ pressed }) => [{ padding: 8, borderRadius: 20 }, pressed && { opacity: 0.6 }]}
                android_ripple={{ color: colors.border, radius: 20 }}
                onPress={() => setContactsVisible(true)}
              >
                <Plus size={22} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Drawer.Screen
         name="placeholder"
         options={{
           drawerItemStyle: { display: 'none' },
           headerShown: false,
         }}
      />
      </Drawer>
      <ContactsModal 
        visible={contactsVisible} 
        onClose={() => setContactsVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  avatarRow: {
    position: 'relative',
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#28A745',
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  drawerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  drawerHandle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.55)',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  drawerScrollContent: {
    paddingTop: 8,
  },
  navSection: {
    flex: 1,
  },
  menuSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginLeft: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    color: '#DC3545',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

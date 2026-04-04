import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Settings, LogOut, ChevronRight, User, Bell, Shield, CircleHelp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { colors } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { icon: <User size={22} color={colors.text} />, label: 'Edit Profile', value: user?.displayName || '' },
    { icon: <Bell size={22} color={colors.text} />, label: 'Notifications', value: 'On' },
    { icon: <Shield size={22} color={colors.text} />, label: 'Privacy', value: '' },
    { icon: <CircleHelp size={22} color={colors.text} />, label: 'Help', value: '' },
    { icon: <Settings size={22} color={colors.text} />, label: 'Settings', value: '' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.header}>
          <View style={[styles.avatarBox, { backgroundColor: colors.secondary }]}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <User size={60} color={colors.textMuted} />
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.displayName || 'Guest User'}</Text>
          <Text style={[styles.status, { color: colors.textMuted }]}>{user?.email || '@guest'}</Text>
        </View>

        <View style={styles.section}>
          {menuItems.map((item, index) => (
            <Pressable key={index} style={[styles.menuItem, { borderBottomColor: colors.border }]}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                  {item.icon}
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.value ? <Text style={[styles.menuValue, { color: colors.textMuted }]}>{item.value}</Text> : null}
                <ChevronRight size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={22} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.xl,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
});

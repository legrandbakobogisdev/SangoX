import React from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth, User as UserType } from '@/context/AuthContext';
import { Key, FileText, Trash2, ChevronRight, User, Globe } from 'lucide-react-native';
import SettingsTemplate from '@/components/SettingsTemplate';

const SettingsItem = ({ label, icon, value, destructive, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.secondary + '40' }]} 
      onPress={onPress}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text style={[styles.label, { color: destructive ? '#DC3545' : colors.text }]}>{label}</Text>
      <View style={styles.rightContent}>
        {value && <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>}
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
};

export default function AccountSettings() {
  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();
  const router = useRouter();
  
  if (!user) return null;
  const a = user.settings.account;

  const languageOptions = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' }
  ];

  const navigateToChoice = () => {
    router.push({
      pathname: '/settings/choice',
      params: {
        category: 'account',
        settingKey: 'language',
        title: 'App Language',
        description: 'Choose your preferred language for the SangoX interface.',
        options: JSON.stringify(languageOptions)
      }
    });
  };
  
  return (
    <SettingsTemplate title="Account">
      <View style={styles.profileSection}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <User size={30} color="white" />
        </View>
        <View style={styles.profileInfo}>
           <Text style={[styles.profileName, { color: colors.text }]}>{user.fullName || user.username}</Text>
           <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SettingsItem 
          label="App Language" 
          icon={<Globe size={20} color={colors.textMuted} />} 
          value={languageOptions.find(o => o.value === a.language)?.label || a.language}
          onPress={navigateToChoice}
        />
        <SettingsItem 
          label="Change Password" 
          icon={<Key size={20} color={colors.textMuted} />} 
        />
        <SettingsItem 
          label="Request Account Info" 
          icon={<FileText size={20} color={colors.textMuted} />} 
        />
        <SettingsItem 
          label="Delete Account" 
          icon={<Trash2 size={20} color="#DC3545" />} 
          destructive 
        />
      </View>
    </SettingsTemplate>
  );
}

const styles = StyleSheet.create({
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, backgroundColor: 'rgba(0,0,0,0.03)', padding: 16, borderRadius: 16 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { marginLeft: 16 },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileEmail: { fontSize: 14 },
  section: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderRadius: 10, paddingHorizontal: 8 },
  iconBox: { marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  rightContent: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 15, marginRight: 8, fontWeight: '400' },
});

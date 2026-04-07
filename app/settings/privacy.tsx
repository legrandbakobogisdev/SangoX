import React from 'react';
import { StyleSheet, View, Text, Switch, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Shield, Eye, Lock, Globe, User, CircleHelp, MessageCircle, ChevronRight } from 'lucide-react-native';
import SettingsTemplate from '@/components/SettingsTemplate';

const SettingsItem = ({ label, icon, value, isSwitch, onToggle, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.rightContent}>
        {value && !isSwitch && <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>}
        {isSwitch ? (
          <Switch value={value} onValueChange={onToggle} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
};



export default function PrivacySettings() {
  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();
  const router = useRouter();
  
  if (!user) return null;
  const p = user.settings.privacy;

  const navigateToChoice = (key: string, title: string, options: { label: string; value: string }[], description: string) => {
    router.push({
      pathname: '/settings/choice',
      params: {
        category: 'privacy',
        settingKey: key,
        title,
        description,
        options: JSON.stringify(options)
      }
    });
  };

  const privacyOptions = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'My Contacts', value: 'contacts' },
    { label: 'Nobody', value: 'nobody' }
  ];

  return (
    <SettingsTemplate title="Privacy">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>WHO CAN SEE MY INFO</Text>
        <SettingsItem 
          label="Last Seen & Online" 
          value={privacyOptions.find(o => o.value === p.lastSeen)?.label || p.lastSeen}
          icon={<Eye size={20} color={colors.textMuted} />} 
          onPress={() => navigateToChoice('lastSeen', 'Last Seen', privacyOptions, 'Control who can see when you were last online.')}
        />
        <SettingsItem 
          label="Profile Photo" 
          value={privacyOptions.find(o => o.value === p.profilePhoto)?.label || p.profilePhoto}
          icon={<User size={20} color={colors.textMuted} />} 
          onPress={() => navigateToChoice('profilePhoto', 'Profile Photo', privacyOptions, 'Choose who can see your profile picture.')}
        />
        <SettingsItem 
          label="About" 
          value={privacyOptions.find(o => o.value === p.about)?.label || p.about}
          icon={<CircleHelp size={20} color={colors.textMuted} />} 
          onPress={() => navigateToChoice('about', 'About', privacyOptions, 'Select who can see your "About" info.')}
        />
        <SettingsItem 
          label="Online Status" 
          value={privacyOptions.find(o => o.value === p.onlineStatus)?.label || p.onlineStatus}
          icon={<MessageCircle size={20} color={colors.textMuted} />} 
          onPress={() => navigateToChoice('onlineStatus', 'Online Status', privacyOptions, 'Decide who can see when you are currently online.')}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>SECURITY</Text>
        <SettingsItem 
          label="End-to-End Encryption" 
          icon={<Shield size={20} color="#28A745" />} 
        />
        <SettingsItem 
          label="Read Receipts" 
          icon={<Globe size={20} color={colors.textMuted} />} 
          isSwitch 
          value={p.readReceipts} 
          onToggle={(val: boolean) => updateSettings('privacy', { ...p, readReceipts: val })}
        />
      </View>
    </SettingsTemplate>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 16, opacity: 0.8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconBox: { marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  rightContent: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 15, marginRight: 8, fontWeight: '400' },
});

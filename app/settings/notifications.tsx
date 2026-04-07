import React from 'react';
import { StyleSheet, View, Text, Switch, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Bell, MessageSquare, Phone, ChevronRight } from 'lucide-react-native';
import SettingsTemplate from '@/components/SettingsTemplate';

const SettingsItem = ({ label, icon, value, isSwitch, onToggle }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.item}>
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

export default function NotificationSettings() {
  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();

  if (!user) return null;
  const n = user.settings.notifications;

  const toggleSetting = (key: keyof typeof n) => {
    updateSettings('notifications', { ...n, [key]: !n[key] });
  };
  
  return (
    <SettingsTemplate title="Notifications">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>MESSAGES</Text>
        <SettingsItem 
          label="Allow Notifications" 
          icon={<Bell size={20} color={colors.textMuted} />} 
          isSwitch 
          value={n.messageNotifications} 
          onToggle={() => toggleSetting('messageNotifications')} 
        />
        <SettingsItem 
          label="Message Tones" 
          icon={<MessageSquare size={20} color={colors.textMuted} />} 
          value={n.sound === 'default' ? 'Default' : n.sound} 
        />
        <SettingsItem 
          label="Show Previews" 
          icon={<ChevronRight size={20} color={colors.textMuted} />} 
          isSwitch 
          value={n.showPreview} 
          onToggle={() => toggleSetting('showPreview')} 
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>CALLS</Text>
        <SettingsItem 
          label="Allow Call Notifications" 
          icon={<Phone size={20} color={colors.textMuted} />} 
          isSwitch 
          value={n.callNotifications} 
          onToggle={() => toggleSetting('callNotifications')}
        />
        <SettingsItem 
          label="Vibration" 
          icon={<ChevronRight size={20} color={colors.textMuted} />} 
          isSwitch
          value={n.vibrate}
          onToggle={() => toggleSetting('vibrate')}
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

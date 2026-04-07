import React from 'react';
import { StyleSheet, View, Text, Switch, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Smartphone, Image, Type, Download, ChevronRight } from 'lucide-react-native';

import SettingsTemplate from '@/components/SettingsTemplate';

const SettingsItem = ({ label, icon, value, isSwitch, onToggle, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.iconBox}>{icon}</View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {value && !isSwitch && <Text style={[styles.subValue, { color: colors.textMuted }]}>{value}</Text>}
      </View>
      <View style={styles.rightContent}>
        {isSwitch ? (
          <Switch value={value} onValueChange={onToggle} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
};

export default function ChatSettings() {
  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();
  const router = useRouter();

  if (!user) return null;
  const c = user.settings.chat;

  const navigateToChoice = (key: string, title: string, options: { label: string; value: string }[], description: string) => {
    router.push({
      pathname: '/settings/choice',
      params: {
        category: 'chat',
        settingKey: key,
        title,
        description,
        options: JSON.stringify(options)
      }
    });
  };

  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System Default', value: 'system' }
  ];

  const fontSizeOptions = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' }
  ];

  const toggleAutoDownload = (key: 'wifi' | 'mobileData') => {
    updateSettings('chat', { 
      ...c, 
      mediaAutoDownload: { ...c.mediaAutoDownload, [key]: !c.mediaAutoDownload[key] } 
    });
  };
  
  return (
    <SettingsTemplate title="Chats">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>DISPLAY</Text>
        <SettingsItem 
          label="Theme" 
          icon={<Smartphone size={20} color={colors.textMuted} />} 
          value={themeOptions.find(o => o.value === c.theme)?.label || c.theme} 
          onPress={() => navigateToChoice('theme', 'App Theme', themeOptions, 'Choose your preferred color theme for SangoX.')}
        />
        <SettingsItem 
          label="Wallpaper" 
          icon={<Image size={20} color={colors.textMuted} />} 
          value={c.wallpaper || 'Default'} 
        />
        <SettingsItem 
          label="Font Size" 
          icon={<Type size={20} color={colors.textMuted} />} 
          value={fontSizeOptions.find(o => o.value === c.fontSize)?.label || c.fontSize}
          onPress={() => navigateToChoice('fontSize', 'Font Size', fontSizeOptions, 'Adjust the size of the text in your chat rooms.')}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>MEDIA AUTO-DOWNLOAD</Text>
        <SettingsItem 
          label="Photos & Videos (Wi-Fi)" 
          icon={<Download size={20} color={colors.textMuted} />} 
          isSwitch 
          value={c.mediaAutoDownload.wifi} 
          onToggle={() => toggleAutoDownload('wifi')}
        />
        <SettingsItem 
          label="Photos & Videos (Data)" 
          icon={<Download size={20} color={colors.textMuted} />} 
          isSwitch 
          value={c.mediaAutoDownload.mobileData} 
          onToggle={() => toggleAutoDownload('mobileData')}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>CHAT SETTINGS</Text>
        <SettingsItem 
          label="Enter to Send" 
          icon={<ChevronRight size={20} color={colors.textMuted} />} 
          isSwitch 
          value={c.enterToSend} 
          onToggle={(val: boolean) => updateSettings('chat', { ...c, enterToSend: val })}
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
  content: { flex: 1 },
  label: { fontSize: 16, fontWeight: '500' },
  subValue: { fontSize: 13, marginTop: 2 },
  rightContent: { flexDirection: 'row', alignItems: 'center' },
});

import React from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { CircleHelp, Info, Mail, ShieldCheck, ChevronRight } from 'lucide-react-native';

const HelpItem = ({ label, icon, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.secondary + '40' }]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
};

export default function HelpSettings() {
  const { colors } = useTheme();
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Help</Text>
      </View>
      
      <View style={styles.section}>
        <HelpItem label="Help Center" icon={<CircleHelp size={20} color={colors.textMuted} />} />
        <HelpItem label="Contact Us" icon={<Mail size={20} color={colors.textMuted} />} />
        <HelpItem label="Privacy Policy" icon={<ShieldCheck size={20} color={colors.textMuted} />} />
        <HelpItem label="App Info" icon={<Info size={20} color={colors.textMuted} />} />
      </View>

      <View style={styles.footer}>
         <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0 (Build 42)</Text>
         <Text style={[styles.copyright, { color: colors.textMuted }]}>© 2026 SangoX Secure Messaging</Text>
      </View>
    </ScrollView>
  );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '800' },
  section: { marginBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderRadius: 10, paddingHorizontal: 8 },
  iconBox: { marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 40, paddingBottom: 60 },
  versionText: { fontSize: 13, marginBottom: 4 },
  copyright: { fontSize: 12, opacity: 0.7 },
});

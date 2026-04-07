import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { Spacing } from '@/constants/theme';

interface SettingsItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}

const SettingsItem = ({ label, value, onPress, icon }: SettingsItemProps) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.secondary }]}
      onPress={onPress}
    >
      <View style={styles.itemContent}>
        {icon && <View style={styles.iconBox}>{icon}</View>}
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {value && <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>}
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
};

import CustomHeader from './CustomHeader';

export default function SettingsTemplate({ title, children }: { title: string, children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title={title} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scroll: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  item: {
    paddingVertical: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    marginRight: 16,
  },
  label: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    marginRight: 8,
  },
});

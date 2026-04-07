import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import SettingsTemplate from '@/components/SettingsTemplate';
import { useTranslation } from 'react-i18next';

export default function LanguageSettings() {
  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  if (!user) return null;

  const currentLang = user.settings.account.language || i18n.language || 'en';

  const languages = [
    { label: 'English', value: 'en' },
    { label: 'Français', value: 'fr' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Italiano', value: 'it' },
    { label: 'Русский', value: 'ru' },
    { label: '中文', value: 'zh' }
  ];

  const handleSelect = async (lang: string) => {
    try {
      // Update local i18n
      await i18n.changeLanguage(lang);
      
      // Update backend/context
      await updateSettings('account', { ...user.settings.account, language: lang });
      
      router.back();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <SettingsTemplate title={t('language')}>
      <View style={styles.section}>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {t('language_selection_desc')}
        </Text>
        
        <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {languages.map((item, index) => (
            <Pressable 
              key={item.value}
              style={({ pressed }) => [
                styles.item,
                index !== languages.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary }
              ]}
              onPress={() => handleSelect(item.value)}
            >
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
              {currentLang === item.value && (
                <Check size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </SettingsTemplate>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 4 },
  description: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  listContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  label: { fontSize: 16, fontWeight: '500' },
});

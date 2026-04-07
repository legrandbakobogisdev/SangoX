import React from 'react';
import { StyleSheet, View, Text, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth, User } from '@/context/AuthContext';
import { Check } from 'lucide-react-native';
import SettingsTemplate from '@/components/SettingsTemplate';

export default function SettingChoiceScreen() {
  const { category, settingKey, title, description, options } = useLocalSearchParams<{
    category: keyof User['settings'];
    settingKey: string;
    title: string;
    description: string;
    options: string; // JSON string of options
  }>();

  const { colors } = useTheme();
  const { user, updateSettings } = useAuth();
  const router = useRouter();

  if (!user || !category || !settingKey) return null;

  const parsedOptions = JSON.parse(options || '[]');
  const currentValue = (user.settings[category] as any)[settingKey];

  const handleSelect = async (value: string) => {
    try {
      const currentCategorySettings = user.settings[category];
      await updateSettings(category, {
        ...currentCategorySettings,
        [settingKey]: value,
      });
      router.back();
    } catch (error) {
      // Error handled in AuthContext
    }
  };

  return (
    <SettingsTemplate title={title || 'Select Option'}>
      <View style={styles.header}>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      </View>

      <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {parsedOptions.map((option: { label: string; value: string }, index: number) => (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.optionItem,
              pressed && { backgroundColor: colors.secondary + '40' },
              index < parsedOptions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
            ]}
            onPress={() => handleSelect(option.value)}
          >
            <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
            {currentValue === option.value && (
              <Check size={20} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </SettingsTemplate>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

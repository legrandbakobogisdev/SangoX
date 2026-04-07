import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';

interface CustomHeaderProps {
  title: string;
  showBack?: boolean;
  backText?: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export default function CustomHeader({ title, showBack = true, backText, rightAction, onBack }: CustomHeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const displayBackText = backText || t('back');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <Pressable 
            onPress={handleBack} 
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            hitSlop={15}
          >
            <ChevronLeft size={24} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{displayBackText}</Text>
          </Pressable>
        )}
      </View>
      
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      
      <View style={styles.rightContainer}>
        {rightAction || <View style={{ width: 24 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  leftContainer: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: -2,
  },
});

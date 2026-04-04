import React from 'react';
import { StyleSheet, View, Image, Text, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Plus } from 'lucide-react-native';

interface StoryCircleProps {
  id: string;
  name?: string;
  image?: string;
  isAdd?: boolean;
  onPress: () => void;
}

export const StoryCircle: React.FC<StoryCircleProps> = ({ name, image, isAdd, onPress }) => {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.imageContainer, { borderColor: isAdd ? colors.border : colors.primary }]}>
        {isAdd ? (
          <View style={[styles.addView, { backgroundColor: colors.background }]}>
            <Plus size={24} color={colors.textMuted} />
          </View>
        ) : (
          <Image source={{ uri: image }} style={styles.image} />
        )}
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 70,
    marginRight: Spacing.sm,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    padding: 2,
    marginBottom: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  addView: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

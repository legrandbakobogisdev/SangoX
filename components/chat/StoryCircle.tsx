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
  storyCount?: number;
  unseenCount?: number;
  onPress: () => void;
}

export const StoryCircle: React.FC<StoryCircleProps> = ({ name, image, isAdd, storyCount = 1, unseenCount = 0, onPress }) => {
  const { colors } = useTheme();

  const renderSegments = () => {
    if (isAdd || storyCount <= 1) return null;

    // Create segments by placing "gaps" OVER the full border
    const gaps = [];
    const rotationPerGap = 360 / storyCount;

    for (let i = 0; i < storyCount; i++) {
        gaps.push(
            <View 
                key={i}
                style={[
                    styles.gap,
                    { 
                        backgroundColor: colors.background, 
                        transform: [
                            { rotate: `${i * rotationPerGap}deg` },
                            { translateY: -30 }
                        ]
                    }
                ]} 
            />
        );
    }
    return gaps;
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[
          styles.imageContainer, 
          { borderColor: isAdd ? colors.border : (unseenCount > 0 ? colors.primary : colors.border) }
      ]}>
        {/* The interrupted segments overlay */}
        {renderSegments()}

        {isAdd ? (
          <View style={[styles.addView, { backgroundColor: colors.background }]}>
            <Plus size={24} color={colors.textMuted} />
          </View>
        ) : (
          <Image source={{ uri: image }} style={styles.image} />
        )}

        {/* Unseen count badge */}
        {!isAdd && unseenCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{unseenCount}</Text>
          </View>
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
    borderRadius: 30,
    borderWidth: 2.5,
    padding: 3,
    marginBottom: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Removed overflow: 'hidden' to allow gaps to sit correctly on the border
  },
  gap: {
    position: 'absolute',
    width: 6, // Wider for visibility
    height: 10, // Taller to ensure it cuts through the 2.5px border
    zIndex: 1,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF', // Always white border for the badge to stand out
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  addView: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

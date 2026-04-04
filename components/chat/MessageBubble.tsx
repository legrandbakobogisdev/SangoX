import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  text: string;
  isSelf: boolean;
  time: string;
  onLongPress?: () => void;
}

export const MessageBubble = React.memo<MessageBubbleProps>(({ text, isSelf, time, onLongPress }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { alignItems: isSelf ? 'flex-end' : 'flex-start' }]}>
      <Pressable
        onLongPress={onLongPress}
        style={[
          styles.container,
          {
            backgroundColor: isSelf ? colors.bubbleSelf : colors.bubbleOther,
            borderBottomRightRadius: isSelf ? 2 : BorderRadius.xl, // Premium touch: small corner for sender
            borderBottomLeftRadius: isSelf ? BorderRadius.xl : 2,
          }
        ]}
      >
        <Text style={[styles.text, { color: isSelf ? '#000' : colors.text }]}>{text}</Text>
        <Text style={[styles.time, { color: isSelf ? 'rgba(0,0,0,0.5)' : colors.textMuted }]}>{time}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    width: '100%',
  },
  container: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    position: 'relative',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});

import React from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { X, ArrowDown } from 'lucide-react-native';

interface DownloadButtonProps {
  /** 0 = idle, between 0-1 = downloading, 1 = complete */
  progress: number;
  state: 'idle' | 'downloading' | 'downloaded' | 'error';
  onPress: () => void;
  size?: number;
  color?: string;
  isMine?: boolean;
}

/**
 * Telegram-style circular download/cancel button.
 * Shows a circular progress border during download.
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  progress,
  state,
  onPress,
  size = 48,
  color = '#FFF',
  isMine = false,
}) => {
  if (state === 'downloaded') return null;

  const iconSize = size * 0.4;
  const borderWidth = 3;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: state === 'downloading'
            ? 'rgba(0,0,0,0.5)'
            : 'rgba(0,0,0,0.45)',
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
      ]}
    >
      {/* Progress ring simulation using border + conic approach */}
      {state === 'downloading' && (
        <>
          {/* Background ring */}
          <View
            style={[
              styles.progressRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth,
                borderColor: 'rgba(255,255,255,0.15)',
              },
            ]}
          />
          {/* Animated spinner + percentage display */}
          <View style={[styles.progressRing, { width: size, height: size }]}>
            <ActivityIndicator size="small" color={color} style={{ position: 'absolute' }} />
          </View>
        </>
      )}

      {/* Icon */}
      {state === 'downloading' ? (
        <X size={iconSize} color={color} strokeWidth={2.5} />
      ) : state === 'error' ? (
        <ArrowDown size={iconSize} color="#FF6B6B" strokeWidth={2.5} />
      ) : (
        <ArrowDown size={iconSize} color={color} strokeWidth={2.5} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressRing: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#FFC107', // Yellow accent from image
    secondary: '#F8F9FA',
    text: '#1A1D1E',
    textMuted: '#6C757D',
    background: '#FFFFFF',
    card: '#F8F9FA',
    border: '#E9ECEF',
    notification: '#FFC107',
    tint: '#FFC107',
    icon: '#212529',
    tabIconDefault: '#ADB5BD',
    tabIconSelected: '#FFC107',
    error: '#DC3545',
    success: '#28A745',
    bubbleOther: '#F1F3F5',
    bubbleSelf: '#FFC107',
    surface: '#F8F9FA',
  },
  dark: {
    primary: '#FFC107',
    secondary: '#1A1D1E',
    text: '#F8F9FA',
    textMuted: '#ADB5BD',
    background: '#121212',
    card: '#1E1E1E',
    border: '#2C2C2C',
    notification: '#FFC107',
    tint: '#FFC107',
    icon: '#F8F9FA',
    tabIconDefault: '#495057',
    tabIconSelected: '#FFC107',
    error: '#E03131',
    success: '#2F9E44',
    bubbleOther: '#2C2C2E',
    bubbleSelf: '#FFC107',
    surface: '#1E1E1E',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});


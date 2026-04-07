import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, FlatList, Dimensions, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Shield, Zap, Lock, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Secure by Design',
    description: 'Your conversations are protected with end-to-end encryption. Only you and your recipient can read them.',
    icon: <Shield size={80} color="#FF4D4D" />,
  },
  {
    id: '2',
    title: 'Real-time Sync',
    description: 'Experience lightning-fast messaging that stays in sync across all your devices instantly.',
    icon: <Zap size={80} color="#FF4D4D" />,
  },
  {
    id: '3',
    title: 'Privacy First',
    description: 'We never store your private keys. You are the sole owner of your digital identity and assets.',
    icon: <Lock size={80} color="#FF4D4D" />,
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/auth/login');
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconContainer}>
        {/* Subtle glow effect behind icon */}
        <View style={[styles.glow, { backgroundColor: '#FF4D4D33' }]} />
        {item.icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: 'white' }]}>{item.title}</Text>
        <Text style={[styles.description, { color: '#BBBBBB' }]}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        keyExtractor={(item) => item.id}
      />

      {/* Pagination Dots */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 24, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i.toString()}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.mainButton, { backgroundColor: '#FFFFFF' }]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={styles.loginLink}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={[styles.loginText, { color: '#FFFFFF' }]}>Login</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 1.5,
  },
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    width: '100%',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xxl,
    gap: 20,
    marginTop: 20,
  },
  mainButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  loginText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  loginLink: {
    paddingVertical: 10,
  },
});

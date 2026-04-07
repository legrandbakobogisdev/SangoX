import { STORIES } from '@/constants/MockData';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';

const MULTI_STORIES = STORIES.map((s, idx) => ({
  ...s,
  items: [
    {
      id: `${s.id}_1`,
      time: '16h',
      audio: 'Blinding . Lights',
      text: `Midnight drive\nthrough the\nblinding lights\n(${s.name})`,
      bg: idx % 2 === 0 ? 'https://cdn.dribbble.com/userupload/46979464/file/93da1c9e10224451c3a15ac3d38df38a.png?resize=752x&vertical=center' : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: `${s.id}_2`,
      time: '14h',
      audio: 'Chill Vibes',
      text: 'Peaceful morning.',
      bg: idx % 2 !== 0 ? 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
  ]
}));

export default function StatusViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const initialIndex = MULTI_STORIES.findIndex(u => u.id === id);
  const startIdx = initialIndex >= 0 ? initialIndex : 0;

  const outerFlatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(startIdx * width);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const translateY = useSharedValue(0);
  const dismissing = useSharedValue(false);

  const goBack = () => {
    router.back();
  };

  const iosSwipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (dismissing.value) return;
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (dismissing.value) return;
      if (event.translationY > 150 || event.velocityY > 800) {
        dismissing.value = true;
        translateY.value = withTiming(height, { duration: 250 }, () => {
          runOnJS(goBack)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedMainStyle = useAnimatedStyle(() => {
    const scale = interpolate(translateY.value, [0, height], [1, 0.5], Extrapolation.CLAMP);
    const opacity = interpolate(translateY.value, [0, 200], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { translateY: translateY.value },
        { scale }
      ],
      opacity
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateY.value, [0, 200], [1, 0], Extrapolation.CLAMP),
    };
  });

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    return () => StatusBar.setBarStyle('dark-content');
  }, []);

  const renderItem = ({ item, index }: any) => (
    <UserStatusGroup
      person={item}
      index={index}
      scrollX={scrollX}
      insets={insets}
      onClose={goBack}
      goNext={() => outerFlatListRef.current?.scrollToIndex({ index: index + 1, animated: true })}
      goPrev={() => outerFlatListRef.current?.scrollToIndex({ index: index - 1, animated: true })}
      translateY={translateY}
      dismissing={dismissing}
    />
  );

  const flatListContent = (
    <Animated.View style={[styles.storyContainer, animatedMainStyle]}>
      <Animated.FlatList
        ref={outerFlatListRef}
        data={MULTI_STORIES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIdx}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={renderItem}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />
    </Animated.View>
  );

  return (
    <View style={styles.rootContainer}>
      <Animated.View style={[styles.overlay, animatedOverlayStyle]} pointerEvents="none" />
      {IS_IOS ? (
        <GestureDetector gesture={iosSwipeGesture}>
          {flatListContent}
        </GestureDetector>
      ) : (
        flatListContent
      )}
    </View>
  );
}

function UserStatusGroup({ person, index, scrollX, insets, onClose, goNext, goPrev, translateY, dismissing }: any) {
  const [curr, setCurr] = useState(0);
  const story = person.items[curr];
  const inputRef = useRef<TextInput>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const androidSwipeGesture = Gesture.Pan()
    .activeOffsetY([-20, 20])
    .failOffsetX([-10, 10])
    .onUpdate((event) => {
      if (dismissing.value) return;
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (dismissing.value) return;
      if (event.translationY > 150 || event.velocityY > 800) {
        dismissing.value = true;
        translateY.value = withTiming(height, { duration: 250 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  // Swipe UP to focus the comment input
  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY(-30) // Only activates on 30px upward movement
    .failOffsetX([-15, 15]) // Fail if horizontal
    .onEnd((event) => {
      if (event.translationY < -60) {
        runOnJS(focusInput)();
      }
    });

  const animatedTransitionStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    const rotateZ = interpolate(scrollX.value, inputRange, [-5, 0, 5], Extrapolation.CLAMP);
    const radius = interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { scale },
        { rotateZ: `${rotateZ}deg` },
      ],
      borderRadius: radius,
      overflow: 'hidden' as const,
    };
  });

  const storyContent = (
    <Animated.View style={[styles.userGroup, animatedTransitionStyle]}>
      <Image source={{ uri: story.bg }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={10} />
      <KeyboardAvoidingView 
        style={[styles.safeAreaWrapper, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 10) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.progressContainer}>
          {person.items.map((_: any, i: number) => (
            <View key={i} style={[styles.progressBar, i <= curr && styles.progressBarActive]} />
          ))}
        </View>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: person.image }} style={styles.avatar} />
            <View style={styles.headerTextInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{person.name}</Text>
                <Text style={styles.time}>{story.time}</Text>
              </View>
              <View style={styles.audioRow}>
                <Feather name="bar-chart-2" size={12} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.audioText}>{story.audio}</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.moreIconBtn} onPress={onClose}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
        </View>
        {/* Content area with swipe-up gesture */}
        <GestureDetector gesture={swipeUpGesture}>
          <Animated.View style={styles.contentContainer}>
            <Pressable style={styles.tapLeft} onPress={() => curr > 0 ? setCurr(curr - 1) : index > 0 && goPrev()} />
            <Pressable style={styles.tapRight} onPress={() => curr < person.items.length - 1 ? setCurr(curr + 1) : index < MULTI_STORIES.length - 1 && goNext()} />
            <View pointerEvents="none" style={styles.textWrapper}><Text style={styles.storyText}>{story.text}</Text></View>
          </Animated.View>
        </GestureDetector>
        <View style={styles.footer}>
          <View style={styles.inputContainer}>
            <TextInput ref={inputRef} style={styles.input} placeholder="Send Message..." placeholderTextColor="rgba(255,255,255,0.7)" />
            <Pressable style={styles.sendBtn}><Ionicons name="send" size={18} color="#000" /></Pressable>
          </View>
          <Pressable style={styles.likeBtn}><Ionicons name="heart" size={24} color="#FF3B30" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  if (IS_IOS) return storyContent;

  return (
    <GestureDetector gesture={androidSwipeGesture}>
      {storyContent}
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  storyContainer: { flex: 1, backgroundColor: '#000' },
  userGroup: { width, height, backgroundColor: '#000', backfaceVisibility: 'hidden' },
  safeAreaWrapper: { flex: 1, justifyContent: 'space-between' },
  progressContainer: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
  progressBar: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
  progressBarActive: { backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#FFF' },
  headerTextInfo: { marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  time: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  audioRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  audioText: { color: '#FFF', fontSize: 12 },
  moreIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { flex: 1, position: 'relative' },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 1 },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', zIndex: 1 },
  textWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  storyText: { color: '#FFF', fontSize: 32, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  footer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, alignItems: 'center', gap: 12 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, height: 48, paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  likeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});

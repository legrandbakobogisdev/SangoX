import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
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
import StoryService from '@/services/StoryService';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';

export default function StatusViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [userStoryGroups, setUserStoryGroups] = useState<any[]>([]);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);

  const outerFlatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

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

  const fetchStories = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const allStoriesData = await StoryService.getActiveStories();
      const rawData = Array.isArray(allStoriesData) ? allStoriesData : (allStoriesData?.data || []);
      
      const groups = rawData.map((group: any) => ({
        id: group.userId,
        name: group.stories?.[0]?.user?.username || group.stories?.[0]?.user?.name || group.stories?.[0]?.userId || 'User',
        image: group.stories?.[0]?.user?.profilePicture || group.stories?.[0]?.user?.avatar || 'https://via.placeholder.com/150',
        items: group.stories.map((s: any) => ({
          ...s,
          duration: s.mediaParams?.duration ? (s.mediaParams.duration < 100 ? s.mediaParams.duration * 1000 : s.mediaParams.duration) : 5000,
        }))
      }));

      setUserStoryGroups(groups);

      let foundIdx = groups.findIndex((g: any) => g.items.some((s: any) => s._id === id));
      if (foundIdx === -1) {
          foundIdx = groups.findIndex((g: any) => g.id === id);
      }
      
      const startIdx = foundIdx >= 0 ? foundIdx : 0;
      setInitialGroupIndex(startIdx);
      setTimeout(() => {
        scrollX.value = startIdx * width;
        outerFlatListRef.current?.scrollToIndex({ index: startIdx, animated: false });
      }, 100);
    } catch (e) {
      console.error('[StatusViewer] Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, [id, scrollX]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

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

  if (loading) {
    return (
      <View style={[styles.rootContainer, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

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
      userCount={userStoryGroups.length}
    />
  );

  const flatListContent = (
    <Animated.View style={[styles.storyContainer, animatedMainStyle]}>
      <Animated.FlatList
        ref={outerFlatListRef}
        data={userStoryGroups}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialGroupIndex}
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

function UserStatusGroup({ person, index, scrollX, insets, onClose, goNext, goPrev, translateY, dismissing, userCount }: any) {
  const [curr, setCurr] = useState(0);
  const story = person.items[curr];
  const inputRef = useRef<TextInput>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (story?._id) {
        StoryService.viewStory(story._id).catch(() => {});
    }

    const timer = setTimeout(() => {
      if (curr < person.items.length - 1) {
        setCurr(curr + 1);
      } else if (index < userCount - 1) {
        goNext();
      } else {
        onClose();
      }
    }, story?.duration || 5000);

    return () => clearTimeout(timer);
  }, [curr, index, story?._id, userCount, goNext, onClose]);

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

  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY(-30)
    .failOffsetX([-15, 15])
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
      transform: [{ scale }, { rotateZ: `${rotateZ}deg` }],
      borderRadius: radius,
      overflow: 'hidden',
    };
  });

  const renderContent = () => {
    if (!story) return null;
    switch (story.type) {
      case 'text':
        return (
          <View style={[styles.textWrapper, { backgroundColor: story.mediaParams?.backgroundColor || '#121212' }]}>
            <Text style={[styles.storyText, { color: '#FFF' }]}>{story.content}</Text>
          </View>
        );
      case 'image':
        return <Image source={{ uri: story.content }} style={styles.fullMedia} contentFit="contain" />;
      case 'video':
      case 'audio':
        return (
          <View style={styles.mediaPlaceholder}>
            <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.3)" />
            <Text style={styles.mediaHint}>Media: {story.type}</Text>
          </View>
        );
      default:
        return <View style={styles.textWrapper}><Text style={styles.storyText}>{story.content}</Text></View>;
    }
  };

  const storyContent = (
    <Animated.View style={[styles.userGroup, animatedTransitionStyle]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      {story?.type === 'image' && <Image source={{ uri: story.content }} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} contentFit="cover" blurRadius={20} />}
      
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
                <Text style={styles.time}>{story ? new Date(story.createdAt).getHours() : ''}h</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.moreIconBtn} onPress={onClose}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
        </View>

        <GestureDetector gesture={swipeUpGesture}>
          <View style={styles.contentContainer}>
            <Pressable style={styles.tapLeft} onPress={() => curr > 0 ? setCurr(curr - 1) : index > 0 && goPrev()} />
            <Pressable style={styles.tapRight} onPress={() => curr < person.items.length - 1 ? setCurr(curr + 1) : index < userCount - 1 && goNext()} />
            {renderContent()}
          </View>
        </GestureDetector>

        <View style={styles.footer}>
          <View style={styles.inputContainer}>
            <TextInput ref={inputRef} style={styles.input} placeholderTextColor="rgba(255,255,255,0.7)" />
            <Pressable style={styles.sendBtn}><Ionicons name="send" size={18} color="#000" /></Pressable>
          </View>
          <Pressable style={styles.likeBtn}><Ionicons name="heart" size={24} color="#FF3B30" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return IS_IOS ? storyContent : (
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
  moreIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  contentContainer: { flex: 1, position: 'relative' },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 1 },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', zIndex: 1 },
  textWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  storyText: { color: '#FFF', fontSize: 32, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  fullMedia: { width, height: height * 0.8 },
  mediaPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mediaHint: { color: '#FFF', marginTop: 20, fontSize: 16 },
  footer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, alignItems: 'center', gap: 12 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, height: 48, paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  likeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});

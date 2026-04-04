import { MessageBubble } from '@/components/chat/MessageBubble';
import { CHATS } from '@/constants/MockData';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Copy, Forward, MoreVertical, Paperclip, Phone, Reply, Send, Smile, Trash2, Video } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, FlatList, Image, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const REACTION_EMOJIS = ['🔥', '🙌', '😭', '🙈', '🙏', '😤'];

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const chat = CHATS.find(c => c.id === id) || CHATS[0];
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hi, Asal', isSelf: false, time: '09:41' },
    { id: '2', text: 'How do you buy "nice" stuff?', isSelf: false, time: '09:42' },
    { id: '3', text: 'Please help me find a good monitor for the design', isSelf: false, time: '09:43' },
    { id: '4', text: 'Zaire Dorwart: What should I call u?', isSelf: true, time: '09:44' },
    { id: '5', text: 'Hi, Asal', isSelf: true, time: '09:45' },
  ]);

  const [input, setInput] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  // Bottom Sheet Ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['45%'], []);

  // Manual keyboard height tracking with animation
  // Start with bottom safe area inset so input respects safe area when keyboard is closed
  const keyboardHeight = useRef(new Animated.Value(insets.bottom)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height + 25, // +8 for spacing between input and keyboard
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardHeight, {
        toValue: insets.bottom, // Back to safe area inset
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLongPress = useCallback((msg: any) => {
    setSelectedMessage(msg);
    bottomSheetRef.current?.expand();
  }, []);

  const handleSendMessage = () => {
    if (input.trim()) {
      const newMessages = [...messages, {
        id: Date.now().toString(),
        text: input,
        isSelf: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
      setMessages(newMessages);
      setInput('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      >
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      </BottomSheetBackdrop>
    ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            android_ripple={{ color: colors.border, radius: 20 }}
          >
            <ChevronLeft size={26} color={colors.text} />
          </Pressable>

          {/* Avatar + User Info */}
          <Pressable style={styles.userInfoRow}>
            {chat.image ? (
              <Image source={{ uri: chat.image }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.secondary }]} />
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{chat.name}</Text>
              <Text style={[styles.status, { color: colors.success }]}>Online</Text>
            </View>
          </Pressable>

          <View style={styles.headerIcons}>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
              android_ripple={{ color: colors.border, radius: 20 }}
            >
              <Video size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
              android_ripple={{ color: colors.border, radius: 20 }}
            >
              <Phone size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
              android_ripple={{ color: colors.border, radius: 20 }}
            >
              <MoreVertical size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              isSelf={item.isSelf}
              time={item.time}
              onLongPress={() => handleLongPress(item)}
            />
          )}
        />

        {/* Input Bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable style={styles.inputIconBtn}>
            <Paperclip size={22} color={colors.textMuted} />
          </Pressable>
          <View style={[styles.inputWrapper, { backgroundColor: colors.secondary }]}>
            <TextInput
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <Pressable style={styles.inputIconBtn}>
              <Smile size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleSendMessage}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: input.trim() ? colors.primary : colors.secondary },
              pressed && { transform: [{ scale: 0.92 }] }
            ]}
          >
            <Send size={18} color={input.trim() ? '#000' : colors.textMuted} />
          </Pressable>
        </View>

        {/* Action Menu (Bottom Sheet) */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          animateOnMount
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.background, borderRadius: BorderRadius.xxl }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 40 }}
        >
          <BottomSheetView style={styles.sheetContent}>
            {selectedMessage && (
              <View style={[styles.sheetMessagePreview, { backgroundColor: colors.secondary }]}>
                <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15 }}>{selectedMessage.text}</Text>
              </View>
            )}

            <Text style={[styles.sectionHeader, { color: colors.text }]}>React</Text>
            <View style={styles.reactionsGrid}>
              {REACTION_EMOJIS.map(emoji => (
                <Pressable
                  key={emoji}
                  style={({ pressed }) => [styles.reactionBtn, pressed && { transform: [{ scale: 1.3 }] }]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.actionList, { borderTopColor: colors.border }]}>
              {[
                { label: t('copy'), icon: <Copy size={20} color={colors.textMuted} />, color: colors.text },
                { label: t('reply'), icon: <Reply size={20} color={colors.textMuted} />, color: colors.text },
                { label: t('forward'), icon: <Forward size={20} color={colors.textMuted} />, color: colors.text },
                { label: t('delete'), icon: <Trash2 size={20} color={colors.error} />, color: colors.error },
              ].map((action, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.actionItem, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.secondary }]}
                  android_ripple={{ color: colors.border }}
                >
                  <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
                  {action.icon}
                </Pressable>
              ))}
            </View>
          </BottomSheetView>
        </BottomSheet>
      </SafeAreaView>
      <Animated.View style={{ height: keyboardHeight, backgroundColor: colors.background }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  userInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    marginTop: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  messageList: {
    paddingVertical: Spacing.md,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    marginHorizontal: 6,
    minHeight: 42,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 120,
    lineHeight: 20,
  },
  inputIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContent: {
    padding: Spacing.lg,
  },
  sheetMessagePreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  reactionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 28,
  },
  actionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

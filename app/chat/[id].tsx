import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Copy, Forward, MoreVertical, Paperclip, Phone, Reply, Send, Smile, Trash2, Video } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Dimensions, FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ExpoClipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import AnimatedRN, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import SocketService from '@/services/SocketService';
import { useTranslation } from 'react-i18next';

const REACTION_EMOJIS = ['🔥', '🙌', '😭', '🙈', '🙏', '😤'];

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { 
    conversations, 
    messages, 
    activeConversation,
    setActiveConversation, 
    sendMessage,
    startTyping,
    stopTyping,
    refreshConversations,
    onlineUsers,
    pinnedMessages,
    checkStatus,
    toggleArchive,
    toggleBlock,
    pinMessage,
    editMessage,
    deleteMessage,
    loading,
  } = useChat();
  
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const chat = useMemo(() => 
    conversations.find(c => c._id === id), 
    [conversations, id]
  );

  const partnerId = useMemo(() => 
    chat?.participants?.find((p: string) => p !== user?._id),
    [chat, user]
  );
  
  const isPartnerOnline = partnerId ? onlineUsers[partnerId] : false;

  useEffect(() => {
    // Only run this once per conversation id to avoid reloading all messages
    // when the chat object itself updates (e.g. lastMessage changes).
    const conversation = conversations.find(c => c._id === id);
    if (conversation) {
      setActiveConversation(conversation);
    }
    return () => {
      setActiveConversation(null);
    };
  }, [id, setActiveConversation, conversations]);

  const [input, setInput] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [newlySentMessageId, setNewlySentMessageId] = useState<string | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Bottom Sheet Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const emojiSheetRef = useRef<BottomSheet>(null);

  // Snap points
  const actionSnapPoints = useMemo(() => ['45%'], []);
  const emojiSnapPoints = useMemo(() => ['50%', '80%'], []);

  // Emojis for picker
  const EMOJI_CATEGORIES = [
    { name: 'Faces', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'] },
    { name: 'Gestures', emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾'] },
    { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'] }
  ];

  // Manual keyboard height tracking with animation
  // Start with bottom safe area inset so input respects safe area when keyboard is closed
  const keyboardHeight = useRef(new Animated.Value(insets.bottom)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height + 5, // Just standard padding
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
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
  }, [insets.bottom]);

  // Handle Socket Events & Presence
  useEffect(() => {
    if (!id || !user) return;

    // Join room for messaging
    SocketService.joinConversation(String(id));
    
    // Partner ID for typing
    const partnerId = chat?.participants?.find(p => p !== user?._id);

    const handleTypingStart = (data: any) => {
        if (String(data.conversationId) === String(id) && String(data.userId) === String(partnerId)) {
            setIsPartnerTyping(true);
        }
    };

    const handleTypingStop = (data: any) => {
        if (String(data.conversationId) === String(id) && String(data.userId) === String(partnerId)) {
            setIsPartnerTyping(false);
        }
    };

    SocketService.on('user_typing_start', handleTypingStart);
    SocketService.on('user_typing_stop', handleTypingStop);

    return () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        SocketService.off('user_typing_start', handleTypingStart);
        SocketService.off('user_typing_stop', handleTypingStop);
        SocketService.leaveConversation(String(id));
    };
  }, [id, user, chat, t]);

  // Typing emitter with automatic 3.5s stop
  const lastTypingTime = useRef<number>(0);
  const handleInputChange = (text: string) => {
    setInput(text);
    if (!id) return;

    // 1. Immediate clear on keypress
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const now = Date.now();
    if (text.length > 0) {
        // 2. Start (or re-start if > 2s since last start emission)
        if (now - lastTypingTime.current > 1000) {
            SocketService.startTyping(String(id));
            lastTypingTime.current = now;
        }

        // 3. Set automatic stop timer
        typingTimeoutRef.current = setTimeout(() => {
            SocketService.stopTyping(String(id));
            lastTypingTime.current = 0;
        }, 1500); // 1.5s of inactivity
    } else {
        // 4. Force stop on clear
        SocketService.stopTyping(String(id));
        lastTypingTime.current = 0;
    }
  };

  const handleLongPress = useCallback((msg: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(msg);
    setActionMenuVisible(true);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    try {
      if (editingMessage) {
        // Handle EDIT
        await editMessage(editingMessage._id, input.trim());
      } else {
        // Handle NEW MESSAGE
        const tempId = `local_${Date.now()}`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await sendMessage(input.trim(), 'text', {}, replyToMessage?._id);
        setNewlySentMessageId(tempId);
      }

      setInput('');
      setReplyToMessage(null);
      setEditingMessage(null);
      
      // Stop typing indicator immediately after sending
      if (id) stopTyping(String(id));
    } catch (error) {
      console.error('Failed to send/edit message:', error);
    }
  };

  const handleCopy = async (msg: any) => {
    if (!msg) return;
    await ExpoClipboard.setStringAsync(msg.content || msg.text || '');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActionMenuVisible(false);
  };

  const handlePin = (msg: any) => {
    if (!msg || !id) return;
    pinMessage(String(id), msg._id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionMenuVisible(false);
  };

  const handleDelete = async (msg: any) => {
    if (!msg) return;
    try {
        await deleteMessage(msg._id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActionMenuVisible(false);
    } catch (e) {
        console.error('Delete failed:', e);
    }
  };

  const handleArchive = (archive: boolean) => {
    if (!id) return;
    toggleArchive(String(id));
    setMenuVisible(false);
  };

  const handleBlock = (block: boolean) => {
    if (!id) return;
    toggleBlock(String(id));
    setMenuVisible(false);
  };

  const handleReply = (msg: any) => {
    setReplyToMessage(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleEdit = (msg: any) => {
    setEditingMessage(msg);
    setReplyToMessage(null);
    setInput(msg.content || msg.text);
    inputRef.current?.focus();
  };

  const cancelReplyOrEdit = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setInput('');
    if (id) stopTyping(String(id));
  };

  const onEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
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

  const iBlocked = chat?.blockedBy?.includes(String(user?._id));
  const imBlocked = partnerId ? chat?.blockedBy?.includes(String(partnerId)) : false;

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
            <Pressable 
              style={styles.userInfoRow}
              onPress={() => router.push({ pathname: '/chat/profile', params: { id } })}
            >
              {chat?.image || chat?.groupMetadata?.icon ? (
                <Image source={{ uri: chat?.image || chat?.groupMetadata?.icon }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.secondary }]} />
              )}
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {chat?.name || (chat?.type === 'individual' ? t('chat') : (chat?.groupMetadata?.name || t('group')))}
                </Text>
                <Text style={[
                    styles.status, 
                    { color: isPartnerTyping ? colors.primary : (isPartnerOnline ? colors.success : colors.textMuted) }
                ]}>
                    {isPartnerTyping ? t('typing') : (isPartnerOnline ? t('online') : t('offline'))}
                </Text>
              </View>
            </Pressable>

          <View style={styles.headerIcons}>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
            >
              <Video size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
            >
              <Phone size={20} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
            >
              <MoreVertical size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Pinned Message Bar (Telegram Style) */}
        {(pinnedMessages[String(id)] && pinnedMessages[String(id)].length > 0) && (
            <View style={[styles.pinnedBar, { backgroundColor: colors.background, borderBottomColor: colors.border, maxHeight: 110 }]}>
                <View style={[styles.pinnedIndicator, { backgroundColor: colors.primary }]} />
                <FlatList
                    data={pinnedMessages[String(id)]}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item._id}
                    style={styles.pinnedContent}
                    renderItem={({ item: pinnedMsg }) => (
                        <View style={{ width: Dimensions.get('window').width - 48, flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                            <Pressable 
                                onPress={() => {
                                    const index = messages.findIndex(m => m._id === pinnedMsg._id);
                                    if (index !== -1) flatListRef.current?.scrollToIndex({ index, animated: true });
                                }}
                                style={{ flex: 1, paddingRight: 8 }}
                            >
                                <Text style={[styles.pinnedTitle, { color: colors.primary }]}>{t('pinned_message', 'Message épinglé')}</Text>
                                <Text numberOfLines={1} style={[styles.pinnedText, { color: colors.text }]}>
                                    {pinnedMsg.content ?? 'Pin'}
                                </Text>
                            </Pressable>
                            <Pressable onPress={() => pinMessage(String(id), pinnedMsg._id)} style={styles.pinnedClose}>
                                <Ionicons name="close" size={18} color={colors.textMuted} />
                            </Pressable>
                        </View>
                    )}
                />
            </View>
        )}

        {/* Only show full loader if we have absolutely nothing to show */}
        {loading && messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        ) : (
            <FlatList
              ref={flatListRef}
              data={[...messages].reverse()}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              inverted
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onEndReached={() => {}}
              onEndReachedThreshold={0.2}
              renderItem={({ item }) => {
            const isSelf = item.senderId === user?._id;
            const shouldAnimate = newlySentMessageId === item._id || item._id?.startsWith('local_');
            return (
              <MessageItem
                item={item}
                isMine={isSelf}
                currentUser={user}
                onLongPress={handleLongPress}
                onReply={(m: any) => {
                  setReplyToMessage(m);
                  setEditingMessage(null);
                  inputRef.current?.focus();
                }}
                shouldAnimate={shouldAnimate}
                colors={colors}
                editedText={t('edited', 'modifié')}
                deletedTextMine={t('you_deleted_this_message', 'Vous avez supprimé ce message')}
                deletedTextTheirs={t('this_message_deleted', 'Ce message a été supprimé')}
              />
            );
          }}
        />
        )}

        {/* Input Bar Wrapper (With Preview) */}
        <View style={[styles.inputWrapperContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {(iBlocked || imBlocked) ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                        {iBlocked ? t('you_blocked_this_contact', 'Vous avez bloqué ce contact. Appuyez ici pour débloquer.') : t('cannot_send_messages', 'Vous ne pouvez plus envoyer de messages dans cette conversation.')}
                    </Text>
                    {iBlocked && (
                        <Pressable onPress={() => handleBlock(false)} style={{ marginTop: 8, padding: 8, backgroundColor: colors.secondary, borderRadius: 8 }}>
                            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{t('unblock', 'Débloquer')}</Text>
                        </Pressable>
                    )}
                </View>
            ) : (
                <>
                    {(replyToMessage || editingMessage) && (
                        <View style={[styles.previewBar, { backgroundColor: colors.secondary }]}>
                            <View style={styles.previewContent}>
                                <View style={[styles.previewVerticalBar, { backgroundColor: colors.primary }]} />
                                <View style={styles.previewTextContainer}>
                                    <Text style={[styles.previewTitle, { color: colors.primary }]}>
                                        {editingMessage ? t('edit_message') : t('reply_to')}
                                    </Text>
                                    <Text numberOfLines={1} style={[styles.previewText, { color: colors.textMuted }]}>
                                        {editingMessage ? editingMessage.content : replyToMessage.content}
                                    </Text>
                                </View>
                            </View>
                            <Pressable onPress={cancelReplyOrEdit} style={styles.previewCloseBtn}>
                                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Pressable style={styles.inputIconBtn}>
                            <Paperclip size={22} color={colors.textMuted} />
                        </Pressable>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.secondary }]}>
                            <TextInput
                            ref={inputRef}
                            placeholder={t('message_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.text }]}
                            value={input}
                            onFocus={() => {
                                emojiSheetRef.current?.close();
                            }}
                            onChangeText={handleInputChange}
                            multiline
                            maxLength={2000}
                            />
                            <Pressable 
                            style={styles.inputIconBtn}
                            onPress={() => {
                                Keyboard.dismiss();
                                emojiSheetRef.current?.expand();
                            }}
                            >
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
                </>
            )}
        </View>

        {/* Action Menu Modal */}
        <Modal
          transparent
          visible={actionMenuVisible}
          animationType="fade"
          onRequestClose={() => setActionMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActionMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                handleReply(selectedMessage);
                setActionMenuVisible(false);
              }}>
                <Ionicons name="arrow-undo-outline" size={20} color="#333" />
                <Text style={styles.menuItemText}>Répondre</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleCopy(selectedMessage)}>
                <Ionicons name="copy-outline" size={20} color="#333" />
                <Text style={styles.menuItemText}>Copier</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => handlePin(selectedMessage)}>
                <Ionicons name="pin-outline" size={20} color="#333" />
                <Text style={styles.menuItemText}>Épingler</Text>
              </TouchableOpacity>

              {selectedMessage && selectedMessage.senderId === user?._id && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => {
                    handleEdit(selectedMessage);
                    setActionMenuVisible(false);
                  }}>
                    <Ionicons name="pencil-outline" size={20} color="#333" />
                    <Text style={styles.menuItemText}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(selectedMessage)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setActionMenuVisible(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* More Options Modal */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleArchive(true)}>
                <Ionicons name="archive-outline" size={20} color="#333" />
                <Text style={styles.menuItemText}>{t('archive')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => handleBlock(true)}>
                <Ionicons name="ban-outline" size={20} color={iBlocked ? colors.primary : "#FF3B30"} />
                <Text style={[styles.menuItemText, { color: iBlocked ? colors.primary : '#FF3B30' }]}>
                  {iBlocked ? t('unblock', 'Débloquer') : t('block', 'Bloquer')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setMenuVisible(false)}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Emoji Picker (Bottom Sheet) */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={actionSnapPoints}
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

            <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('react')}</Text>
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
                { label: t('copy'), icon: <Copy size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    Haptics.selectionAsync();
                    // Copy logic here
                    bottomSheetRef.current?.close();
                }},
                { label: t('reply'), icon: <Reply size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handleReply(selectedMessage);
                    bottomSheetRef.current?.close();
                }},
                { label: t('edit'), icon: <Copy size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handleEdit(selectedMessage);
                    bottomSheetRef.current?.close();
                }},
                { label: t('forward'), icon: <Forward size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    bottomSheetRef.current?.close();
                }},
                { label: t('delete'), icon: <Trash2 size={20} color={colors.error} />, color: colors.error, action: () => {
                    bottomSheetRef.current?.close();
                }},
              ].map((action, idx) => (
                <Pressable
                  key={idx}
                  onPress={action.action}
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

        {/* Emoji Picker Menu */}
        <BottomSheet
          ref={emojiSheetRef}
          index={-1}
          snapPoints={emojiSnapPoints}
          enablePanDownToClose
          animateOnMount
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.background, borderRadius: BorderRadius.xxl }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 40 }}
        >
          <BottomSheetView style={styles.sheetContent}>
             <FlatList 
               data={EMOJI_CATEGORIES}
               keyExtractor={item => item.name}
               showsVerticalScrollIndicator={false}
               renderItem={({ item }) => (
                 <View style={styles.emojiCategory}>
                    <Text style={[styles.emojiCategoryName, { color: colors.textMuted }]}>{item.name}</Text>
                    <View style={styles.emojiGrid}>
                      {item.emojis.map(emoji => (
                        <Pressable 
                          key={emoji} 
                          style={({ pressed }) => [styles.emojiBtn, pressed && { opacity: 0.6 }]}
                          onPress={() => onEmojiSelect(emoji)}
                        >
                          <Text style={styles.emojiIcon}>{emoji}</Text>
                        </Pressable>
                      ))}
                    </View>
                 </View>
               )}
             />
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
    backgroundColor: '#F8F9FA',
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexGrow: 1,
  },
  inputWrapperContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewVerticalBar: {
    width: 3,
    height: '80%',
    borderRadius: 2,
    marginRight: 10,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
  },
  previewCloseBtn: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  emojiCategory: {
    marginBottom: 24,
  },
  emojiCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiBtn: {
    width: '12.5%', // 8 emojis per row
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 26,
  },
  // --- Modal menu styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 10,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    width: '100%',
    fontWeight: '600',
  },
  // --- Pinned Bar ---
  pinnedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedIndicator: {
    width: 3,
    height: '70%',
    borderRadius: 2,
    marginRight: 12,
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  pinnedText: {
    fontSize: 13,
  },
  pinnedClose: {
    padding: 4,
  },
  loadingMoreContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  // --- Message bubble styles (used by MessageItem) ---
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  theirMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1, // Telegram has a tiny shadow
  },
  myMessageText: {
    color: '#000', // Yellow background usually needs dark text
  },
  theirMessageText: {
    // will be set via inline style based on theme
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginLeft: 12,
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(0,0,0,0.5)',
  },
  theirMessageTime: {
    color: '#888',
  },
  statusIcons: {
    marginLeft: 4,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginRight: 4,
  },
  editedLabelMine: {
    color: 'rgba(0,0,0,0.4)',
  },
  editedLabelTheirs: {
    color: '#aaa',
  },
  replyPreview: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  replyPreviewTheirs: {
    backgroundColor: '#F5F5F5',
  },
  replyBar: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
  },
  replyBarMine: {
    backgroundColor: '#FFF',
  },
  replyBarTheirs: {
    backgroundColor: '#9cc1c4',
  },
  replyContent: {
    marginLeft: 8,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyAuthorMine: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyAuthorTheirs: {
    color: '#9cc1c4',
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyTextMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  replyTextTheirs: {
    color: '#888',
  },
  swipeActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    paddingLeft: 20,
  },
});

// ─── MessageItem ─────────────────────────────────────────────────────────────
// Defined OUTSIDE the screen component so it is NEVER recreated on re-renders.
// This is the fix that stops glitchy/janky entrance animations.
const MessageItem = memo(({ item, isMine, currentUser, onLongPress, onReply, shouldAnimate, colors, editedText, deletedTextMine, deletedTextTheirs }: {
  item: any;
  isMine: boolean;
  currentUser: any;
  onLongPress: (m: any) => void;
  onReply: (m: any) => void;
  shouldAnimate: boolean;
  colors: any;
  editedText?: string;
  deletedTextMine?: string;
  deletedTextTheirs?: string;
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isDeleted = item.isDeleted;

  const renderSwipeActions = () => (
    <View style={[styles.swipeActionContainer, isMine
      ? { alignItems: 'flex-start', paddingLeft: 20 }
      : { alignItems: 'flex-end', paddingRight: 20 }
    ]}>
      <Ionicons name="arrow-undo" size={24} color="#9cc1c4" />
    </View>
  );

  const handleSwipeOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReply(item);
    setTimeout(() => { swipeableRef.current?.close(); }, 0);
  };

  return (
    <AnimatedRN.View
      entering={shouldAnimate
        ? FadeInDown.duration(10000).springify().damping(20).mass(0.8)
        : undefined}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={isMine ? renderSwipeActions : undefined}
        renderLeftActions={!isMine ? renderSwipeActions : undefined}
        onSwipeableWillOpen={handleSwipeOpen}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
        <Pressable
          onLongPress={() => onLongPress(item)}
          style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}
        >
          <View style={[
            styles.messageBubble,
            isMine ? { backgroundColor: colors.bubbleSelf, borderBottomRightRadius: 4 } : { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4 },
            item.isDeleted && { opacity: 0.7 },
          ]}>
            {item.replyTo && !isDeleted && (
              <View style={[styles.replyPreview, isMine ? styles.replyPreviewMine : styles.replyPreviewTheirs]}>
                <View style={[styles.replyBar, isMine ? styles.replyBarMine : styles.replyBarTheirs]} />
                <View style={styles.replyContent}>
                  <Text style={[styles.replyAuthor, isMine ? styles.replyAuthorMine : styles.replyAuthorTheirs]} numberOfLines={1}>
                    {item.replyTo.senderId === currentUser?._id ? 'Vous' : 'Contact'}
                  </Text>
                  <Text style={[styles.replyText, isMine ? styles.replyTextMine : styles.replyTextTheirs]} numberOfLines={2}>
                    {item.replyTo.content || item.replyTo.text}
                  </Text>
                </View>
              </View>
            )}

            {isDeleted ? (
              <View style={styles.deletedContent}>
                <Ionicons name="ban-outline" size={14} color="#999" />
                <Text style={styles.deletedText}>{isMine ? (deletedTextMine || 'Vous avez supprimé ce message') : (deletedTextTheirs || 'Ce message a été supprimé')}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'column' }}>
                <Text style={[styles.myMessageText, isMine ? styles.myMessageText : { color: colors.text }]}>
                  {item.content || item.text}
                </Text>
              </View>
            )}

            <View style={styles.messageMeta}>
              {item.isEdited && !isDeleted && (
                <Text style={[styles.editedLabel, isMine ? styles.editedLabelMine : styles.editedLabelTheirs]}>{editedText || 'modifié'}</Text>
              )}
              <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMine && !isDeleted && (
                <View style={styles.statusIcons}>
                  {item.status === 'sending' ? (
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                  ) : (item.isRead || item.status === 'read') ? (
                    <Ionicons name="checkmark-done" size={16} color="#45B1FF" />
                  ) : (
                    <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.6)" />
                  )}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </AnimatedRN.View>
  );
});

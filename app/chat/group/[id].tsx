import { BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useTheme } from '@/context/ThemeContext';
import SocketService from '@/services/SocketService';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Copy, Crown, Forward, MoreVertical, Paperclip, Phone, Reply, Send, Smile, Trash2, Video, FileText as FileTextIcon, Play, Download, Camera, Image as ImageIcon, File, Mic, X, StopCircle } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AnimatedRN, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ExpoCrypto from 'expo-crypto';
import { Audio } from 'expo-av';
import MediaService from '@/services/MediaService';
import { ImageBubble, VideoBubble, AudioBubble, DocumentBubble } from '@/components/chat/media';


const REACTION_EMOJIS = ['🔥', '🙌', '😭', '🙈', '🙏', '😤'];

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
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
    toggleReaction,
    loading,
  } = useChat();

  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const chat = useMemo(() =>
    conversations.find(c => c._id === id),
    [conversations, id]
  );

  const partnerId = useMemo(() => {
    if (chat?.type === 'individual') {
      const p = chat?.participants?.find((p: any) => {
        const pId = typeof p === 'string' ? p : (p._id || p.id);
        return String(pId) !== String(user?._id) && String(pId) !== String(user?.id);
      });
      return typeof p === 'string' ? p : (p?._id || p?._id);
    }
    return null;
  }, [chat, user]);

  const isPartnerOnline = partnerId ? onlineUsers[partnerId] : false;

  const onlineCount = useMemo(() => {
    if (!chat?.participants) return 0;
    return chat.participants.filter((p: any) => {
      const pId = typeof p === 'string' ? p : (p._id || p.id);
      return onlineUsers[pId];
    }).length;
  }, [chat?.participants, onlineUsers]);

  const memberCount = chat?.participants?.length || 0;

  useEffect(() => {
    return () => {
      setActiveConversation(null);
    };
  }, [setActiveConversation]);

  useEffect(() => {
    if (activeConversation?._id === id) return;
    const conversation = conversations.find(c => c._id === id);
    if (conversation) {
      setActiveConversation(conversation);
    }
  }, [id, activeConversation?._id, setActiveConversation, conversations]);

  const [input, setInput] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, isMine: false });
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [newlySentMessageId, setNewlySentMessageId] = useState<string | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<any>(null);

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
      // Ensure we stop typing status when leaving the screen
      if (id) SocketService.stopTyping(String(id));
      
      SocketService.off('user_typing_start', handleTypingStart);
      SocketService.off('user_typing_stop', handleTypingStop);
      SocketService.leaveConversation(String(id));
    };
  }, [id, user?._id, chat?.participants]);

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
      }, 2000); // 2s of inactivity
    } else {
      // 4. Force stop on clear
      SocketService.stopTyping(String(id));
      lastTypingTime.current = 0;
    }
  };

  const handleLongPress = useCallback((msg: any, event: any) => {
    setSelectedMessage(msg);
    const { pageY } = event.nativeEvent;

    // Position near the touch point, ensuring it doesn't go offscreen at the bottom
    const top = Math.min(pageY, Dimensions.get('window').height - 280);
    const isMine = msg.senderId === user?._id;

    setMenuPosition({ top, isMine });
    setActionMenuVisible(true);
  }, [user?._id]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [attachmentSheetVisible, setAttachmentSheetVisible] = useState(false);
  const attachmentSheetRef = useRef<BottomSheet>(null);
  const attachmentSnapPoints = useMemo(() => ['35%'], []);

  const [pendingUploadMedia, setPendingUploadMedia] = useState<any | null>(null);

  /** Validate file size against server limits */
  const validateFileSize = async (fileSize: number | undefined): Promise<boolean> => {
    if (!fileSize) return true;
    try {
      const limits = await MediaService.getLimits();
      if (fileSize > limits.maxFileSize) {
        const limitMb = limits.maxFileSize / (1024 * 1024);
        Alert.alert(
          'Fichier trop volumineux',
          `La taille maximale autorisée est de ${limitMb} Mo. ${limits.isPremium ? '' : 'Passez au Premium pour envoyer jusqu\'à 100 Mo.'}`
        );
        return false;
      }
    } catch (e) {
      console.warn('Could not validate file size, proceeding', e);
    }
    return true;
  };

  /** Upload a file and send as a message */
  const uploadAndSend = async (
    uri: string,
    fileName: string,
    fileSize?: number,
    duration?: number,
    assetType?: string
  ) => {
    const uploadId = `upload_${Date.now()}`;
    setCurrentUploadId(uploadId);
    setUploadingFileName(fileName);
    setUploadProgress(0);
    setIsUploading(true);

    try {
      // 1. Simulation de compression & préparation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // 2. Génération du Hash
      let fileHash = '';
      try {
        const hash = await ExpoCrypto.digestStringAsync(
          ExpoCrypto.CryptoDigestAlgorithm.SHA256,
          uri + (fileSize || 0).toString()
        );
        fileHash = hash;
      } catch (e) {
        console.warn('Failed to generate file hash', e);
      }

      const msgType = MediaService.getMediaType(fileName) || (assetType === 'video' ? 'video' : 'image');

      setPendingUploadMedia({
        _id: uploadId,
        senderId: user?._id,
        type: msgType,
        content: uri,
        status: 'sending',
        createdAt: new Date().toISOString(),
        isUploading: true,
        uploadProgress: 0,
        metadata: {
          fileName,
          fileSize,
          duration,
        }
      });

      // 3. Upload vers le serveur média
      const uploadResponse = await MediaService.uploadFile(
        uri,
        'chat',
        undefined,
        (progress) => {
          setUploadProgress(progress);
          setPendingUploadMedia((prev: any) => prev ? { ...prev, uploadProgress: progress } : prev);
        },
        uploadId,
        { fileHash, isEncrypted: false, fileName }
      );

      // 4. Une fois uploadé -> Envoi du message léger au serveur de chat
      const finalMsgType = uploadResponse.type || msgType;

      await sendMessage(uploadResponse.url, msgType, {
        publicId: uploadResponse.publicId,
        mediaId: uploadResponse.mediaId,
        thumbnailUrl: uploadResponse.thumbnailUrl,
        blurhash: uploadResponse.blurhash,
        fileHash: uploadResponse.fileHash || fileHash,
        fileName,
        fileSize,
        duration,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (error.message === 'Upload cancelled') {
        console.log('Upload was cancelled by user');
      } else {
        console.error('Upload failed:', error);
        Alert.alert('Erreur', error.message || 'Échec de l\'envoi du fichier');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingFileName('');
      setPendingUploadMedia(null);
    }
  };

  const handleCancelUpload = () => {
    if (currentUploadId) {
      MediaService.cancelUpload(currentUploadId);
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadId(null);
      setPendingUploadMedia(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };


  /** Pick image/video from gallery */
  const pickMedia = async () => {
    setAttachmentSheetVisible(false);
    attachmentSheetRef.current?.close();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false, 
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.9,
      });
      if (result.canceled) return;
      
      for (const asset of result.assets) {
        if (!(await validateFileSize(asset.fileSize))) continue;
        await uploadAndSend(
          asset.uri,
          asset.fileName || `media_${Date.now()}`,
          asset.fileSize,
          asset.duration ?? undefined,
          asset.type ?? undefined
        );
      }
    } catch (error: any) {
      console.error('Media pick failed:', error);
    }
  };

  /** Take a photo with camera */
  const takePhoto = async () => {
    setAttachmentSheetVisible(false);
    attachmentSheetRef.current?.close();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra pour prendre des photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!(await validateFileSize(asset.fileSize))) return;
      await uploadAndSend(
        asset.uri,
        asset.fileName || `photo_${Date.now()}.jpg`,
        asset.fileSize,
        undefined,
        'image'
      );
    } catch (error: any) {
      console.error('Camera capture failed:', error);
    }
  };

  /** Pick a document */
  const pickDocument = async () => {
    setAttachmentSheetVisible(false);
    attachmentSheetRef.current?.close();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const doc = result.assets[0];
      if (!(await validateFileSize(doc.size))) return;
      await uploadAndSend(
        doc.uri,
        doc.name || `document_${Date.now()}`,
        doc.size,
        undefined,
        'document'
      );
    } catch (error: any) {
      console.error('Document pick failed:', error);
    }
  };

  /** Audio Recording Handlers */
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', "Autorisez l'accès au micro pour enregistrer.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (canceled: boolean = false) => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!canceled && uri) {
        await uploadAndSend(uri, `voice_${Date.now()}.m4a`, undefined, recordingDuration * 1000, 'voice');
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (id) stopTyping(String(id));
      lastTypingTime.current = 0;
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

  const handleForward = (msg: any) => {
    setActionMenuVisible(false);
    router.push({
      pathname: '/chat/forward',
      params: { messageId: msg._id }
    });
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

  const getMessagePreviewText = (msg: any) => {
    if (!msg) return '';
    if (msg.type === 'image') return `📷 ${t('photo')}`;
    if (msg.type === 'video') return `🎥 ${t('video')}`;
    if (msg.type === 'audio') return `🎵 ${t('audio')}`;
    if (msg.type === 'voice') return `🎤 ${t('voice')}`;
    if (msg.type === 'document' || msg.type === 'file') return `📄 ${t('document')}`;
    return msg.content || msg.text || '';
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

  const reversedMessages = useMemo(() => {
    const list = [...messages];
    if (pendingUploadMedia) {
      list.push(pendingUploadMedia);
    }
    
    // Group consecutive media (images/videos) from the same sender in the exact same minute
    const clustered: any[] = [];
    let currentGroup: any = null;

    for (let i = 0; i < list.length; i++) {
      const msg = list[i];
      const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'video/mp4';
      
      if (isMedia) {
        if (!currentGroup) {
          currentGroup = {
            _id: `group_${msg._id}`,
            type: 'media_group',
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            items: [msg],
            isDeleted: msg.isDeleted
          };
        } else {
          const sameSender = currentGroup.senderId === msg.senderId;
          const timeA = new Date(currentGroup.createdAt).setSeconds(0, 0);
          const timeB = new Date(msg.createdAt).setSeconds(0, 0);
          const sameMinute = timeA === timeB;

          if (sameSender && sameMinute && !msg.isDeleted && !currentGroup.isDeleted) {
            currentGroup.items.push(msg);
          } else {
            clustered.push(currentGroup);
            currentGroup = {
              _id: `group_${msg._id}`,
              type: 'media_group',
              senderId: msg.senderId,
              createdAt: msg.createdAt,
              items: [msg],
              isDeleted: msg.isDeleted
            };
          }
        }
      } else {
        if (currentGroup) {
          clustered.push(currentGroup);
          currentGroup = null;
        }
        clustered.push(msg);
      }
    }
    if (currentGroup) {
      clustered.push(currentGroup);
    }

    const finalClustered = clustered.map((group: any) => {
       if (group.type === 'media_group' && group.items.length === 1) {
          return group.items[0];
       }
       return group;
    });

    const chronologicallyReversed = finalClustered.reverse(); // [Newest, ..., Oldest]

    // Flag start of stacks (the oldest message in a sequence from the same sender)
    return chronologicallyReversed.map((msg, idx) => {
       const nextMsg = chronologicallyReversed[idx + 1]; // Older message
       const isStartOfStack = !nextMsg || nextMsg.senderId !== msg.senderId;
       return { ...msg, isFirstInStack: isStartOfStack };
    });
  }, [messages, pendingUploadMedia]);

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {chat?.name || (chat?.type === 'individual' ? t('chat') : (chat?.groupMetadata?.name || t('group')))}
                </Text>
                {chat?.isPremium && (
                  <View style={styles.premiumBadge}>
                                            <LottieView 
                                              source={require('@/assets/lottie/Disabled premium.json')} 
                                              autoPlay 
                                              loop 
                                              style={{ width: 20, height: 20 }} 
                                            />
                                          </View>
                )}
              </View>
              <Text style={[
                styles.status,
                { color: isPartnerTyping ? colors.primary : colors.textMuted }
              ]}>
                {isPartnerTyping ? t('typing') : (onlineCount > 0 ? t('members_online', { count: onlineCount }) : t('members_count', { count: memberCount }))}
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
                      const index = reversedMessages.findIndex(m => m._id === pinnedMsg._id);
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
            data={reversedMessages}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            inverted
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onEndReached={() => { }}
            onEndReachedThreshold={0.2}
            renderItem={({ item }) => {
              const isSelf = item.senderId === user?._id;
              const shouldAnimate = newlySentMessageId === item._id || item._id?.startsWith('local_') || item._id?.startsWith('upload_');
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
                  theme={theme}
                  editedText={t('edited', 'modifié')}
                  deletedTextMine={t('you_deleted_this_message', 'Vous avez supprimé ce message')}
                  deletedTextTheirs={t('this_message_deleted', 'Ce message a été supprimé')}
                  getMessagePreviewText={getMessagePreviewText}
                  t={t}
                  activeConversation={activeConversation}
                  toggleReaction={toggleReaction}
                  conversationId={id as string}
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
                        {editingMessage ? getMessagePreviewText(editingMessage) : getMessagePreviewText(replyToMessage)}
                      </Text>
                    </View>
                    {(replyToMessage?.type === 'image' || replyToMessage?.type === 'video') && (
                      <Image 
                        source={{ uri: replyToMessage.type === 'image' ? replyToMessage.content : (replyToMessage.metadata?.thumbnailUrl || replyToMessage.content) }} 
                        style={styles.replyThumbnail} 
                      />
                    )}
                  </View>
                  <Pressable onPress={cancelReplyOrEdit} style={styles.previewCloseBtn}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}

              {/* Removed bottom upload progress component as we show it in the message bubble directly */}

              <View style={styles.inputContainer}>
                {isRecording ? (
                  <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} />
                      <Text style={{ color: colors.text, fontWeight: '500' }}>
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <Pressable onPress={() => stopRecording(true)} style={{ padding: 4 }}>
                      <Trash2 size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable 
                      style={styles.inputIconBtn} 
                      onPress={() => {
                        Keyboard.dismiss();
                        setAttachmentSheetVisible(true);
                        attachmentSheetRef.current?.expand();
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Paperclip size={22} color={colors.textMuted} />}
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
                  </>
                )}
                
                {input.trim() || editingMessage ? (
                  <Pressable
                    onPress={handleSendMessage}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      { backgroundColor: colors.primary },
                      pressed && { transform: [{ scale: 0.92 }] }
                    ]}
                  >
                    <Send size={18} color={'#000'} />
                  </Pressable>
                ) : isRecording ? (
                  <Pressable
                    onPress={() => stopRecording(false)}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      { backgroundColor: colors.primary },
                      pressed && { transform: [{ scale: 0.92 }] }
                    ]}
                  >
                    <Send size={18} color={'#000'} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={startRecording}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      { backgroundColor: colors.secondary },
                      pressed && { transform: [{ scale: 0.92 }] }
                    ]}
                  >
                    <Mic size={20} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        {/* Action Menu Modal (Sleek Popup) */}
        <Modal
          transparent
          visible={actionMenuVisible}
          animationType="fade"
          onRequestClose={() => setActionMenuVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActionMenuVisible(false)}
          >
            <View style={[styles.contextMenuContainer, { backgroundColor: colors.surface, borderColor: colors.border }, {
              position: 'absolute',
              top: menuPosition.top,
              ...(menuPosition.isMine ? { right: 20 } : { left: 20 })
            }]}>
              {/* Reactions Bar */}
              <View style={[styles.reactionPicker, { borderBottomColor: colors.border }]}>
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                  <Pressable 
                    key={emoji} 
                    onPress={() => {
                      toggleReaction(selectedMessage?._id, emoji);
                      setActionMenuVisible(false);
                    }}
                    style={({ pressed }) => [styles.reactionItem, pressed && { backgroundColor: colors.background }]}
                  >
                    <Text style={styles.reactionItemEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
<Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => {
                handleForward(selectedMessage);
              }}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
                <Text style={[styles.actionMenuItemText, { color: colors.text }]}>{t('forward', 'Transférer')}</Text>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => {
                handleReply(selectedMessage);
                setActionMenuVisible(false);
              }}>
                <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                <Text style={[styles.actionMenuItemText, { color: colors.text }]}>{t('reply', 'Répondre')}</Text>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => handleCopy(selectedMessage)}>
                <Ionicons name="copy-outline" size={20} color={colors.text} />
                <Text style={[styles.actionMenuItemText, { color: colors.text }]}>{t('copy', 'Copier')}</Text>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => handlePin(selectedMessage)}>
                <Ionicons name="pin-outline" size={20} color={colors.text} />
                <Text style={[styles.actionMenuItemText, { color: colors.text }]}>{t('pin', 'Épingler')}</Text>
              </Pressable>

              {selectedMessage && selectedMessage.senderId === user?._id && (
                <>
                  <Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => {
                    handleEdit(selectedMessage);
                    setActionMenuVisible(false);
                  }}>
                    <Ionicons name="pencil-outline" size={20} color={colors.text} />
                    <Text style={[styles.actionMenuItemText, { color: colors.text }]}>{t('edit', 'Modifier')}</Text>
                  </Pressable>

                  <Pressable style={({ pressed }) => [styles.actionMenuItem, pressed && { backgroundColor: colors.background }]} onPress={() => handleDelete(selectedMessage)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error || '#FF3B30'} />
                    <Text style={[styles.actionMenuItemText, { color: colors.error || '#FF3B30' }]}>{t('delete', 'Supprimer')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
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
                {
                  label: t('copy', 'Copier'), icon: <Copy size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handleCopy(selectedMessage);
                  }
                },
                {
                  label: t('reply', 'Répondre'), icon: <Reply size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handleReply(selectedMessage);
                    bottomSheetRef.current?.close();
                  }
                },
                {
                  label: t('pin', 'Épingler'), icon: <Ionicons name="pin-outline" size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handlePin(selectedMessage);
                  }
                },
                ...(selectedMessage?.senderId === user?._id ? [{
                  label: t('edit', 'Modifier'), icon: <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    handleEdit(selectedMessage);
                    bottomSheetRef.current?.close();
                  }
                }] : []),
                {
                  label: t('forward', 'Transférer'), icon: <Forward size={20} color={colors.textMuted} />, color: colors.text, action: () => {
                    bottomSheetRef.current?.close();
                  }
                },
                ...(selectedMessage?.senderId === user?._id ? [{
                  label: t('delete', 'Supprimer'), icon: <Trash2 size={20} color={colors.error} />, color: colors.error, action: () => {
                    handleDelete(selectedMessage);
                  }
                }] : []),
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

        {/* Attachment Picker Sheet */}
        <BottomSheet
          ref={attachmentSheetRef}
          index={-1}
          snapPoints={attachmentSnapPoints}
          enablePanDownToClose
          animateOnMount
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.background, borderRadius: BorderRadius.xxl }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 40 }}
          onClose={() => setAttachmentSheetVisible(false)}
        >
          <BottomSheetView style={styles.attachmentSheetContent}>
            <Text style={[styles.attachmentSheetTitle, { color: colors.text }]}>Envoyer</Text>
            <View style={styles.attachmentGrid}>
              <Pressable onPress={takePhoto} style={({ pressed }) => [styles.attachmentItem, pressed && { opacity: 0.6 }]}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#E74C3C20' }]}>
                  <Camera size={26} color="#E74C3C" />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Caméra</Text>
              </Pressable>
              <Pressable onPress={pickMedia} style={({ pressed }) => [styles.attachmentItem, pressed && { opacity: 0.6 }]}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#9B59B620' }]}>
                  <ImageIcon size={26} color="#9B59B6" />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Galerie</Text>
              </Pressable>
              <Pressable onPress={pickDocument} style={({ pressed }) => [styles.attachmentItem, pressed && { opacity: 0.6 }]}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#2980B920' }]}>
                  <File size={26} color="#2980B9" />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Document</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.attachmentItem, { opacity: 0.4 }, pressed && { opacity: 0.3 }]}>
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#27AE6020' }]}>
                  <Mic size={26} color="#27AE60" />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.textMuted }]}>Audio</Text>
              </Pressable>
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
  contextMenuContainer: {
    width: 250,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionItem: {
    padding: 6,
    borderRadius: 20,
  },
  reactionItemEmoji: {
    fontSize: 22,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionMenuItemText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
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
  uploadProgressBar: {
    padding: 12,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginBottom: -1,
    zIndex: 2,
  },
  uploadProgressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadProgressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  uploadProgressPercent: {
    marginTop: 1,
  },
  uploadProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cancelUploadBtn: {
    padding: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  myMessageText: {
    color: '#FFF',
  },
  theirMessageText: {
    color: '#FFF',
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
  avatarStalk: {
    width: 32,
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    marginTop: 2,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
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
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
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
    flex: 1,
  },
  replyThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: '#000',
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  // Attachment sheet styles
  attachmentSheetContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  attachmentSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.lg,
  },
  attachmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachmentItem: {
    alignItems: 'center',
    gap: 8,
  },
  attachmentIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  premiumBadge: {
    marginLeft: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
  // Stacked Media Styles
  stackContainer: {
    height: 220,
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  stackCard: {
    width: 180,
    height: 180,
    borderRadius: 30,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  stackImage: {
    width: '100%',
    height: '100%',
  },
  stackBadges: {
    position: 'absolute',
    bottom: -15,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  stackBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reactionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -12,
    marginBottom: 8,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
});

// ─── MessageItem ─────────────────────────────────────────────────────────────
// Defined OUTSIDE the screen component so it is NEVER recreated on re-renders.
// This is the fix that stops glitchy/janky entrance animations.
const MessageItem = memo(({ item, isMine, currentUser, onLongPress, onReply, shouldAnimate, colors, theme, editedText, deletedTextMine, deletedTextTheirs, getMessagePreviewText, t, activeConversation, toggleReaction, conversationId }: {
  item: any;
  isMine: boolean;
  currentUser: any;
  onLongPress: (m: any, e: any) => void;
  onReply: (m: any) => void;
  shouldAnimate: boolean;
  colors: any;
  theme: string;
  editedText?: string;
  deletedTextMine?: string;
  deletedTextTheirs?: string;
  getMessagePreviewText: (msg: any) => string;
  t: (key: string, options?: any) => string;
  activeConversation: any;
  toggleReaction: (messageId: string, emoji: string) => void;
  conversationId: string;
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isDeleted = item.isDeleted;
  const showAvatar = item.isFirstInStack;

  // Try to find sender profile info (especially for group chats)
  const senderInfo = activeConversation?.participants?.find((p: any) => (p._id || p) === item.senderId);
  const avatarUrl = senderInfo?.profilePhotoUrl || senderInfo?.avatar;
  const senderInitial = (senderInfo?.username || 'U').charAt(0).toUpperCase();

  const renderSwipeActions = () => (
    <View style={[styles.swipeActionContainer, isMine
      ? { alignItems: 'flex-start', paddingLeft: 20 }
      : { alignItems: 'flex-end', paddingRight: 20 }
    ]}>
      <Ionicons name="arrow-undo" size={24} color="#9cc1c4" />
    </View>
  );

  const isImage = item.type === 'image';
  const isVideo = item.type === 'video' || item.type === 'video/mp4';
  const isAudio = item.type === 'audio' || item.type === 'voice';
  const isDocument = item.type === 'document' || item.type === 'file' || item.type === 'application/pdf';
  const isMediaGroup = item.type === 'media_group';
  const hasMedia = isImage || isVideo || isAudio || isDocument || isMediaGroup;
  const hasMediaPadding = hasMedia;

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
        <View style={[styles.messageWrapper, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
          {/* Avatar Area (Only for others) */}
          {!isMine && (
            <View style={styles.avatarStalk}>
              {showAvatar ? (
                <View style={[styles.messageAvatar, { backgroundColor: colors.secondary }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{senderInitial}</Text>
                  )}
                </View>
              ) : null}
            </View>
          )}

          <View style={[isMine ? { alignItems: 'flex-end' } : { flex: 1 }]}>
            <Pressable
              onLongPress={(e) => onLongPress(item, e)}
              style={[
                styles.messageBubble,
                isMine 
                  ? { backgroundColor: '#323232', borderBottomRightRadius: 4 } 
                  : { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderBottomLeftRadius: 4 },
                (isImage || isVideo || isMediaGroup) && { elevation: 0, shadowOpacity: 0, backgroundColor: 'transparent' },
                item.isDeleted && { opacity: 0.7 },
                (isImage || isVideo || isMediaGroup) ? { padding: 0 } : (hasMediaPadding && { padding: 4 })
              ]}>
              {showAvatar && !isMine && !isDeleted && (
                <Text style={[styles.senderName, { color: colors.primary }]}>
                  {senderInfo?.firstName ? `${senderInfo.firstName} ${senderInfo.lastName || ''}` : senderInfo?.username || 'User'}
                </Text>
              )}
            {item.replyTo && !isDeleted && (
              <View style={[styles.replyPreview, isMine ? styles.replyPreviewMine : styles.replyPreviewTheirs, hasMediaPadding && { marginHorizontal: 8, marginTop: 8 }]}>
                <View style={[styles.replyBar, isMine ? styles.replyBarMine : styles.replyBarTheirs]} />
                <View style={styles.replyContent}>
                  <Text style={[styles.replyAuthor, isMine ? styles.replyAuthorMine : styles.replyAuthorTheirs]} numberOfLines={1}>
                    {item.replyTo.senderId === currentUser?._id ? t('you') : t('contact')}
                  </Text>
                  <Text style={[styles.replyText, isMine ? styles.replyTextMine : styles.replyTextTheirs]} numberOfLines={2}>
                    {getMessagePreviewText(item.replyTo)}
                  </Text>
                </View>
                {(item.replyTo.type === 'image' || item.replyTo.type === 'video') && (
                   <Image 
                     source={{ uri: item.replyTo.type === 'image' ? item.replyTo.content : (item.replyTo.metadata?.thumbnailUrl || item.replyTo.content) }} 
                     style={styles.replyThumbnail} 
                   />
                )}
              </View>
            )}

            {isDeleted ? (
              <View style={styles.deletedContent}>
                <Ionicons name="ban-outline" size={14} color="#999" />
                <Text style={styles.deletedText}>{isMine ? (deletedTextMine || 'Vous avez supprimé ce message') : (deletedTextTheirs || 'Ce message a été supprimé')}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'column' }}>
                {/* ─── IMAGE ─── */}
                {isImage && item.content && (
                  <ImageBubble
                    messageId={item._id}
                    uri={item.content}
                    isMine={isMine}
                    fileName={item.metadata?.fileName}
                    fileSize={item.metadata?.fileSize}
                    colors={colors}
                    time={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    status={item.status}
                    isUploading={item.isUploading}
                    uploadProgress={item.uploadProgress}
                    onCancelUpload={() => {
                      if (item._id.startsWith('upload_')) {
                        MediaService.cancelUpload(item._id);
                      }
                    }}
                  />
                )}
                {/* ─── VIDEO ─── */}
                {isVideo && item.content && (
                  <VideoBubble
                    messageId={item._id}
                    uri={item.content}
                    isMine={isMine}
                    fileName={item.metadata?.fileName}
                    fileSize={item.metadata?.fileSize}
                    duration={item.metadata?.duration}
                    thumbnailUri={item.metadata?.thumbnailUrl}
                    colors={colors}
                    time={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    status={item.status}
                    isUploading={item.isUploading}
                    uploadProgress={item.uploadProgress}
                    onCancelUpload={() => {
                      if (item._id.startsWith('upload_')) {
                        MediaService.cancelUpload(item._id);
                      }
                    }}
                  />
                )}
                {/* ─── AUDIO ─── */}
                {isAudio && item.content && (
                  <AudioBubble
                    messageId={item._id}
                    uri={item.content}
                    isMine={isMine}
                    fileName={item.metadata?.fileName}
                    fileSize={item.metadata?.fileSize}
                    duration={item.metadata?.duration}
                    colors={colors}
                    time={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    status={item.status}
                    isUploading={item.isUploading}
                    uploadProgress={item.uploadProgress}
                    onCancelUpload={() => {
                      if (item._id.startsWith('upload_')) {
                        MediaService.cancelUpload(item._id);
                      }
                    }}
                  />
                )}
                {/* ─── DOCUMENT ─── */}
                {isDocument && item.content && (
                  <DocumentBubble
                    messageId={item._id}
                    uri={item.content}
                    isMine={isMine}
                    fileName={item.metadata?.fileName || 'Document'}
                    fileSize={item.metadata?.fileSize}
                    colors={colors}
                    time={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    status={item.status}
                    isUploading={item.isUploading}
                    uploadProgress={item.uploadProgress}
                    onCancelUpload={() => {
                      if (item._id.startsWith('upload_')) {
                        MediaService.cancelUpload(item._id);
                      }
                    }}
                  />
                )}
                {/* ─── STACKED MEDIA GROUP ─── */}
                {isMediaGroup && (
                  <Pressable 
                    onPress={() => router.push({
                      pathname: '/chat/media-group-detail',
                      params: { messageId: item._id, conversationId: conversationId }
                    })}
                    style={styles.stackContainer}
                  >
                    {item.items.slice(0, 3).reverse().map((subItem: any, idx: number) => {
                      const total = item.items.length;
                      const displayIdx = total <= 3 ? idx : idx + (total - 3);
                      // Reverse logic: the last item (top) should be centered
                      const isTop = idx === 2 || (total < 3 && idx === total - 1);
                      
                      let rotation = '0deg';
                      let translateX = 0;
                      let translateY = 0;

                      if (total >= 2) {
                        if (idx === 0) { rotation = '-8deg'; translateX = -10; translateY = 5; }
                        if (idx === 1) { rotation = '6deg'; translateX = 10; translateY = -5; }
                        if (isTop) { rotation = '0deg'; translateX = 0; translateY = 0; }
                      }

                      const uri = subItem.type === 'image' ? subItem.content : (subItem.metadata?.thumbnailUrl || subItem.content);

                      return (
                        <View 
                          key={subItem._id || idx} 
                          style={[
                            styles.stackCard, 
                            { 
                              transform: [
                                { rotate: rotation },
                                { translateX: translateX },
                                { translateY: translateY }
                              ],
                              zIndex: idx,
                              marginLeft: idx === 0 ? 0 : -140, // Overlap
                            }
                          ]}
                        >
                          <Image source={{ uri }} style={styles.stackImage} contentFit="cover" />
                          {subItem.type.includes('video') && (
                            <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                              <Play size={24} color="#FFF" fill="#FFF" />
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {/* Count Badges */}
                    <View style={styles.stackBadges}>
                      <View style={[styles.stackBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={styles.stackBadgeText}>🔥 {item.items.length.toString().padStart(2, '0')}</Text>
                      </View>
                      <View style={[styles.stackBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={styles.stackBadgeText}>📸 {(item.items.length + 3).toString().padStart(2, '0')}</Text>
                      </View>
                    </View>
                  </Pressable>
                )}
                {/* ─── TEXT ─── */}
                {item.type === 'text' && (
                  <Text style={[styles.myMessageText, isMine ? styles.myMessageText : { color: colors.text }]}>
                    {item.content || item.text}
                  </Text>
                )}
                {/* ─── UNKNOWN TYPE FALLBACK ─── */}
                {!hasMedia && item.type !== 'text' && (
                   <Text style={[styles.myMessageText, isMine ? styles.myMessageText : { color: colors.text }]}>
                    [{item.type}] {item.content || item.text}
                  </Text>
                )}
                {/* Meta details margin constraint for media */}
                {hasMediaPadding && <View style={{ height: 4 }} />}
              </View>
            )}

            {!hasMedia && (
              <View style={styles.messageMeta}>
                {item.isEdited && !isDeleted && (
                  <Text style={[styles.editedLabel, isMine ? styles.editedLabelMine : styles.editedLabelTheirs]}>{editedText || 'modifié'}</Text>
                )}
                <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMine && !isDeleted && (
                  <View style={styles.statusIcons}>
                    {item.status === 'read' ? (
                      <Ionicons name="checkmark-done" size={16} color="#000000" />
                    ) : item.status === 'delivered' ? (
                      <Ionicons name="checkmark-done" size={16} color="rgba(0,0,0,0.4)" />
                    ) : item.status === 'sent' ? (
                      <Ionicons name="checkmark" size={14} color="rgba(0,0,0,0.4)" />
                    ) : (
                      <Ionicons name="time-outline" size={14} color="rgba(0,0,0,0.4)" />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Reactions */}
            {item.reactions && Object.keys(item.reactions).length > 0 && (
              <View style={[styles.reactionsWrapper, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                {Object.entries(item.reactions).map(([emoji, users]: [string, any]) => (
                  <Pressable 
                    key={emoji} 
                    style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onLongPress={() => toggleReaction(item._id, emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {users.length > 1 && <Text style={[styles.reactionCount, { color: colors.text }]}>{users.length}</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Swipeable>
  </AnimatedRN.View>
);
});

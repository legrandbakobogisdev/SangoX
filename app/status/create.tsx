import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, Pressable, TextInput, Dimensions, 
  KeyboardAvoidingView, Platform, StatusBar, Modal, FlatList, 
  ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { 
  ChevronRight, 
  Lock, 
  User, 
  Check, 
  Globe, 
  ArrowLeft,
  Settings,
  Shield,
  Eye,
  MoreHorizontal,
  Plus,
  Palette,
  Send,
  Image as ImageIcon
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import StoryService from '@/services/StoryService';
import MediaService from '@/services/MediaService';
import { ApiService } from '@/services/api';
import ContactService, { ContactItem as DeviceContact } from '@/services/ContactService';

const { width, height } = Dimensions.get('window');

type VisibilityMode = 'my_contacts' | 'my_contacts_except' | 'only_share_with';

const BG_COLORS = [
  '#0f3460', '#1a1a2e', '#16213e', '#533483', '#e94560',
  '#0a3d62', '#1B1464', '#6D214F', '#182C61', '#2C3A47',
  '#006266', '#833471', '#4a69bd', '#e55039', '#b71540',
];

export default function CreateStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { conversations } = useChat();

  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Privacy state
  const [visibility, setVisibility] = useState<VisibilityMode>('my_contacts');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerMode, setContactPickerMode] = useState<'except' | 'only'>('except');

  // Derived contact list from conversations
  const [contactsList, setContactsList] = useState<any[]>([]);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        // Use device contacts if possible
        const fetched = await ContactService.getDeviceContacts();
        if (fetched.length > 0) {
          const allPhoneNumbers = fetched.flatMap(c => c.phoneNumbers);
          const registeredData = await ContactService.syncWithBackend(allPhoneNumbers);
          const registeredUsers = Array.isArray(registeredData) ? registeredData : (registeredData?.data || []);
          
          const mapped = fetched
            .map((contact: DeviceContact) => {
              const registeredUser = registeredUsers.find((reg: any) => 
                contact.phoneNumbers.includes(reg.phoneNumber)
              );
              if (!registeredUser) return null;
              return {
                _id: registeredUser.userId || registeredUser._id,
                name: contact.name,
                phoneNumber: registeredUser.phoneNumber || contact.phoneNumbers[0],
                avatar: registeredUser.profilePhotoUrl || contact.image
              };
            })
            .filter(Boolean) as any[];

          if (mapped.length > 0) {
            setContactsList(mapped);
            setLoading(false);
            return;
          }
        }

        // Fallback to active conversations if no device contacts synced
        if (!user?._id || !conversations) {
          setLoading(false);
          return;
        }
        const contactMap = new Map<string, any>();
        conversations.forEach(conv => {
            const participants = (conv as any).participantDetails || conv.participants;
            if (participants && Array.isArray(participants)) {
              participants.forEach((p: any) => {
                const id = typeof p === 'string' ? p : p._id || p.id;
                if (id !== user._id && !contactMap.has(id)) {
                  contactMap.set(id, {
                    _id: id,
                    name: typeof p === 'object' ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.username || id : id,
                    phoneNumber: typeof p === 'object' ? p.phoneNumber : '',
                    avatar: typeof p === 'object' ? p.profilePicture || p.profilePhotoUrl : null,
                  });
                }
              });
            }
        });
        setContactsList(Array.from(contactMap.values()));
      } catch (err) {
        console.warn('Failed to load contacts for privacy picker', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadContacts();
  }, [conversations, user?._id]);

  // Load user's saved privacy settings on mount
  useEffect(() => {
    if (user?.privacy?.storyVisibility) {
      setVisibility(user.privacy.storyVisibility as VisibilityMode);
      if (user.privacy.storyExcept) setSelectedContacts(user.privacy.storyExcept);
      else if (user.privacy.storyOnlyShareWith) setSelectedContacts(user.privacy.storyOnlyShareWith);
    }
  }, [user]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      
      try {
        const limits = await MediaService.getLimits();
        if (asset.fileSize && asset.fileSize > limits.maxFileSize) {
          const limitMb = limits.maxFileSize / (1024 * 1024);
          Alert.alert(
            'Fichier trop volumineux',
            `La taille maximale autorisée est de ${limitMb} Mo. ${limits.isPremium ? '' : 'Passez au Premium pour envoyer jusqu\'à 100 Mo.'}`
          );
          return;
        }
      } catch (e) {
        console.warn('Could not fetch limits, proceeding anyway', e);
      }
      
      setImage(asset.uri);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handlePrivacySelect = (mode: VisibilityMode) => {
    setVisibility(mode);
    if (mode === 'my_contacts') {
      setSelectedContacts([]);
      setShowPrivacyModal(false);
    } else if (mode === 'my_contacts_except') {
      setContactPickerMode('except');
      setShowPrivacyModal(false);
      setTimeout(() => setShowContactPicker(true), 300);
    } else {
      setContactPickerMode('only');
      setShowPrivacyModal(false);
      setTimeout(() => setShowContactPicker(true), 300);
    }
  };

  const confirmContactSelection = () => {
    setShowContactPicker(false);
  };

  const getPrivacyLabel = () => {
    switch (visibility) {
      case 'my_contacts': return 'Mes contacts';
      case 'my_contacts_except': return `Sauf ${selectedContacts.length}`;
      case 'only_share_with': return `Partager avec ${selectedContacts.length}`;
    }
  };

  const handlePublish = async () => {
    if (!text && !image) return;
    try {
      setIsPublishing(true);
      
      let uploadedUrl = image;
      let mediaMetadata = {};

      if (image && image.startsWith('file://') || image?.startsWith('/')) {
        // We need to upload the image first
        const uploadResponse = await MediaService.uploadFile(image, 'story');
        uploadedUrl = uploadResponse.url;
        mediaMetadata = {
          publicId: uploadResponse.publicId,
          mediaId: uploadResponse.mediaId,
          type: uploadResponse.type
        };
      }

      const payload: any = {
        type: image ? 'image' : 'text',
        content: uploadedUrl || text,
        mediaParams: { 
          backgroundColor: !image ? bgColor : undefined, 
          text: image ? text : undefined, 
          uri: uploadedUrl,
          ...mediaMetadata
        },
        visibility,
      };
      
      if (visibility === 'my_contacts_except' && selectedContacts.length > 0) payload.excludedViewers = selectedContacts;
      else if (visibility === 'only_share_with' && selectedContacts.length > 0) payload.allowedViewers = selectedContacts;
      
      await StoryService.createStory(payload);
      router.back();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to publish story');
    } finally {
      setIsPublishing(false);
    }
  };

  const statusPrivacyOptions = [
    { key: 'my_contacts', title: 'Mes contacts', desc: 'Tout le monde voit', icon: <User size={20} color={colors.text} />, color: colors.secondary },
    { key: 'my_contacts_except', title: 'Mes contacts sauf…', desc: 'Exclure certains contacts', icon: <Lock size={20} color="#FF9800" />, color: 'rgba(255,152,0,0.1)' },
    { key: 'only_share_with', title: 'Partager uniquement avec…', desc: 'Sélectionner des contacts', icon: <Globe size={20} color={colors.primary} />, color: `${colors.primary}20` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: image ? '#000' : bgColor }]}>
      <StatusBar barStyle="light-content" />
      
      {image && (
        <>
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </>
      )}

      <KeyboardAvoidingView 
        style={[styles.safeArea, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 10) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Nouveau Statut</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <TextInput
            style={styles.textInput}
            placeholder="Quoi de neuf ?"
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            value={text}
            onChangeText={setText}
            autoFocus={false}
          />
        </View>

        {!image && showColorPicker && (
          <View style={styles.colorPickerFloating}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {BG_COLORS.map(c => (
                  <Pressable 
                    key={c} 
                    onPress={() => setBgColor(c)} 
                    style={[styles.colorItem, { backgroundColor: c }, bgColor === c && styles.colorItemActive]} 
                  />
                ))}
             </ScrollView>
          </View>
        )}

        <View style={styles.bottomBar}>
          <View style={styles.tools}>
            <Pressable style={styles.toolBtn} onPress={pickImage}>
              <ImageIcon size={20} color="#FFF" />
            </Pressable>

            {!image && (
              <Pressable 
                style={[styles.toolBtn, showColorPicker && { backgroundColor: `${colors.primary}60` }]} 
                onPress={() => setShowColorPicker(!showColorPicker)}
              >
                <Palette size={20} color="#FFF" />
              </Pressable>
            )}
            
            <Pressable 
              style={styles.privacyPill} 
              onPress={() => setShowPrivacyModal(true)}
            >
              <Text style={styles.privacyPillText}>{getPrivacyLabel()}</Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <Pressable 
            style={[styles.publishBtn, { opacity: (text || image) && !isPublishing ? 1 : 0.6 }]}
            disabled={(!text && !image) || isPublishing}
            onPress={handlePublish}
          >
            {isPublishing ? <ActivityIndicator size="small" color="#000" /> : <Send size={22} color="#000" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPrivacyModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitleText, { color: colors.text }]}>Qui peut voir mes statuts ?</Text>
            
            <View style={styles.sheetOptions}>
              {statusPrivacyOptions.map((opt) => (
                <Pressable 
                  key={opt.key} 
                  style={({ pressed }) => [
                    styles.settingsLikeRow, 
                    visibility === opt.key && { backgroundColor: `${colors.primary}10` },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => handlePrivacySelect(opt.key as VisibilityMode)}
                >
                  <View style={[styles.settingsLikeIconBox, { backgroundColor: opt.color }]}>
                    {opt.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsLikeLabel, { color: colors.text }]}>{opt.title}</Text>
                    <Text style={[styles.settingsLikeDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
                  </View>
                  {visibility === opt.key && <Check size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showContactPicker} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.contactPickerRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowContactPicker(false)} style={styles.pickerClose}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
               <Text style={[styles.pickerTitle, { color: colors.text }]}>
                 {contactPickerMode === 'except' ? 'Exclure' : 'Partager avec'}
               </Text>
               <Text style={[styles.pickerInfo, { color: colors.textMuted }]}>
                 {selectedContacts.length} sélectionnés
               </Text>
            </View>
            <Pressable 
              style={[styles.pickerDoneBtn, { backgroundColor: colors.primary }]}
              onPress={confirmContactSelection}
            >
              <Text style={styles.pickerDoneBtnText}>OK</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={contactsList}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.pickerFlatList}
              renderItem={({ item }) => {
                const isSelected = selectedContacts.includes(item._id);
                return (
                  <Pressable 
                    style={[styles.pickerContactRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => toggleContact(item._id)}
                  >
                    <View style={[styles.pickerAvatar, { backgroundColor: colors.secondary }]}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={StyleSheet.absoluteFill} />
                      ) : (
                        <User size={24} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.pickerContactName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.phoneNumber && (
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                          {item.phoneNumber}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.pickerRadio, 
                      { borderColor: isSelected ? colors.primary : colors.textMuted },
                      isSelected && { backgroundColor: colors.primary }
                    ]}>
                      {isSelected && <Check size={14} color="#FFF" />}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                    Aucun contact SangoX trouvé. Essayez de synchroniser vos contacts.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  textInput: { color: '#FFF', fontSize: 26, fontWeight: '700', textAlign: 'center', width: '100%' },
  
  colorPickerFloating: { position: 'absolute', bottom: 100, left: 0, right: 0 },
  colorRow: { paddingHorizontal: 24, gap: 14, alignItems: 'center' },
  colorItem: { width: 34, height: 34, borderRadius: 17 },
  colorItemActive: { transform: [{ scale: 1.3 }] },

  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  privacyPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  privacyPillText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  publishBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.2)', alignSelf: 'center', marginBottom: 24 },
  sheetTitleText: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sheetOptions: { gap: 4 },
  
  settingsLikeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 4 },
  settingsLikeIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingsLikeLabel: { fontSize: 16, fontWeight: '700' },
  settingsLikeDesc: { fontSize: 13, marginTop: 2 },

  contactPickerRoot: { flex: 1 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerClose: { padding: 4 },
  pickerTitle: { fontSize: 19, fontWeight: '800' },
  pickerInfo: { fontSize: 13, marginTop: 2 },
  pickerDoneBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  pickerDoneBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  
  pickerFlatList: { padding: 20 },
  pickerContactRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  pickerAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pickerContactName: { flex: 1, fontSize: 16, fontWeight: '700' },
  pickerRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});

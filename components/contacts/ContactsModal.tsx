import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SectionList, 
  Pressable, 
  Image, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Platform,
  Share
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { ArrowLeft, Search, User as UserIcon, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContactService, { ContactItem } from '@/services/ContactService';
import { useChat } from '@/context/ChatContext';
import { useRouter } from 'expo-router';

interface ContactsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { initiateConversation, setActiveConversation } = useChat();
  const router = useRouter();
  
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);

  useEffect(() => {
    if (visible) {
      loadContacts();
      setSelectedContact(null);
    } else {
      setSearchQuery('');
    }
  }, [visible]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const fetchedContacts = await ContactService.getDeviceContacts();
      
      const allPhoneNumbers = fetchedContacts.flatMap(c => c.phoneNumbers);
      
      const registeredData = await ContactService.syncWithBackend(allPhoneNumbers);
      const registeredUsers = Array.isArray(registeredData) ? registeredData : (registeredData?.data || []);
      
      const enrichedContacts = fetchedContacts.map(contact => {
        const registeredUser = registeredUsers.find((reg: any) => 
          contact.phoneNumbers.includes(reg.phoneNumber)
        );
        
        return {
          ...contact,
          isRegistered: !!registeredUser,
          userId: registeredUser?.userId || registeredUser?._id,
          image: registeredUser?.profilePhotoUrl || contact.image
        };
      });

      const sorted = enrichedContacts.sort((a, b) => {
        if (a.isRegistered && !b.isRegistered) return -1;
        if (!a.isRegistered && b.isRegistered) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(sorted);
      setFilteredContacts(sorted);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = ContactService.filterContacts(contacts, query);
    setFilteredContacts(filtered);
  };

  const handleDone = async () => {
    if (selectedContact && selectedContact.userId) {
      try {
        setLoading(true);
        const conversation = await initiateConversation(selectedContact.userId);
        setActiveConversation(conversation);
        onClose();
        router.push(`/chat/${conversation._id}`);
      } catch (error) {
        console.error('Failed to initiate conversation:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInvite = async (contact: ContactItem) => {
    try {
      const message = `Hey! Join me on SangoX, a premium real-time chat app. Download it here: https://sangox.app`;
      await Share.share({
        message,
        title: 'Invite to SangoX',
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
    }
  };

  const renderContactItem = ({ item }: { item: ContactItem }) => {
    const isSelected = selectedContact?.id === item.id;
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.row, 
          { 
            backgroundColor: isSelected ? `${colors.primary}15` : colors.surface, 
            borderColor: isSelected ? colors.primary : colors.border 
          },
          pressed && item.isRegistered && { opacity: 0.7 }
        ]}
        onPress={() => item.isRegistered && setSelectedContact(item)}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.secondary }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
                <UserIcon size={24} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.phoneNumbers[0] && (
            <Text style={[styles.rowDescription, { color: colors.textMuted }]} numberOfLines={1}>
              {item.phoneNumbers[0]}
            </Text>
          )}
        </View>
        
        {item.isRegistered ? (
          <View style={styles.radioWrapper}>
            <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.textMuted }]}>
              {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </View>
        ) : (
          <Pressable 
            style={({ pressed }) => [
              styles.inviteBtn, 
              { backgroundColor: colors.secondary },
              pressed && { opacity: 0.6 }
            ]}
            onPress={() => handleInvite(item)}
          >
            <Text style={[styles.inviteText, { color: colors.primary }]}>{t('invite')}</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet" 
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Premium Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerTop}>
            <Pressable 
              onPress={onClose} 
              style={({ pressed }) => [
                styles.headerBtn,
                pressed && { opacity: 0.6 }
              ]}
              hitSlop={15}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('select_contact')}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {contacts.length} {t('contacts')}
              </Text>
            </View>
            
            {selectedContact ? (
              <Pressable 
                style={({ pressed }) => [
                  styles.doneBtn, 
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleDone}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.headerBtn} hitSlop={15}>
                <Search size={24} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {!loading && contacts.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F0F2F5' }]}>
              <Search size={18} color={theme === 'dark' ? '#8696A0' : '#54656F'} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('search_contacts')}
                placeholderTextColor={theme === 'dark' ? '#8696A0' : '#54656F'}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={false}
              />
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('loading_contacts')}</Text>
          </View>
        ) : filteredContacts.length > 0 ? (
          <SectionList
            sections={[
              { 
                title: t('on_sangox'), 
                data: filteredContacts.filter(c => c.isRegistered) 
              },
              { 
                title: t('invite_friends'), 
                data: filteredContacts.filter(c => !c.isRegistered) 
              },
            ].filter(section => section.data.length > 0)}
            renderItem={renderContactItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
              </View>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <UserIcon size={48} color={theme === 'dark' ? '#3B4A54' : '#E9EDEF'} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? t('no_contacts_found') : t('no_contacts')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  doneText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: Spacing.xxl, 
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  avatarContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    overflow: 'hidden'
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { 
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: { 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 2,
  },
  rowDescription: { 
    fontSize: 13, 
  },
  radioWrapper: {
    paddingLeft: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.lg,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  inviteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inviteText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});

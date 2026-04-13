import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, Search, Send, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

export default function ForwardScreen() {
  const { messageId } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { conversations, forwardMessage } = useChat();
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const name = c.name || (c.type === 'individual' ? 'Chat' : (c.groupMetadata?.name || 'Group'));
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search]);

  const toggleSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleForward = async () => {
    if (selectedIds.length === 0) return;
    
    setSending(true);
    try {
      await forwardMessage(String(messageId), selectedIds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('success'), t('message_forwarded', 'Message transféré avec succès !'));
      router.back();
    } catch (error) {
      console.error('Forward Error:', error);
      Alert.alert(t('error'), t('forward_failed', 'Échec du transfert. Veuillez réessayer.'));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item._id);
    const displayName = item.name || (item.type === 'individual' ? t('chat') : (item.groupMetadata?.name || t('group')));
    const avatarUri = item.image || item.groupMetadata?.icon;

    return (
      <Pressable 
        onPress={() => toggleSelection(item._id)}
        style={({ pressed }) => [
          styles.chatItem, 
          { backgroundColor: isSelected ? colors.primary + '15' : 'transparent' },
          pressed && { opacity: 0.7 }
        ]}
      >
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
              <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: 'bold' }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isSelected && (
            <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
              <Check size={12} color="#000" />
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.chatType, { color: colors.textMuted }]}>
            {item.type === 'group' ? t('group') : t('individual')}
          </Text>
        </View>

        <View style={[styles.radioButton, { borderColor: isSelected ? colors.primary : colors.border }]}>
          {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{t('forward_to', 'Transférer à...')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.secondary + '50' }]}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder={t('search_placeHolder', 'Rechercher...')}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.textMuted }}>{t('no_conversations', 'Aucune conversation trouvée')}</Text>
          </View>
        }
      />

      {selectedIds.length > 0 && (
        <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.footerContent}>
            <Text style={[styles.selectedCount, { color: colors.text }]}>
              {selectedIds.length} {t('selected', 'sélectionné(s)')}
            </Text>
            <Pressable 
              onPress={handleForward}
              disabled={sending}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>{t('send', 'Envoyer')}</Text>
                  <Send size={18} color="#000" />
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatType: {
    fontSize: 12,
    marginTop: 2,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectedCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  sendBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});

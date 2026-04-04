import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {
    translation: {
      "chats": "Chats",
      "stories": "Stories",
      "new_chat": "New Chat",
      "new_contact": "New Contact",
      "new_community": "New Community",
      "add_story": "Add story",
      "cancel": "Cancel",
      "typing": "Typing...",
      "reply": "Reply",
      "copy": "Copy",
      "forward": "Forward",
      "delete": "Delete",
      "select_reaction": "React",
      "search": "Search",
      "settings": "Settings",
      "theme": "Theme",
      "language": "Language"
    }
  },
  fr: {
    translation: {
      "chats": "Discussions",
      "stories": "Stories",
      "new_chat": "Nouveau message",
      "new_contact": "Nouveau contact",
      "new_community": "Nouvelle communauté",
      "add_story": "Ajouter story",
      "cancel": "Annuler",
      "typing": "Écrit...",
      "reply": "Répondre",
      "copy": "Copier",
      "forward": "Transférer",
      "delete": "Supprimer",
      "select_reaction": "Réagir",
      "search": "Rechercher",
      "settings": "Paramètres",
      "theme": "Thème",
      "language": "Langue"
    }
  },
  id: {
    translation: {
      "chats": "Mengobrol",
      "stories": "Cerita",
      "new_chat": "Chat Baru",
      "new_contact": "Kontak Baru",
      "new_community": "Komunitas Baru",
      "add_story": "Tambah cerita",
      "cancel": "Batal",
      "typing": "Mengetik...",
      "reply": "Balas",
      "copy": "Salin",
      "forward": "Teruskan",
      "delete": "Hapus",
      "select_reaction": "Bereaksi",
      "search": "Cari",
      "settings": "Pengaturan",
      "theme": "Tema",
      "language": "Bahasa"
    }
  }
};

// Initialize i18n IMMEDIATELY and SYNCHRONOUSLY
// This prevents "NO_I18NEXT_INSTANCE" warning
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0]?.languageCode || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Asynchronously load saved language
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.warn('I18n: Failed to load language from AsyncStorage:', error);
  }
};

loadSavedLanguage();

export default i18n;

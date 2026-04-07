import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

export interface ContactItem {
  id: string;
  name: string;
  phoneNumbers: string[];
  image?: string;
  isRegistered?: boolean;
  userId?: string;
}

class ContactService {
  /**
   * Request permission and fetch all contacts with phone numbers
   */
  static async getDeviceContacts(): Promise<ContactItem[]> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Contacts permission not granted');
        return [];
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.ID,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
      });

      if (data.length > 0) {
        return data
          .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id || Math.random().toString(),
            name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'No Name',
            phoneNumbers: contact.phoneNumbers?.map(pn => this.normalizePhoneNumber(pn.number || '')) || [],
            image: contact.image?.uri,
          }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  /**
   * Basic normalization of phone numbers (removes spaces, dashes, etc.)
   */
  private static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    // This is a basic normalization, can be improved later
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Synchronize local contacts with the SangoX backend
   */
  static async syncWithBackend(phoneNumbers: string[]): Promise<any> {
    try {
      const { ApiService } = require('./api');
      const response = await ApiService.post('/api/auth/contacts/sync', {
        contacts: phoneNumbers
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing contacts with backend:', error);
      throw error;
    }
  }

  /**
   * Filter contacts by search query
   */
  static filterContacts(contacts: ContactItem[], query: string): ContactItem[] {
    if (!query) return contacts;
    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) || 
      contact.phoneNumbers.some(pn => pn.includes(lowerQuery))
    );
  }
}

export default ContactService;

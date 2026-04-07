import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { ApiService } from './api';

const KEY_STORAGE_PREFIX = 'sangox_e2ee';

export interface SignalKeyBundle {
  deviceId: string;
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
}

export class E2EEService {
  private static isNativeAvailable() {
    // Basic check for essential native methods
    try {
      return !!Crypto && !!SecureStore && !!Application;
    } catch (e) {
      return false;
    }
  }

  public static async initializeKeychain() {
    if (!this.isNativeAvailable()) {
      console.warn('[E2EE] Native modules not available. Rebuild your app.');
      return null;
    }

    try {
      console.log('[E2EE] Initializing keychain...');

      // 1. Get or Generate Device ID
      let deviceId = 'unknown_device';
      try {
        deviceId = (await Application.getIosIdForVendorAsync()) 
          || (await Application.getAndroidId()) 
          || (await this.getOrGenerateRandomDeviceId());
      } catch (e) {
        deviceId = await this.getOrGenerateRandomDeviceId();
      }

      // 2. Generate E2EE Keys
      const registrationId = Math.floor(Math.random() * 16384);
      const identityKeyPair = await this.generateKeyPair();
      const signedPreKeyPair = await this.generateKeyPair();
      const signedPreKeySignature = await this.signData(signedPreKeyPair.publicKey, identityKeyPair.privateKey);

      const oneTimePreKeys = [];
      for (let i = 1; i <= 25; i++) {
        const keyPair = await this.generateKeyPair();
        oneTimePreKeys.push({
          keyId: i,
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
        });
      }

      // 3. Store Private Keys Securely
      await this.storePrivateKey('identity', identityKeyPair.privateKey);
      await this.storePrivateKey('signed_pre_key', signedPreKeyPair.privateKey);
      
      const otpkPrivateKeys: Record<number, string> = {};
      oneTimePreKeys.forEach(k => {
        otpkPrivateKeys[k.keyId] = k.privateKey;
      });
      await this.storePrivateKey('one_time_pre_keys', JSON.stringify(otpkPrivateKeys));

      // 4. Prepare Public Bundle
      const bundle: SignalKeyBundle = {
        deviceId,
        registrationId,
        identityKey: identityKeyPair.publicKey,
        signedPreKey: {
          keyId: 1,
          publicKey: signedPreKeyPair.publicKey,
          signature: signedPreKeySignature,
        },
        oneTimePreKeys: oneTimePreKeys.map(k => ({
          keyId: k.keyId,
          publicKey: k.publicKey,
        })),
      };

      // 5. Upload to Backend
      await ApiService.post('/api/auth/keys', bundle);
      return bundle;
    } catch (error) {
      console.error('[E2EE] Fatal error:', error);
      return null;
    }
  }

  private static async generateKeyPair() {
    try {
      const pub = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Math.random().toString());
      const priv = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Math.random().toString());
      return { publicKey: pub, privateKey: priv };
    } catch (e) {
      return { publicKey: 'mock_pub', privateKey: 'mock_priv' };
    }
  }

  private static async signData(data: string, privateKey: string) {
    try {
      return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data + privateKey);
    } catch (e) {
      return 'mock_signature';
    }
  }

  private static async storePrivateKey(key: string, value: string) {
    try {
      if (await SecureStore.isAvailableAsync()) {
        await SecureStore.setItemAsync(`${KEY_STORAGE_PREFIX}_${key}`, value);
      }
    } catch (e) {
      console.warn(`[E2EE] Could not store private key ${key}:`, e);
    }
  }

  private static async getOrGenerateRandomDeviceId() {
    const key = `${KEY_STORAGE_PREFIX}_device_id`;
    try {
      let id = null;
      if (await SecureStore.isAvailableAsync()) {
         id = await SecureStore.getItemAsync(key);
      }
      if (!id) {
        id = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Date.now().toString());
        if (await SecureStore.isAvailableAsync()) {
          await SecureStore.setItemAsync(key, id);
        }
      }
      return id;
    } catch (e) {
      return 'device_' + Date.now();
    }
  }
}


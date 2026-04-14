import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { ApiService } from './api';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

// Inject expo-crypto PRNG into tweetnacl (React Native has no crypto.getRandomValues)
nacl.setPRNG((x: Uint8Array, n: number) => {
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

const KEY_STORAGE_PREFIX = 'sangox_e2ee';

export interface SignalKeyBundle {
  deviceId: string;
  registrationId: number;
  identityKey: string; // Base64
  signedPreKey: {
    keyId: number;
    publicKey: string; // Base64
    signature: string; // Base64
  };
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
}

export class E2EEService {
  private static isNativeAvailable() {
    try {
      return !!Crypto && !!SecureStore && !!Application;
    } catch (e) {
      return false;
    }
  }

  /**
   * Initializes the E2EE keys, stores them securely, and uploads the public bundle.
   */
  public static async initializeKeychain() {
    if (!this.isNativeAvailable()) {
      console.warn('[E2EE] Native modules not available.');
      return null;
    }

    try {
      console.log('[E2EE] Generating Signal-style key bundle...');

      // 1. Get or Generate Device ID
      let deviceId = 'unknown_device';
      try {
        deviceId = (await Application.getIosIdForVendorAsync()) 
          || (await Application.getAndroidId()) 
          || (await this.getOrGenerateRandomDeviceId());
      } catch (e) {
        deviceId = await this.getOrGenerateRandomDeviceId();
      }

      const registrationId = Math.floor(Math.random() * 16384);

      // 2. Generate Long-term Identity Key (Curve25519 for DH key exchange)
      const identityKeyPair = nacl.box.keyPair();
      
      // 3. Generate Signed PreKey (Curve25519 for encryption)
      const signedPreKeyPair = nacl.box.keyPair();
      // Sign the signed prekey with identity key using HMAC-like approach
      const signedPreKeySignature = nacl.hash(Buffer.from(
        Buffer.from(signedPreKeyPair.publicKey).toString('base64') + 
        Buffer.from(identityKeyPair.secretKey).toString('base64')
      ));

      // 4. Generate One-Time PreKeys (Curve25519)
      const oneTimePreKeys = [];
      const otpkPrivateKeys: Record<number, string> = {};
      
      for (let i = 1; i <= 100; i++) {
        const keyPair = nacl.box.keyPair();
        oneTimePreKeys.push({
          keyId: i,
          publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
        });
        otpkPrivateKeys[i] = Buffer.from(keyPair.secretKey).toString('base64');
      }

      // 5. Store Private Keys Securely
      await this.storePrivateKey('identity_secret', Buffer.from(identityKeyPair.secretKey).toString('base64'));
      await this.storePrivateKey('identity_public', Buffer.from(identityKeyPair.publicKey).toString('base64'));
      await this.storePrivateKey('signed_pre_key_secret', Buffer.from(signedPreKeyPair.secretKey).toString('base64'));
      await this.storePrivateKey('one_time_pre_keys', JSON.stringify(otpkPrivateKeys));
      await this.storePrivateKey('registration_id', registrationId.toString());

      // 6. Prepare Public Bundle
      const bundle: SignalKeyBundle = {
        deviceId,
        registrationId,
        identityKey: Buffer.from(identityKeyPair.publicKey).toString('base64'),
        signedPreKey: {
          keyId: 1,
          publicKey: Buffer.from(signedPreKeyPair.publicKey).toString('base64'),
          signature: Buffer.from(signedPreKeySignature).toString('base64').slice(0, 64),
        },
        oneTimePreKeys,
      };

      // 7. Upload to Backend
      console.log('[E2EE] Uploading public bundle to server...');
      await ApiService.post('/api/auth/keys', bundle);
      
      console.log('[E2EE] Keychain initialized and uploaded successfully.');
      return bundle;
    } catch (error) {
      console.error('[E2EE] Fatal error during initialization:', error);
      return null;
    }
  }


  /**
   * Checks current OTPK stock on server and replenishes if below threshold
   */
  public static async checkAndReplenishKeys() {
    try {
      const response: any = await ApiService.get('/api/auth/keys/status');
      const { count } = response.data;

      if (count < 10) {
        console.log(`[E2EE] Keys running low (${count}). Replenishing...`);
        const newKeys = [];
        const otpkPrivateKeysB64 = await this.getPrivateKey('one_time_pre_keys');
        const otpkPrivateKeys = otpkPrivateKeysB64 ? JSON.parse(otpkPrivateKeysB64) : {};

        const startId = Math.max(...Object.keys(otpkPrivateKeys).map(Number), 0) + 1;

        for (let i = 0; i < 100; i++) {
          const id = startId + i;
          const keyPair = nacl.box.keyPair();
          newKeys.push({
            keyId: id,
            publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
          });
          otpkPrivateKeys[id] = Buffer.from(keyPair.secretKey).toString('base64');
        }

        await ApiService.post('/api/auth/keys/replenish', { oneTimePreKeys: newKeys });
        await this.storePrivateKey('one_time_pre_keys', JSON.stringify(otpkPrivateKeys));
        console.log('[E2EE] Replenishment successful.');
      }
    } catch (error) {
      console.error('[E2EE] Replenishment failed:', error);
    }
  }

  /**
   * Derives a shared secret for a new conversation (Alice side)
   */
  public static async establishSession(recipientId: string) {
    try {
      const response: any = await ApiService.get(`/api/auth/keys/${recipientId}`);
      const devices = response.data;
      if (!devices || !Array.isArray(devices) || devices.length === 0) {
        throw new Error('Recipient keys not found');
      }
      
      // Take the first device's key bundle
      const recipientBundle = devices[0];
      if (!recipientBundle.identityKey) {
        throw new Error('Recipient identity key missing');
      }

      const ourIdentitySecretB64 = await this.getPrivateKey('identity_secret');
      if (!ourIdentitySecretB64) throw new Error('Local keys not initialized');

      const ourSecretKey = Buffer.from(ourIdentitySecretB64, 'base64');
      const recipientPubKey = Buffer.from(recipientBundle.identityKey, 'base64');

      // Curve25519 Diffie-Hellman key exchange
      const sharedSecret = nacl.scalarMult(ourSecretKey, recipientPubKey);
      
      return { 
        sessionId: `${recipientId}_session`, 
        sharedSecret: Buffer.from(sharedSecret).toString('base64'),
        recipientIdentityKey: recipientBundle.identityKey
      };
    } catch (error) {
      console.error('[E2EE] Session establishment failed:', error);
      return null;
    }
  }

  /**
   * Encrypts a message
   */
  public static async encryptMessage(message: string, sharedSecretB64: string) {
    try {
      const sharedSecret = Buffer.from(sharedSecretB64, 'base64');
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const messageUint8 = Buffer.from(message, 'utf-8');
      const encrypted = nacl.secretbox(messageUint8, nonce, sharedSecret);
      
      const ourIdentityPub = await this.getPrivateKey('identity_public');

      return {
        content: Buffer.from(encrypted).toString('base64'),
        nonce: Buffer.from(nonce).toString('base64'),
        senderIdentityKey: ourIdentityPub // Tell recipient who we are
      };
    } catch (error) {
      console.error('[E2EE] Encryption failed:', error);
      return null;
    }
  }

  /**
   * Decrypts a message (Symmetric DH derivation)
   */
  public static async decryptMessage(encryptedB64: string, nonceB64: string, partnerIdentityKeyB64: string) {
    try {
      const ourIdentitySecretB64 = await this.getPrivateKey('identity_secret');
      if (!ourIdentitySecretB64) throw new Error('Local keys not initialized');
      
      const ourSecretKey = Buffer.from(ourIdentitySecretB64, 'base64');
      const partnerPubKey = Buffer.from(partnerIdentityKeyB64, 'base64');
      
      // Derive the same shared secret (Curve25519 DH)
      const sharedSecret = nacl.scalarMult(ourSecretKey, partnerPubKey);
      
      const nonce = Buffer.from(nonceB64, 'base64');
      const encrypted = Buffer.from(encryptedB64, 'base64');
      
      const decrypted = nacl.secretbox.open(encrypted, nonce, sharedSecret);
      if (!decrypted) throw new Error('Decryption failed');
      
      return Buffer.from(decrypted).toString('utf-8');
    } catch (error) {
      console.error('[E2EE] Decryption failed:', error);
      return '[Message chiffré - Clé manquante]';
    }
  }

  private static async storePrivateKey(key: string, value: string) {
    try {
      if (await SecureStore.isAvailableAsync()) {
        await SecureStore.setItemAsync(`${KEY_STORAGE_PREFIX}_${key}`, value);
      }
    } catch (e) {
      console.warn(`[E2EE] Storage failed for ${key}:`, e);
    }
  }

  private static async getPrivateKey(key: string): Promise<string | null> {
    try {
      if (await SecureStore.isAvailableAsync()) {
        return await SecureStore.getItemAsync(`${KEY_STORAGE_PREFIX}_${key}`);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private static async getOrGenerateRandomDeviceId() {
    const key = `${KEY_STORAGE_PREFIX}_device_id`;
    try {
      let id = await this.getPrivateKey('device_id');
      if (!id) {
        const randomValues = await Crypto.getRandomBytesAsync(32);
        id = Buffer.from(randomValues).toString('hex');
        await this.storePrivateKey('device_id', id);
      }
      return id;
    } catch (e) {
       return 'dev_' + Math.random().toString(36).substring(7);
    }
  }
}

/**
 * Client-side encryption for PHI (Personally Identifiable Information).
 *
 * IMPORTANT: This module handles all encryption/decryption of student data.
 * PHI should NEVER be sent to the server in plaintext.
 *
 * Key derivation:
 * - Password -> Argon2id (via server) -> Master Key
 * - Master Key -> KEK (Key Encryption Key)
 * - KEK encrypts DEK (Data Encryption Key)
 * - DEK encrypts actual data
 *
 * For simplicity in this implementation, we derive keys directly from
 * the password using PBKDF2 with Web Crypto API.
 */

// Encode/decode utilities
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Derive an encryption key from a password using PBKDF2.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random IV for AES-GCM encryption.
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt data using AES-256-GCM.
 *
 * @param data - The plaintext data to encrypt
 * @param key - The CryptoKey to use for encryption
 * @returns Object containing encrypted data and IV (both base64 encoded)
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const iv = generateIV();
  const encodedData = stringToArrayBuffer(data);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt data using AES-256-GCM.
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @param iv - Base64 encoded initialization vector
 * @param key - The CryptoKey to use for decryption
 * @returns The decrypted plaintext string
 */
export async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  );

  return arrayBufferToString(decryptedBuffer);
}

/**
 * CryptoManager class for managing encryption keys and operations.
 *
 * Usage:
 * 1. Call initialize() with user's password after login
 * 2. Use encryptData() to encrypt PHI before sending to server
 * 3. Use decryptData() to decrypt PHI received from server
 * 4. Call clear() on logout
 */
class CryptoManager {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  /**
   * Initialize the crypto manager with a password.
   * Call this after successful login.
   *
   * @param password - User's password
   * @param existingSalt - Optional existing salt (base64). If not provided, generates new.
   * @returns The salt used (base64 encoded) - store this for key recovery
   */
  async initialize(password: string, existingSalt?: string): Promise<string> {
    if (existingSalt) {
      this.salt = new Uint8Array(base64ToArrayBuffer(existingSalt));
    } else {
      this.salt = generateSalt();
    }

    this.key = await deriveKey(password, this.salt);
    return arrayBufferToBase64(this.salt);
  }

  /**
   * Check if the manager is initialized with a key.
   */
  isInitialized(): boolean {
    return this.key !== null;
  }

  /**
   * Encrypt data for storage on server.
   *
   * @param data - Object or string to encrypt
   * @returns Object with encrypted data and IV (both base64)
   */
  async encryptData(data: unknown): Promise<{ encrypted: string; iv: string }> {
    if (!this.key) {
      throw new Error('CryptoManager not initialized. Call initialize() first.');
    }

    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    return encrypt(jsonData, this.key);
  }

  /**
   * Decrypt data received from server.
   *
   * @param encryptedData - Base64 encoded encrypted data
   * @param iv - Base64 encoded IV
   * @returns Decrypted data (parsed as JSON if valid)
   */
  async decryptData<T = unknown>(encryptedData: string, iv: string): Promise<T> {
    if (!this.key) {
      throw new Error('CryptoManager not initialized. Call initialize() first.');
    }

    const decrypted = await decrypt(encryptedData, iv, this.key);

    // Try to parse as JSON, return as string if that fails
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as T;
    }
  }

  /**
   * Clear the encryption key from memory.
   * Call this on logout.
   */
  clear(): void {
    this.key = null;
    this.salt = null;
  }
}

// Export singleton instance
export const cryptoManager = new CryptoManager();

// Export utilities for direct use
export { arrayBufferToBase64, base64ToArrayBuffer };

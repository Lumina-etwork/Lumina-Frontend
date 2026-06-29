export interface EncryptedEnvelope {
  iv: string; // Base64
  salt: string; // Base64
  ciphertext: string; // Base64
  version: number;
}

// Helper utilities for ArrayBuffer <-> Base64/String conversions
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a session token using PBKDF2.
 */
export async function deriveSessionKey(sessionToken: string, customSalt?: ArrayBuffer): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const tokenBytes = textEncoder.encode(sessionToken);
  const salt = customSalt ? new Uint8Array(customSalt) : window.crypto.getRandomValues(new Uint8Array(16));

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    tokenBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // Key is non-extractable for security
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

/**
 * Encrypts a plaintext string using AES-GCM 256-bit with a session key.
 */
export async function encryptField(plaintext: string, sessionKey: CryptoKey, salt: Uint8Array): Promise<EncryptedEnvelope> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedPlaintext = textEncoder.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sessionKey,
    encodedPlaintext
  );

  return {
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    ciphertext: bufferToBase64(ciphertextBuffer as ArrayBuffer),
    version: 1,
  };
}

/**
 * Decrypts an EncryptedEnvelope back into a plaintext string.
 */
export async function decryptField(envelope: EncryptedEnvelope, sessionKey: CryptoKey): Promise<string> {
  if (envelope.version !== 1) {
    throw new Error(`Unsupported encryption version: ${envelope.version}`);
  }

  const iv = new Uint8Array(base64ToBuffer(envelope.iv));
  const ciphertext = base64ToBuffer(envelope.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sessionKey,
    ciphertext
  );

  return textDecoder.decode(decryptedBuffer);
}
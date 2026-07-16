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
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface SensitiveFieldSchema {
  [key: string]: boolean | SensitiveFieldSchema;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a session token using PBKDF2.
 * The default salt is deterministic so the same token produces the same key across reloads.
 */
const DEFAULT_PBKDF2_SALT = textEncoder.encode('lumina-frontend-session-encryption-v1');
const PBKDF2_ITERATIONS = 600000;

export async function deriveSessionKey(sessionToken: string, customSalt?: ArrayBuffer): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const tokenBytes = textEncoder.encode(sessionToken);
  const salt = customSalt ? new Uint8Array(customSalt) : DEFAULT_PBKDF2_SALT;

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
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // Key is non-extractable for security
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

async function deriveKeyForEnvelope(envelope: EncryptedEnvelope, sessionToken: string): Promise<CryptoKey> {
  const salt = envelope.salt ? new Uint8Array(base64ToBuffer(envelope.salt)) : DEFAULT_PBKDF2_SALT;
  const { key } = await deriveSessionKey(sessionToken, salt.buffer);
  return key;
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
 * Encrypts a plaintext string directly from a session token.
 */
export async function encryptFieldWithSessionToken(
  plaintext: string,
  sessionToken: string
): Promise<EncryptedEnvelope> {
  const { key, salt } = await deriveSessionKey(sessionToken);
  return encryptField(plaintext, key, salt);
}

/**
 * Decrypts an encrypted envelope using a session token and the envelope's embedded salt.
 */
export async function decryptFieldWithSessionToken(
  envelope: EncryptedEnvelope,
  sessionToken: string
): Promise<string> {
  const key = await deriveKeyForEnvelope(envelope, sessionToken);
  return decryptField(envelope, key);
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

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    isPlainObject(value) &&
    typeof (value as Record<string, unknown>).iv === 'string' &&
    typeof (value as Record<string, unknown>).salt === 'string' &&
    typeof (value as Record<string, unknown>).ciphertext === 'string' &&
    typeof (value as Record<string, unknown>).version === 'number'
  );
}

async function encryptRecursive(
    value: unknown,
    schema: SensitiveFieldSchema,
    sessionKey: CryptoKey,
    salt: Uint8Array
  ): Promise<unknown> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => encryptRecursive(item, schema, sessionKey, salt)));
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const result: Record<string, unknown> = { ...value };

    for (const [key, rule] of Object.entries(schema)) {
      const current = result[key];
      if (rule === true) {
        if (typeof current === 'string') {
          result[key] = await encryptField(current, sessionKey, salt);
        }
      } else if (isPlainObject(rule) && current != null) {
        result[key] = await encryptRecursive(current, rule, sessionKey, salt);
      }
    }

    return result;
  }

  async function decryptRecursive(
  value: unknown,
  schema: SensitiveFieldSchema,
  sessionKey: CryptoKey
): Promise<unknown> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => decryptRecursive(item, schema, sessionKey)));
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const result: Record<string, unknown> = { ...value };

    for (const [key, rule] of Object.entries(schema)) {
      const current = result[key];
      if (rule === true) {
        if (current != null && isEncryptedEnvelope(current)) {
          result[key] = await decryptField(current, sessionKey);
        }
      } else if (isPlainObject(rule) && current != null) {
        result[key] = await decryptRecursive(current, rule, sessionKey);
      }
    }

    return result;
  }

  export async function encryptSensitiveObject(
    payload: unknown,
    schema: SensitiveFieldSchema,
    sessionKey: CryptoKey,
    salt: Uint8Array
  ): Promise<unknown> {
    return encryptRecursive(payload, schema, sessionKey, salt);
  }

  export async function decryptSensitiveObject(
    payload: unknown,
    schema: SensitiveFieldSchema,
    sessionKey: CryptoKey
  ): Promise<unknown> {
    return decryptRecursive(payload, schema, sessionKey);
  }

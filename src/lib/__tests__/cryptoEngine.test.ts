import { webcrypto } from 'crypto';

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

import {
  deriveSessionKey,
  decryptField,
  decryptFieldWithSessionToken,
  encryptField,
  encryptFieldWithSessionToken,
  encryptSensitiveObject,
  decryptSensitiveObject,
} from '../crypto/cryptoEngine';

describe('Web Crypto Client-Side Configuration Encryption', () => {
  const mockToken = 'wallet-auth-session-token-xyz-12345';
  const plainTextSecret = 'https://eth-mainnet.g.alchemy.com/v2/secret-api-key';

  it('should successfully execute an encrypt -> decrypt round-trip loop', async () => {
    const { key, salt } = await deriveSessionKey(mockToken);

    const envelope = await encryptField(plainTextSecret, key, salt);

    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('salt');
    expect(envelope).toHaveProperty('ciphertext');
    expect(envelope.version).toBe(1);

    const decryptedText = await decryptField(envelope, key);
    expect(decryptedText).toBe(plainTextSecret);
  });

  it('should fail decryption if a different session key is supplied', async () => {
    const { key: trueKey, salt } = await deriveSessionKey(mockToken);
    const { key: wrongKey } = await deriveSessionKey('completely-different-token');

    const envelope = await encryptField(plainTextSecret, trueKey, salt);

    await expect(decryptField(envelope, wrongKey)).rejects.toThrow();
  });

  it('should guarantee unique IV strings across independent invocations', async () => {
    const { key, salt } = await deriveSessionKey(mockToken);

    const envelope1 = await encryptField(plainTextSecret, key, salt);
    const envelope2 = await encryptField(plainTextSecret, key, salt);

    expect(envelope1.iv).not.toBe(envelope2.iv);
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
  });

  it('should derive the same salt for repeated session key derivation', async () => {
    const first = await deriveSessionKey(mockToken);
    const second = await deriveSessionKey(mockToken);

    expect(first.salt).toEqual(second.salt);
    expect(first.key).toBeDefined();
  });

  it('should decrypt envelopes by session token using embedded salt', async () => {
    const envelope = await encryptFieldWithSessionToken(plainTextSecret, mockToken);

    const decryptedText = await decryptFieldWithSessionToken(envelope, mockToken);
    expect(decryptedText).toBe(plainTextSecret);
  });

  it('should encrypt and decrypt nested sensitive payloads with schema-aware helpers', async () => {
    const { key, salt } = await deriveSessionKey(mockToken);
    const payload = {
      nodeName: 'public-node',
      apiKey: 'alpha-123',
      sshCredentials: {
        privateKey: 'ssh-secret',
        host: 'node.example.com',
      },
      metadata: {
        notes: 'do not encrypt',
      },
    };

    const schema = {
      apiKey: true,
      sshCredentials: {
        privateKey: true,
      },
    };

    const encryptedPayload = (await encryptSensitiveObject(payload, schema, key, salt)) as Record<string, unknown>;

    expect(typeof encryptedPayload.nodeName).toBe('string');
    expect((encryptedPayload.apiKey as Record<string, unknown>)?.ciphertext).toBeDefined();

    const sshCredentials = encryptedPayload.sshCredentials as Record<string, unknown> | undefined;
    const privateKeyEnvelope = sshCredentials?.privateKey as Record<string, unknown> | undefined;
    expect(privateKeyEnvelope?.ciphertext).toBeDefined();

    const decryptedPayload = (await decryptSensitiveObject(encryptedPayload, schema, key)) as typeof payload;
    expect(decryptedPayload.nodeName).toBe('public-node');
    expect(decryptedPayload.apiKey).toBe('alpha-123');
    expect(decryptedPayload.sshCredentials?.privateKey).toBe('ssh-secret');
    expect((decryptedPayload.metadata as Record<string, unknown>).notes).toBe('do not encrypt');
  });
});

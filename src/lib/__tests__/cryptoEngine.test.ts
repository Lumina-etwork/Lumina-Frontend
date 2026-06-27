import { describe, it, expect } from 'vitest'; // or jest
import { deriveSessionKey, encryptField, decryptField } from '../lib/crypto/cryptoEngine';

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
});
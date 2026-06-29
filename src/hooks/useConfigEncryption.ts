import { useEffect, useState, useRef } from 'react';
import { deriveSessionKey } from '../lib/crypto/cryptoEngine';

export function useConfigEncryption(sessionToken: string | null) {
  // We use a ref to prevent exposing the CryptoKey directly in state/DevTools snapshots
  const keyRef = useRef<WeakRef<CryptoKey> | null>(null);
  const saltRef = useRef<Uint8Array | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!sessionToken) {
      keyRef.current = null;
      saltRef.current = null;
      setIsReady(false);
      return;
    }

    async function initializeKey() {
      try {
        const { key, salt } = await deriveSessionKey(sessionToken!);
        if (isMounted) {
          keyRef.current = new WeakRef(key);
          saltRef.current = salt;
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize configuration encryption keys:', error);
        if (isMounted) setIsReady(false);
      }
    }

    initializeKey();

    return () => {
      isMounted = false;
      // Break references explicitly to allow GC execution
      keyRef.current = null;
      saltRef.current = null;
    };
  }, [sessionToken]);

  const getSessionKey = (): CryptoKey => {
    const key = keyRef.current?.deref();
    if (!key) {
      throw new Error('Encryption session key is unavailable or has been garbage collected.');
    }
    return key;
  };

  return {
    isReady,
    getSessionKey,
    getSalt: () => saltRef.current,
  };
}
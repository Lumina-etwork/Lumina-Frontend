import { useNodeConfigStore } from '../store/nodeConfigStore';
import { encryptField, decryptField } from '../lib/crypto/cryptoEngine';
import { saveToIndexedDB, loadFromIndexedDB } from '../lib/storage/idb';

// Define layout schema metadata
const CONFIG_SCHEMA: Record<string, { sensitive: boolean }> = {
  rpcEndpoint: { sensitive: true },
  apiKey: { sensitive: true },
  sshCredentials: { sensitive: true },
  nodeName: { sensitive: false },
};

export function useNodeConfig(getSessionKey: () => CryptoKey, getSalt: () => Uint8Array | null) {
  const store = useNodeConfigStore();

  const loadConfig = async (nodeId: string) => {
    const rawPayload = await loadFromIndexedDB(nodeId);
    if (!rawPayload) return null;

    const sessionKey = getSessionKey();
    const decryptedConfig: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawPayload)) {
      if (CONFIG_SCHEMA[key]?.sensitive && value && typeof value === 'object') {
        decryptedConfig[key] = await decryptField(value, sessionKey);
      } else {
        decryptedConfig[key] = value;
      }
    }

    store.startEditing(decryptedConfig);
  };

  const saveConfig = async (nodeId: string) => {
    if (!store.editingConfig) return;

    const sessionKey = getSessionKey();
    const salt = getSalt();
    if (!salt) throw new Error('Salt configuration missing');

    // Create shallow target object copy to execute transformations
    const payloadToPersist = { ...store.editingConfig };

    for (const [key, value] of Object.entries(payloadToPersist)) {
      if (CONFIG_SCHEMA[key]?.sensitive && typeof value === 'string') {
        // 1. Encrypt field mutation
        payloadToPersist[key] = await encryptField(value, sessionKey, salt);
        
        // 2. Strict Memory Hygiene: Purge plaintexts from the working copy immediately
        if (store.editingConfig[key]) {
          store.editingConfig[key] = null; 
          delete store.editingConfig[key];
        }
      }
    }

    // Persist finalized structural envelope safely to DB
    await saveToIndexedDB(nodeId, payloadToPersist);
    
    // Wipe out state trace fully
    store.clearEditor();
  };

  return {
    isEditorOpen: store.isEditorOpen,
    editingConfig: store.editingConfig,
    updateField: store.updateField,
    loadConfig,
    saveConfig,
    cancelEditing: store.clearEditor,
  };
}
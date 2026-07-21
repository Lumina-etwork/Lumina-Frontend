import { useNodeConfigStore } from '../store/nodeConfigStore';
import {
  decryptSensitiveObject,
  encryptSensitiveObject,
  SensitiveFieldSchema,
} from '../lib/crypto/cryptoEngine';
import { saveToIndexedDB, loadFromIndexedDB } from '../lib/storage/idb';

const CONFIG_SCHEMA: SensitiveFieldSchema = {
  rpcEndpoint: true,
  apiKey: true,
  sshCredentials: {
    privateKey: true,
    host: false,
  },
  nodeName: false,
};

export function useNodeConfig(getSessionKey: () => CryptoKey, getSalt: () => Uint8Array | null) {
  const store = useNodeConfigStore();

  const loadConfig = async (nodeId: string) => {
    const rawPayload = await loadFromIndexedDB(nodeId);
    if (!rawPayload) return null;

    const sessionKey = getSessionKey();
    const decryptedConfig = (await decryptSensitiveObject(rawPayload, CONFIG_SCHEMA, sessionKey)) as Record<string, unknown>;

    store.startEditing(decryptedConfig);
  };

  const saveConfig = async (nodeId: string) => {
    if (!store.editingConfig) return;

    const sessionKey = getSessionKey();
    const salt = getSalt();
    if (!salt) throw new Error('Salt configuration missing');

    const payloadToPersist = (await encryptSensitiveObject(
      { ...store.editingConfig },
      CONFIG_SCHEMA,
      sessionKey,
      salt
    )) as Record<string, unknown>;

    const wipePlaintext = (value: unknown, schema: SensitiveFieldSchema): void => {
      if (Array.isArray(value)) {
        value.forEach((item) => wipePlaintext(item, schema));
        return;
      }

      if (typeof value !== 'object' || value === null) return;

      const record = value as Record<string, unknown>;
      for (const [key, rule] of Object.entries(schema)) {
        const current = record[key];
        if (rule === true && typeof current === 'string') {
          record[key] = null;
          delete record[key];
        } else if (rule !== true && current != null) {
          wipePlaintext(current, rule as SensitiveFieldSchema);
        }
      }
    };

    wipePlaintext(store.editingConfig, CONFIG_SCHEMA);

    await saveToIndexedDB(nodeId, payloadToPersist);
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

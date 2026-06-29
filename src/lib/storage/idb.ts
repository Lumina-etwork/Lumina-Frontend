import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface WebAuthnDB extends DBSchema {
  "webauthn/credentials": {
    key: string;
    value: {
      userId: string;
      credentialId: string;
      createdAt: string;
    };
  };
}

const DB_NAME = "webauthn-storage";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WebAuthnDB>> | null = null;

function getDb(): Promise<IDBPDatabase<WebAuthnDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WebAuthnDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("webauthn/credentials")) {
          db.createObjectStore("webauthn/credentials", {
            keyPath: "userId",
          });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCredentialId(userId: string, credentialId: string): Promise<void> {
  const db = await getDb();
  await db.put("webauthn/credentials", {
    userId,
    credentialId,
    createdAt: new Date().toISOString(),
  });
}

export async function getCredentialId(userId: string): Promise<string | null> {
  const db = await getDb();
  const record = await db.get("webauthn/credentials", userId);
  return record ? record.credentialId : null;
}

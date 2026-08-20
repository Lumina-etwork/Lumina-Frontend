"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Persistent store for WebAuthn credential IDs.
 *
 * Note: `src/lib/storage/idb.ts` is a domain-specific field-inspection database
 * (`LuminaFieldDB`), not a generic key/value helper — so credential IDs live in
 * their own small database here rather than being bolted onto that schema. Only
 * the credential ID (a public handle) is stored; no private key material ever
 * leaves the authenticator, and nothing is sent to a backend.
 */

const DB_NAME = "lumina-webauthn";
const DB_VERSION = 1;
const STORE = "credentials";

/** One resident credential per operator, keyed by `webauthn/<userId>`. */
export interface StoredCredential {
  /** Storage key: `webauthn/<userId>`. */
  key: string;
  /** The operator id (Stellar public key) this credential belongs to. */
  userId: string;
  /** base64url-encoded credential ID returned by the authenticator. */
  credentialId: string;
  createdAt: string;
}

interface WebAuthnDB extends DBSchema {
  [STORE]: {
    key: string;
    value: StoredCredential;
  };
}

function credentialKey(userId: string): string {
  return `webauthn/${userId}`;
}

let dbPromise: Promise<IDBPDatabase<WebAuthnDB>> | null = null;

function getDb(): Promise<IDBPDatabase<WebAuthnDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB<WebAuthnDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

/** Persists (or replaces) the credential ID for an operator. */
export async function saveCredential(userId: string, credentialId: string): Promise<void> {
  const db = await getDb();
  const record: StoredCredential = {
    key: credentialKey(userId),
    userId,
    credentialId,
    createdAt: new Date().toISOString(),
  };
  await db.put(STORE, record);
}

/** Returns the stored credential for an operator, or null if none is enrolled. */
export async function getCredential(userId: string): Promise<StoredCredential | null> {
  const db = await getDb();
  const record = await db.get(STORE, credentialKey(userId));
  return record ?? null;
}

/** Removes an operator's enrolled credential. */
export async function deleteCredential(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, credentialKey(userId));
}

/** Test-only: drop the cached connection so a fresh in-memory DB can be used. */
export function resetWebAuthnStoreForTests(): void {
  dbPromise = null;
}

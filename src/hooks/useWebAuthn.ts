"use client";

import { useCallback, useState } from "react";
import { getCredential, saveCredential } from "../lib/storage/webauthn-credentials";

/**
 * WebAuthn (FIDO2) hardware-key enrollment and authentication.
 *
 * Wraps `navigator.credentials.create`/`.get`. Only the credential ID (a public
 * handle) is persisted, in IndexedDB, under `webauthn/<userId>` — the private
 * key never leaves the authenticator and nothing is sent to a backend
 * (deterministic, discoverable credentials).
 */

const CHALLENGE_BYTES = 32;
const ES256 = -7; // COSE alg id for ECDSA w/ SHA-256

export interface WebAuthnOptions {
  /** Relying-party id; must match the deployment origin. Defaults to the current hostname. */
  rpId?: string;
  rpName?: string;
}

function randomChallenge(): BufferSource {
  const challenge = new Uint8Array(CHALLENGE_BYTES);
  crypto.getRandomValues(challenge);
  return challenge as BufferSource;
}

function fromBase64Url(value: string): BufferSource {
  const padded = value.length % 4 === 0 ? value : value + "=".repeat(4 - (value.length % 4));
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes as BufferSource;
}

function resolveRpId(rpId?: string): string {
  if (rpId) return rpId;
  if (typeof window !== "undefined" && window.location?.hostname) return window.location.hostname;
  return "localhost";
}

function assertAvailable(): void {
  if (typeof navigator === "undefined" || !navigator.credentials) {
    throw new Error("WebAuthn is not available in this environment");
  }
}

/**
 * Registers a FIDO2 credential for `userId` (the operator's Stellar public key)
 * and persists its base64url credential ID. Enforces one resident credential
 * per operator per device via `excludeCredentials`.
 */
export async function registerCredential(userId: string, options: WebAuthnOptions = {}): Promise<string> {
  assertAvailable();
  const existing = await getCredential(userId).catch(() => null);
  const excludeCredentials: PublicKeyCredentialDescriptor[] = existing
    ? [{ id: fromBase64Url(existing.credentialId), type: "public-key" }]
    : [];

  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { id: resolveRpId(options.rpId), name: options.rpName ?? "Lumina" },
      user: {
        id: new TextEncoder().encode(userId) as BufferSource,
        name: userId,
        displayName: userId,
      },
      challenge: randomChallenge(),
      pubKeyCredParams: [{ type: "public-key", alg: ES256 }],
      authenticatorSelection: { residentKey: "preferred", userVerification: "discouraged" },
      excludeCredentials,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Credential creation was cancelled");

  // PublicKeyCredential.id is already the base64url encoding of rawId.
  const credentialId = credential.id;
  await saveCredential(userId, credentialId);
  return credentialId;
}

/**
 * Authenticates `userId` against a previously registered credential.
 * Returns true on a successful assertion.
 */
export async function authenticateWithCredential(userId: string, options: WebAuthnOptions = {}): Promise<boolean> {
  assertAvailable();
  const stored = await getCredential(userId);
  if (!stored) throw new Error("No security key is enrolled for this operator");

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: resolveRpId(options.rpId),
      allowCredentials: [{ id: fromBase64Url(stored.credentialId), type: "public-key" }],
      userVerification: "discouraged",
    },
  });

  return assertion !== null;
}

export interface UseWebAuthnResult {
  isSupported: boolean;
  isBusy: boolean;
  error: string | null;
  register: (userId: string, options?: WebAuthnOptions) => Promise<string>;
  authenticate: (userId: string, options?: WebAuthnOptions) => Promise<boolean>;
}

export function useWebAuthn(): UseWebAuthnResult {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials &&
    typeof window.PublicKeyCredential !== "undefined";

  const register = useCallback(async (userId: string, options?: WebAuthnOptions) => {
    setIsBusy(true);
    setError(null);
    try {
      return await registerCredential(userId, options);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const authenticate = useCallback(async (userId: string, options?: WebAuthnOptions) => {
    setIsBusy(true);
    setError(null);
    try {
      return await authenticateWithCredential(userId, options);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { isSupported, isBusy, error, register, authenticate };
}

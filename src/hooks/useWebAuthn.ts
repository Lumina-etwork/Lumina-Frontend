import { useCallback } from "react";
import { saveCredentialId, getCredentialId } from "@/src/lib/storage/idb";

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  const base64String = btoa(str);
  return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function useWebAuthn() {
  const registerCredential = useCallback(async (userId: string) => {
    if (!navigator.credentials || !navigator.credentials.create) {
      throw new Error("WebAuthn is not supported in this browser");
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(userId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Lumina Network",
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: userId,
        displayName: `Operator ${userId}`,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "discouraged",
      },
    };

    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to create credential");
    }

    const credentialIdStr = bufferToBase64url(credential.rawId);
    await saveCredentialId(userId, credentialIdStr);

    return credential;
  }, []);

  const authenticateWithCredential = useCallback(async (userId: string): Promise<boolean> => {
    if (!navigator.credentials || !navigator.credentials.get) {
      throw new Error("WebAuthn is not supported in this browser");
    }

    const storedCredentialId = await getCredentialId(userId);
    if (!storedCredentialId) {
      throw new Error("No credential registered for this user");
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialIdBuffer = base64urlToBuffer(storedCredentialId);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: credentialIdBuffer,
          type: "public-key",
        },
      ],
      userVerification: "discouraged",
    };

    const assertion = await navigator.credentials.get({
      publicKey,
    });

    if (assertion) {
      return true;
    }
    return false;
  }, []);

  return {
    registerCredential,
    authenticateWithCredential,
  };
}

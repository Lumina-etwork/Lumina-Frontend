import { getShareSecret, getTokenIdentifier, generateToken, parseToken, type SharePayload } from "./crypto/shareToken";

interface StoredShare {
  token: string;
  payload: SharePayload;
  consumed: boolean;
}

const shares = new Map<string, StoredShare>();

export async function createShare(payload: SharePayload): Promise<string> {
  const token = await generateToken(payload, getShareSecret());
  const identifier = getTokenIdentifier(token);
  if (!identifier) throw new Error("Unable to create share token");
  shares.set(identifier, { token, payload, consumed: false });
  return token;
}

export async function consumeShare(token: string): Promise<SharePayload | null> {
  const identifier = getTokenIdentifier(token);
  if (!identifier) return null;
  const stored = shares.get(identifier);
  if (!stored || stored.consumed || stored.token !== token) return null;

  const payload = await parseToken(token, getShareSecret());
  if (!payload) {
    shares.delete(identifier);
    return null;
  }

  stored.consumed = true;
  shares.delete(identifier);
  return payload;
}

export function revokeAllShares(): void {
  shares.clear();
}
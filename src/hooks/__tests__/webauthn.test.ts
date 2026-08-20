import "fake-indexeddb/auto";
import assert from "node:assert/strict";

import { registerCredential, authenticateWithCredential } from "../useWebAuthn";
import {
  getCredential,
  deleteCredential,
  resetWebAuthnStoreForTests,
} from "../../lib/storage/webauthn-credentials";

// ── Mock authenticator (navigator.credentials) ──────────────────────────────

// base64url of the 16 bytes 0x00..0x0f
const FAKE_CREDENTIAL_ID = "AAECAwQFBgcICQoLDA0ODw";

let lastCreateOptions: CredentialCreationOptions | null = null;
let lastGetOptions: CredentialRequestOptions | null = null;

const mockCredentials = {
  async create(options: CredentialCreationOptions) {
    lastCreateOptions = options;
    return { id: FAKE_CREDENTIAL_ID, rawId: new ArrayBuffer(16), type: "public-key" };
  },
  async get(options: CredentialRequestOptions) {
    lastGetOptions = options;
    return { id: FAKE_CREDENTIAL_ID, rawId: new ArrayBuffer(16), type: "public-key" };
  },
};

Object.defineProperty(globalThis, "navigator", {
  value: { credentials: mockCredentials },
  configurable: true,
  writable: true,
});

// ── Minimal test harness (matches the repo's tsx test style) ────────────────

let passed = 0;
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    resetWebAuthnStoreForTests();
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function challengeOf(options: CredentialCreationOptions | null): Uint8Array {
  const challenge = (options?.publicKey?.challenge ?? new Uint8Array()) as BufferSource;
  return new Uint8Array(challenge instanceof ArrayBuffer ? challenge : (challenge as Uint8Array));
}

// ── Tests ───────────────────────────────────────────────────────────────────

(async () => {
  console.log("useWebAuthn");

  await test("registerCredential stores the credential id (IndexedDB round-trip)", async () => {
    const userId = "GA_ROUNDTRIP";
    const id = await registerCredential(userId, { rpId: "lumina.test" });
    assert.equal(id, FAKE_CREDENTIAL_ID);
    const stored = await getCredential(userId);
    assert.ok(stored, "credential should be persisted");
    assert.equal(stored!.credentialId, FAKE_CREDENTIAL_ID);
    assert.equal(stored!.userId, userId);
  });

  await test("registration uses a 32-byte challenge, ES256, and a preferred resident key", async () => {
    await registerCredential("GA_PARAMS", { rpId: "lumina.test" });
    const pk = lastCreateOptions!.publicKey!;
    assert.equal(challengeOf(lastCreateOptions).byteLength, 32, "challenge must be 32 bytes");
    assert.deepEqual(pk.pubKeyCredParams, [{ type: "public-key", alg: -7 }]);
    assert.equal(pk.authenticatorSelection?.residentKey, "preferred");
    assert.equal(pk.rp.id, "lumina.test");
  });

  await test("challenges are random per registration", async () => {
    await registerCredential("GA_RAND_1", { rpId: "lumina.test" });
    const first = Buffer.from(challengeOf(lastCreateOptions)).toString("hex");
    await registerCredential("GA_RAND_2", { rpId: "lumina.test" });
    const second = Buffer.from(challengeOf(lastCreateOptions)).toString("hex");
    assert.notEqual(first, second, "two registrations must not share a challenge");
  });

  await test("re-registration excludes the existing credential (one resident per operator)", async () => {
    const userId = "GA_EXCLUDE";
    await registerCredential(userId, { rpId: "lumina.test" });
    await registerCredential(userId, { rpId: "lumina.test" });
    const exclude = lastCreateOptions!.publicKey!.excludeCredentials ?? [];
    assert.equal(exclude.length, 1, "existing credential must be excluded");
    assert.equal(exclude[0].type, "public-key");
  });

  await test("authenticateWithCredential succeeds and passes the stored id in allowCredentials", async () => {
    const userId = "GA_AUTH";
    await registerCredential(userId, { rpId: "lumina.test" });
    const ok = await authenticateWithCredential(userId, { rpId: "lumina.test" });
    assert.equal(ok, true);
    const allow = lastGetOptions!.publicKey!.allowCredentials ?? [];
    assert.equal(allow.length, 1);
    assert.equal(challengeOf({ publicKey: lastGetOptions!.publicKey } as CredentialCreationOptions).byteLength, 32);
  });

  await test("authenticateWithCredential throws when no key is enrolled", async () => {
    const userId = "GA_NONE";
    await deleteCredential(userId).catch(() => {});
    await assert.rejects(() => authenticateWithCredential(userId, { rpId: "lumina.test" }), /No security key is enrolled/);
  });

  console.log(`\n${passed} passed`);
})();

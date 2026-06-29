import { renderHook, act } from "@testing-library/react";
import sinon from "sinon";
import { useWebAuthn } from "@/src/hooks/useWebAuthn";
import * as idb from "@/src/lib/storage/idb";

// Mock global crypto
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};

describe("useWebAuthn", () => {
  let credentialsCreateStub: sinon.SinonStub;
  let credentialsGetStub: sinon.SinonStub;
  let saveCredentialIdStub: sinon.SinonStub;
  let getCredentialIdStub: sinon.SinonStub;
  let cryptoStub: sinon.SinonStub;

  beforeEach(() => {
    // Setup navigator mocks
    if (!global.navigator) {
      (global as any).navigator = {};
    }
    (global.navigator as any).credentials = {
      create: () => Promise.resolve(),
      get: () => Promise.resolve(),
    };

    credentialsCreateStub = sinon.stub(global.navigator.credentials, "create");
    credentialsGetStub = sinon.stub(global.navigator.credentials, "get");
    
    // Mock idb
    saveCredentialIdStub = sinon.stub(idb, "saveCredentialId").resolves();
    getCredentialIdStub = sinon.stub(idb, "getCredentialId").resolves();

    // Mock crypto.getRandomValues
    if (!global.crypto) {
      (global as any).crypto = {};
    }
    cryptoStub = sinon.stub(global.crypto, "getRandomValues").callsFake(mockCrypto.getRandomValues as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("registerCredential calls navigator.credentials.create with 32-byte challenge and saves credential to IndexedDB", async () => {
    const { result } = renderHook(() => useWebAuthn());

    const mockRawId = new Uint8Array([1, 2, 3]).buffer;
    credentialsCreateStub.resolves({ rawId: mockRawId });

    const credential = await result.current.registerCredential("operator123");

    // Verify challenge randomness and length
    const createArgs = credentialsCreateStub.firstCall.args[0];
    const challenge = createArgs.publicKey.challenge;
    expect(challenge).toBeInstanceOf(Uint8Array);
    expect(challenge.length).toBe(32);
    expect(cryptoStub.calledOnce).toBe(true);

    // Verify IDB round trip save
    expect(saveCredentialIdStub.calledOnce).toBe(true);
    expect(saveCredentialIdStub.firstCall.args[0]).toBe("operator123");
    expect(typeof saveCredentialIdStub.firstCall.args[1]).toBe("string");

    expect(credential).toBeDefined();
  });

  it("authenticateWithCredential retrieves credential from IndexedDB and calls navigator.credentials.get", async () => {
    const { result } = renderHook(() => useWebAuthn());

    getCredentialIdStub.resolves("AQID"); // mocked base64url
    credentialsGetStub.resolves({ type: "public-key" });

    const success = await result.current.authenticateWithCredential("operator123");

    // Verify IDB fetch
    expect(getCredentialIdStub.calledOnce).toBe(true);
    expect(getCredentialIdStub.firstCall.args[0]).toBe("operator123");

    // Verify challenge generation
    expect(cryptoStub.calledOnce).toBe(true);
    const getArgs = credentialsGetStub.firstCall.args[0];
    const challenge = getArgs.publicKey.challenge;
    expect(challenge).toBeInstanceOf(Uint8Array);
    expect(challenge.length).toBe(32);

    expect(success).toBe(true);
  });
});

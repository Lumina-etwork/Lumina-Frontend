import { useState, useCallback } from "react";
import { useWebAuthn } from "./useWebAuthn";

// Mock implementation of an existing wallet auth hook
export function useWalletAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { authenticateWithCredential } = useWebAuthn();

  // "existing" wallet login
  const loginWithWallet = useCallback(async (address: string) => {
    // Simulate wallet signature
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUserId(address);
        setIsAuthenticated(true);
        resolve();
      }, 500);
    });
  }, []);

  const loginWithWebAuthn = useCallback(
    async (address: string) => {
      try {
        const success = await authenticateWithCredential(address);
        if (success) {
          setUserId(address);
          setIsAuthenticated(true);
          return true;
        }
      } catch (e) {
        console.error("WebAuthn login failed:", e);
      }
      return false;
    },
    [authenticateWithCredential]
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserId(null);
  }, []);

  return {
    isAuthenticated,
    userId,
    loginWithWallet,
    loginWithWebAuthn,
    logout,
  };
}

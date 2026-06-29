import React, { useState } from "react";
import { useWebAuthn } from "@/src/hooks/useWebAuthn";

type Step = "idle" | "insert" | "touch" | "success" | "error";

interface WebAuthnRegisterModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WebAuthnRegisterModal({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: WebAuthnRegisterModalProps) {
  const [step, setStep] = useState<Step>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { registerCredential } = useWebAuthn();

  const handleRegister = async () => {
    try {
      setStep("insert");
      // Simulate prompt for "Insert your security key" -> "Touch the key"
      // WebAuthn API will handle the actual hardware prompt
      setTimeout(() => {
        setStep("touch");
      }, 1000);

      await registerCredential(userId);
      
      setStep("success");
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setStep("idle");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register security key");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl border border-border">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Register Security Key</h2>
        
        <div className="min-h-[120px] flex flex-col items-center justify-center">
          {step === "idle" && (
            <p className="text-muted-text text-center">
              Enroll a FIDO2 hardware key (YubiKey, Touch ID, Windows Hello) to secure your account.
            </p>
          )}
          {step === "insert" && (
            <p className="text-primary text-lg animate-pulse">Insert your security key...</p>
          )}
          {step === "touch" && (
            <p className="text-primary text-lg font-medium animate-bounce">Touch the key!</p>
          )}
          {step === "success" && (
            <div className="text-success text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-lg font-semibold">Successfully enrolled</p>
            </div>
          )}
          {step === "error" && (
            <div className="text-danger-text text-center">
              <p className="font-semibold mb-2">Registration failed</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-text hover:text-foreground transition-colors"
            disabled={step === "insert" || step === "touch"}
          >
            Cancel
          </button>
          {step === "idle" || step === "error" ? (
            <button
              onClick={handleRegister}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-text rounded hover:bg-primary-hover transition-colors"
            >
              Start Registration
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

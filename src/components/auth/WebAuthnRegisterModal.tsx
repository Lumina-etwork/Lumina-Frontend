"use client";

import { useEffect, useState } from "react";
import { useWebAuthn, type WebAuthnOptions } from "@/src/hooks/useWebAuthn";

type Step = "intro" | "touch" | "done" | "error";

export interface WebAuthnRegisterModalProps {
  /** Operator id to enrol (the Stellar public key). */
  userId: string;
  open: boolean;
  onClose: () => void;
  onEnrolled?: (credentialId: string) => void;
  options?: WebAuthnOptions;
}

/**
 * Step-by-step wizard for enrolling a FIDO2 security key:
 * "Insert your security key" -> "Touch the key" -> "Successfully enrolled".
 */
export function WebAuthnRegisterModal({
  userId,
  open,
  onClose,
  onEnrolled,
  options,
}: WebAuthnRegisterModalProps) {
  const { isSupported, register, error } = useWebAuthn();
  const [step, setStep] = useState<Step>("intro");

  useEffect(() => {
    if (open) setStep("intro");
  }, [open]);

  if (!open) return null;

  async function handleEnroll() {
    setStep("touch");
    try {
      const credentialId = await register(userId, options);
      setStep("done");
      onEnrolled?.(credentialId);
    } catch {
      setStep("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="webauthn-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        <h2 id="webauthn-modal-title" className="text-lg font-semibold text-foreground">
          Enroll a security key
        </h2>

        {!isSupported ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This browser or device does not support hardware security keys.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {step === "intro" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Insert your security key (YubiKey, Touch ID, or Windows Hello) to register it
                  for this console.
                </p>
                <button
                  type="button"
                  onClick={handleEnroll}
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Continue
                </button>
              </>
            )}

            {step === "touch" && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Touch your security key to confirm…
              </p>
            )}

            {step === "done" && (
              <p aria-live="polite" className="text-sm font-medium text-foreground">
                ✅ Successfully enrolled. You can now sign in with your security key.
              </p>
            )}

            {step === "error" && (
              <p aria-live="assertive" className="text-sm text-destructive">
                Enrollment failed{error ? `: ${error}` : ""}. Please try again.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm text-foreground"
          >
            {step === "done" ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

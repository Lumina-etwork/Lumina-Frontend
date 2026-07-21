"use client";

import { useCallback, useRef, useState } from "react";
import { useWalletIdentity } from "@/src/hooks/useWalletIdentity";
import { QRProvisionPanel } from "@/src/components/onboarding/QRProvisionPanel";
import type {
  NodeConfig,
} from "@/src/types/provisioning";

/**
 * NodeProvisioner handles the onboarding flow for newly purchased network
 * hardware. It provides a form to enter node configuration details and
 * renders a QRProvisionPanel that generates a time-bound QR code for
 * auto-configuration via the physical router's camera.
 */
export function NodeProvisioner() {
  const { publicKey, isTransitioning } = useWalletIdentity();

  const [nodeConfig, setNodeConfig] = useState<NodeConfig>({
    name: "",
    location: "",
    model: "",
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof NodeConfig, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);

  // Stable confirmed config — only updated on successful form submission.
  // This prevents the QR from regenerating on every keystroke.
  const [confirmedConfig, setConfirmedConfig] = useState<NodeConfig | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  const handleLogChange = useCallback(() => {
    // Provisioning log is managed internally by QRProvisionPanel;
    // parent is notified for potential external consumption.
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof NodeConfig, value: string) => {
      setNodeConfig((prev) => ({ ...prev, [field]: value }));

      if (formErrors[field]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [formErrors],
  );

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof NodeConfig, string>> = {};

    if (!nodeConfig.name.trim()) {
      errors.name = "Node name is required";
    } else if (nodeConfig.name.trim().length < 2) {
      errors.name = "Node name must be at least 2 characters";
    }

    if (!nodeConfig.location.trim()) {
      errors.location = "Location is required";
    }

    if (!nodeConfig.model.trim()) {
      errors.model = "Model is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [nodeConfig]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setSubmitted(true);

      // Snapshot the config at submit time to avoid QR regeneration on keystrokes
      setConfirmedConfig({
        name: nodeConfig.name.trim(),
        location: nodeConfig.location.trim(),
        model: nodeConfig.model.trim(),
      });
    },
    [validate, nodeConfig],
  );

  const isWalletReady = !!publicKey && !isTransitioning;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      {/* Page header */}
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted">
          Edge Router Provisioning
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
          Node Onboarding
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Configure a new edge router and generate a secure QR code for
          automatic on-chain provisioning. Scan the QR code with the router
          camera to claim the node and apply deployment settings instantly.
        </p>
      </header>

      {/* Wallet status */}
      <div className="mb-6 rounded-md border border-table-divider bg-surface-alt px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isWalletReady ? "bg-green-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">
            {isWalletReady
              ? `Wallet connected: ${publicKey!.slice(0, 8)}...${publicKey!.slice(-4)}`
              : "Wallet not connected — connect your Freighter wallet to proceed"}
          </span>
        </div>
      </div>

      {/* Configuration form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mb-8 rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Node Configuration
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Name field */}
          <div>
            <label
              htmlFor="node-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-text"
            >
              Node Name
            </label>
            <input
              ref={nameRef}
              id="node-name"
              data-testid="node-name-input"
              type="text"
              value={nodeConfig.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="e.g. nyc-edge-01"
              disabled={!isWalletReady}
              className={`w-full rounded-md border px-3 py-2 text-sm text-foreground placeholder-border-light transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-surface-alt ${
                formErrors.name
                  ? "border-rose-300 focus:ring-rose-300"
                  : "border-border-light"
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-rose-600">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* Location field */}
          <div>
            <label
              htmlFor="node-location"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-text"
            >
              Location
            </label>
            <input
              ref={locationRef}
              id="node-location"
              data-testid="node-location-input"
              type="text"
              value={nodeConfig.location}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              placeholder="e.g. New York, US"
              disabled={!isWalletReady}
              className={`w-full rounded-md border px-3 py-2 text-sm text-foreground placeholder-border-light transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-surface-alt ${
                formErrors.location
                  ? "border-rose-300 focus:ring-rose-300"
                  : "border-border-light"
              }`}
            />
            {formErrors.location && (
              <p className="mt-1 text-xs text-rose-600">
                {formErrors.location}
              </p>
            )}
          </div>

          {/* Model field */}
          <div>
            <label
              htmlFor="node-model"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-text"
            >
              Model
            </label>
            <input
              ref={modelRef}
              id="node-model"
              data-testid="node-model-input"
              type="text"
              value={nodeConfig.model}
              onChange={(e) => handleFieldChange("model", e.target.value)}
              placeholder="e.g. Lumina LR-200"
              disabled={!isWalletReady}
              className={`w-full rounded-md border px-3 py-2 text-sm text-foreground placeholder-border-light transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-surface-alt ${
                formErrors.model
                  ? "border-rose-300 focus:ring-rose-300"
                  : "border-border-light"
              }`}
            />
            {formErrors.model && (
              <p className="mt-1 text-xs text-rose-600">
                {formErrors.model}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-table-divider pt-4">
          <p className="text-xs text-muted">
            {submitted
              ? "Configuration saved. QR code generated below."
              : "Fill in all fields and click Generate to create a provisioning QR code."}
          </p>
          <button
            type="submit"
            data-testid="generate-qr-button"
            disabled={!isWalletReady}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitted ? "Regenerate" : "Generate QR Code"}
          </button>
        </div>
      </form>

      {/* QR Provisioning Panel */}
      <QRProvisionPanel
        nodeConfig={confirmedConfig}
        onProvisioningLogChange={handleLogChange}
      />
    </main>
  );
}

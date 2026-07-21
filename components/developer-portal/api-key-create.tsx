"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Check } from "lucide-react";
import type { ApiScope } from "./api-key-list";

interface ApiKeyCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, scopes: ApiScope[]) => void;
}

const AVAILABLE_SCOPES: ApiScope[] = [
  "validator:read",
  "network:read",
  "staking:read",
  "staking:write",
  "governance:read",
  "governance:write",
];

export function ApiKeyCreate({ isOpen, onClose, onCreate }: ApiKeyCreateProps) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleCreate = () => {
    if (!name.trim() || selectedScopes.length === 0) return;
    
    // Generate a mock API key (in production, this would come from the backend)
    const newKey = `lumina_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setCreatedKey(newKey);
    onCreate(name, selectedScopes);
  };

  const handleClose = () => {
    setName("");
    setSelectedScopes([]);
    setCreatedKey(null);
    onClose();
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create API Key">
      {createdKey ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              API Key Created Successfully
            </p>
            <p className="mt-2 text-xs text-green-700 dark:text-green-300">
              Copy this key now. You won't be able to see it again.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Your API Key
            </label>
            <div className="flex gap-2">
              <Input
                value={createdKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyToClipboard}>Copy</Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Key Name
            </label>
            <Input
              placeholder="e.g., Production App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Scopes
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                    selectedScopes.includes(scope)
                      ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-sm ${
                      selectedScopes.includes(scope)
                        ? "bg-zinc-50 dark:bg-zinc-900"
                        : "border border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {selectedScopes.includes(scope) && (
                      <Check className="h-3 w-3 text-zinc-900 dark:text-zinc-50" />
                    )}
                  </div>
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleClose}
              className="bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || selectedScopes.length === 0}
            >
              Create Key
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

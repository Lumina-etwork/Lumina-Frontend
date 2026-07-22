"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Key, Globe, Activity } from "lucide-react";
import { ApiKeyList, ApiKey, ApiScope } from "@/components/developer-portal/api-key-list";
import { ApiKeyCreate } from "@/components/developer-portal/api-key-create";
import { UsageDashboard } from "@/components/developer-portal/usage-dashboard";
import { ApiPlayground } from "@/components/developer-portal/api-playground";
import { RateLimitGauge } from "@/components/developer-portal/rate-limit-gauge";
import { WebhookTester } from "@/components/developer-portal/webhook-tester";

type Tab = "keys" | "dashboard" | "playground" | "webhooks";

export default function DeveloperPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("keys");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/v1/dev/api-keys");
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  };

  const handleCreateKey = async (name: string, scopes: ApiScope[]) => {
    try {
      const response = await fetch("/api/v1/dev/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });
      const newKey = await response.json();
      setApiKeys([...apiKeys, newKey]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await fetch(`/api/v1/dev/api-keys/${id}`, { method: "DELETE" });
      setApiKeys(apiKeys.map((key) => 
        key.id === id ? { ...key, status: "revoked" as const } : key
      ));
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const activeKey = selectedApiKey 
    ? apiKeys.find((k) => k.id === selectedApiKey) 
    : apiKeys.find((k) => k.status === "active");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Lumina Developer Portal
              </h1>
            </div>
            {activeKey && (
              <div className="flex items-center gap-4">
                <RateLimitGauge 
                  current={activeKey.rateLimit.current} 
                  limit={activeKey.rateLimit.limit}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("keys")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "keys"
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <Key className="h-4 w-4" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "dashboard"
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Usage Dashboard
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "playground"
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <Globe className="h-4 w-4" />
            API Playground
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "webhooks"
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <Activity className="h-4 w-4" />
            Webhook Tester
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "keys" && (
          <div className=" space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-zinc-600 dark:text-zinc-400">
                Manage your API keys and their permissions.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
            <ApiKeyList keys={apiKeys} onRevoke={handleRevokeKey} />
          </div>
        )}

        {activeTab === "dashboard" && (
          <UsageDashboard apiKeyId={selectedApiKey || undefined} />
        )}

        {activeTab === "playground" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-zinc-600 dark:text-zinc-400">
                Test API endpoints directly from your browser.
              </p>
              {apiKeys.length > 0 && (
                <select
                  value={selectedApiKey || ""}
                  onChange={(e) => setSelectedApiKey(e.target.value || null)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">Select API Key</option>
                  {apiKeys
                    .filter((k) => k.status === "active")
                    .map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
            {activeKey ? (
              <ApiPlayground apiKey={activeKey.key} />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Create an API key to use the playground
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "webhooks" && (
          <WebhookTester />
        )}
      </div>

      <ApiKeyCreate
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateKey}
      />
    </div>
  );
}

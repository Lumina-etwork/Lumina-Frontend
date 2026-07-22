"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface WebhookData {
  id: string;
  timestamp: string;
  headers: Record<string, string>;
  body: any;
  method: string;
  url: string;
}

export function WebhookTester() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/dev/webhook-test");
      const data = await response.json();
      setWebhooks(data.webhooks || []);
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    // Poll for new webhooks every 5 seconds
    const interval = setInterval(fetchWebhooks, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearWebhooks = async () => {
    try {
      await fetch("/api/v1/dev/webhook-test", { method: "DELETE" });
      setWebhooks([]);
    } catch (error) {
      console.error("Failed to clear webhooks:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Webhook Test Endpoint</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={fetchWebhooks}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {webhooks.length > 0 && (
              <Button
                onClick={clearWebhooks}
                className="h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Send POST requests to{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            /api/v1/dev/webhook-test
          </code>{" "}
          to test webhooks. Webhooks are displayed in real-time.
        </p>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-zinc-500 dark:text-zinc-400">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No webhooks received yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-4 w-4" />
                  {format(new Date(webhook.timestamp), "MMM d, yyyy HH:mm:ss")}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Method:
                    </span>{" "}
                    <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                      {webhook.method}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Body:
                    </span>
                    <pre className="mt-1 rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-800">
                      {JSON.stringify(webhook.body, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

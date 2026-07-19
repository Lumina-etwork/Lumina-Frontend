"use client";

/**
 * ConfigAuditBridge
 * Registers live Soroban RPC capture and runs periodic system-wide audits.
 * Sources are registered synchronously so the first audit sees live config.
 */

import { useConfigAudit } from "@/src/hooks/useConfigAudit";
import { getSorobanRpcConfig } from "@/src/lib/sorobanClient";
import {
  createDefaultConfigSources,
  getConfigAuditor,
} from "@/src/services/configAudit";

function ensureLiveSourcesRegistered(): void {
  const auditor = getConfigAuditor();
  const sources = createDefaultConfigSources({
    "soroban-rpc": () => {
      const config = getSorobanRpcConfig();
      return {
        serverUrl: config.serverUrl,
        networkPassphrase: config.networkPassphrase,
      };
    },
  });
  for (const source of sources) {
    auditor.registerSource(source);
  }
}

export function ConfigAuditBridge() {
  // Register before the hook's mount audit so live Soroban config is captured.
  ensureLiveSourcesRegistered();

  useConfigAudit({
    runOnMount: true,
    intervalMs: 120_000,
    reportTelemetry: true,
  });

  return null;
}

## Automated Dependency Vulnerability Scanning Pipeline

### Summary

Implements a system-wide automated dependency vulnerability scanning pipeline covering CI/CD gating, runtime monitoring, and operational runbooks. All services' dependencies are scanned against npm advisory database and Google OSV for known CVEs.

### Changes

| Phase | Files | Description |
|---|---|---|
| Core Library | `src/lib/vulnerability/types.ts`, `scanner.ts`, `advisorySource.ts`, `redact.ts`, `index.ts` | Shared types, pure parsing/comparison engine, npm + OSV adapters, secret redaction |
| Service Layer | `src/services/dependencyScan.ts` | `DependencyScanner` class with singleton, pub/sub, history ring, canary gate |
| Tests | `src/lib/vulnerability/__tests__/dependencyScan.test.ts`, `src/services/__tests__/dependencyScan.test.ts` | 30 unit tests (19 core + 11 service) |
| Telemetry | `src/utils/vulnerabilityTelemetry.ts`, `src/app/api/telemetry/vulnerability/route.ts` | Offline-first POST reporter + Next.js ingest endpoint |
| React Hook | `src/hooks/useDependencyScan.ts` | `useSyncExternalStore` subscription with configurable interval |
| CI/CD | `.github/workflows/dependency-scan.yml` | pnpm audit → npm audit → OSV-Scanner → SBOM → deployment gate |
| Gate Script | `scripts/check-deployment-gate.mjs` | Blocks deploy on critical vulnerabilities |
| Dashboard | `src/components/dashboard/VulnerabilityDashboard.tsx`, `src/app/dashboard/vulnerability/page.tsx` | Severity breakdown, finding cards, canary status |
| Documentation | `VULNERABILITY_SCAN_RUNBOOK.md` | Monitoring signals, triage, blue-green/canary procedures, security checklist |

### Architecture

```
CI/CD (dependency-scan.yml)
  ├─ pnpm audit (direct deps)
  ├─ npm audit (fallback)
  ├─ OSV-Scanner (transitive deps)
  ├─ SBOM generation
  └─ check-deployment-gate.mjs
       └─ blocks if criticalCount > 0

Runtime (browser)
  └─ DependencyScanner service
       ├─ scanSource() / scanAll()
       ├─ checkCanaryGate()
       ├─ POST /api/telemetry/vulnerability
       └─ useDependencyScan hook → Dashboard UI
```

### Technical Bounds

- **< 100ms P99**: Every `ScanReport` includes `metrics.durationMs` and `metrics.withinBudget`
- **99.99% uptime**: Scanner never throws; advisory source failures return empty results; telemetry errors are swallowed
- **Security**: All findings redacted before telemetry; sensitive package names masked; no credentials transmitted
- **System-wide**: `scanAll()` covers all registered `PackageSource`s; CI/CD gates every push to `main`/`release/*`

### Testing

```bash
npx tsx src/lib/vulnerability/__tests__/dependencyScan.test.ts   # 19 tests
npx tsx src/services/__tests__/dependencyScan.test.ts            # 11 tests
```

### Breaking Changes

None. All additions are additive — no existing services, hooks, or routes are modified.

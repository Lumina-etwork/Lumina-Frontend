# Lumina Frontend

Next.js web application for Lumina Network, providing a dashboard for managing vesting vaults, participating in veto-based governance proposals, and tracking token streams.

## Key Features

* **Vesting Vault Dashboard:** Interactive interface to view, track, and manage active vesting schedules and token streams.
* **Governance Portal:** Real-time veto voting interface allowing beneficiaries to challenge and vote on admin-proposed governance actions.
* **Analytics & Compliance:** Visual progress tracking, claim history analytics, and integrated KYC/AML compliance workflows.

## Tech Stack
 
* **Language/Framework:** Next.js (React) / TypeScript
* **Styling:** Tailwind CSS
* **Package Manager:** pnpm (via Corepack)
 
## Sensitive Payload Encryption
 
This application includes client-side field-level encryption for sensitive payloads such as node configuration secrets.

* Encrypts sensitive fields before persistence or outbound transport.
* Uses PBKDF2-derived AES-GCM keys with deterministic root salt for session reuse.
* Supports schema-driven encryption and decryption across nested payload structures.
* Designed so plaintext secrets are purged from application state immediately after encryption.
 
See `ENCRYPTION_ARCHITECTURE.md` for detailed design notes and implementation guidance.

## Runtime Configuration Auditing

The app audits live service configuration against versioned baselines, detects drift, and supports blue-green / canary promotion gates.

* Critical-path audits target &lt;100ms P99.
* Drift findings are redacted before telemetry and dashboard display.
* Operator dashboard: `/dashboard/config-audit`.

See `CONFIG_AUDIT_ARCHITECTURE.md` and `CONFIG_AUDIT_RUNBOOK.md`.

## Chaos Engineering in Staging

Staging chaos experiments are validated before blue-green or canary promotion.

* Critical user paths must remain below <100ms P99.
* Staging availability must stay at or above 99.99%.
* Experiments require security review, blast-radius controls, monitoring, and rollback ownership.

See `CHAOS_ENGINEERING_BLUEPRINT.md` and `src/lib/chaos/policy.ts`.

## Getting Started

### Prerequisites

* Node.js 22 or higher
* pnpm (Corepack recommended)

### Installation

```bash
git clone https://github.com/ZuLu0890/Lumina-Frontend.git
cd Lumina-Frontend
corepack enable
pnpm run onboard
```


### One-command onboarding

Run the onboarding helper to validate your Node.js version, create local environment files, install dependencies with the detected package manager, and run TypeScript checks:

```bash
pnpm run onboard
```

For CI or pre-flight validation without installing dependencies, run:

```bash
pnpm run onboard:check
```

The script creates `.env.local` from `.env.example` when needed and verifies the required `NEXT_PUBLIC_*` configuration keys for local development.

### Local Development

```bash
pnpm run dev
```

### Production Build

```bash
pnpm run build
```

## Contributing

Contributions are welcome. Please keep changes focused, verify the production build before opening a pull request, and open an issue first for major structural changes.

## Configuration Management

Runtime configuration is audited through schema validation, baseline drift detection, hot-reload safety checks, and canary promotion gates. See the [configuration architecture](docs/architecture/config-management.md) and [configuration runbook](docs/runbooks/config-management.md) for rollout and incident-response details.

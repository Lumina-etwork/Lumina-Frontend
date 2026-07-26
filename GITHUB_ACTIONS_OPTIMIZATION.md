# GitHub Actions Optimization Architecture

This repository keeps CI feedback fast by splitting independent checks into isolated jobs that can run in parallel. The strategy prioritizes short feedback loops for pull requests while keeping the dependency security gate auditable for release branches.

## Architecture

- `Frontend CI` runs linting, type checking, production build validation, and unit tests as a matrix. Each matrix entry installs from the frozen pnpm lockfile and executes independently, so slow feature tests do not block quick static checks.
- `Dependency Vulnerability Scan` runs `pnpm audit`, `npm audit`, OSV scanning, and SBOM generation as separate jobs. A final `gate` job downloads the artifacts and applies the existing deployment gate script.
- Workflow-level concurrency cancels obsolete runs for the same ref, reducing queue time and wasted minutes when contributors push updates quickly.
- Package-manager caches are enabled through `actions/setup-node`, and pnpm is pinned for deterministic CI behavior.

## Operational targets

- Pull-request feedback should keep critical checks under a 10-15 minute job timeout, with the matrix allowing independent checks to complete as soon as their lane finishes.
- Security scan artifacts are retained for 30 days to support review and audit trails.
- The deployment gate continues to differentiate stable and canary channels using `DEPLOY_CHANNEL`.

## Monitoring and alerting

- GitHub branch protection should require the `Frontend CI` matrix entries and the `Aggregate results and gate` job.
- Monitor workflow duration, queue time, and failure rate from the repository Actions tab.
- Treat repeated timeout failures as a signal to split the affected matrix lane further or move heavyweight checks into a scheduled workflow.

## Deployment strategy

1. Enable the new workflows on pull requests first.
2. Validate that branch protection includes all required matrix checks.
3. Roll out to `main`, then release branches.
4. For high-risk changes, compare the old serial security scan duration with the new parallel run before removing any temporary fallback rules.

## Runbook

1. If a CI matrix lane fails, rerun only the failed job after confirming the failure is not deterministic.
2. If the dependency gate fails, download `vulnerability-report` and inspect `gate-result.json` first.
3. If an artifact is missing, inspect the corresponding scanner job and confirm the upload step ran with `if: always()`.
4. If CI time regresses, review the slowest matrix lane and split independent commands into a new matrix entry.

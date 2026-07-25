# Code Coverage Gate Runbook

## Architecture

The CI coverage gate runs the repository unit test suite with V8 coverage enabled and then executes `scripts/check-coverage-threshold.mjs`. The gate aggregates coverage for loaded source files under `src/`, excluding test files and type declarations, and fails the job when line coverage falls below `COVERAGE_LINES_THRESHOLD`.

The workflow is defined in `.github/workflows/coverage.yml` and runs on pull requests to `main`, pushes to `main`, and `release/*` branches. The default threshold is 50% and can be adjusted in the workflow environment.

## Local verification

```bash
pnpm test:coverage
```

To test a different threshold locally:

```bash
COVERAGE_LINES_THRESHOLD=85 pnpm test:coverage
```

## Monitoring and alerting

GitHub Actions is the enforcement and alerting surface. A failed `Code Coverage Gate` check blocks PR merge when branch protection requires it. The job uploads `coverage/coverage-gate.json` as an artifact and writes the same JSON to the GitHub step summary for dashboard visibility.

## Deployment strategy

Enable the new required check in branch protection after this workflow lands. Roll out by first observing the check in canary/release branches, then require it for `main` once the reported threshold matches team expectations.

## Troubleshooting

1. Download the `coverage-gate-report` artifact from the failed workflow.
2. Review the lowest-coverage files in `coverage/coverage-gate.json`.
3. Add or update tests for uncovered critical paths.
4. Re-run `pnpm test:coverage` locally before pushing.

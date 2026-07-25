# Docker Image CI Runbook

## Architecture

The Docker image pipeline uses a multi-stage BuildKit build to keep dependency
installation, application compilation, and runtime layers independent. The
`deps` stage copies only package manifests before `pnpm install`, so dependency
layers are reused whenever application code changes without dependency changes.
The `builder` stage mounts a persistent Next.js cache at `/app/.next/cache` to
reuse framework compilation artifacts. The final `runner` stage copies the
Next.js standalone output and static assets into a non-root Node.js image.

GitHub Actions enables Docker Buildx and stores layers in the GitHub Actions
cache using a stable `lumina-frontend` scope. Pull requests build and load the
image locally for vulnerability scanning without pushing. Protected branch builds
reuse the same cache and push tagged images to GitHub Container Registry.

## Monitoring and release gates

- Buildx cache hits and misses are visible in the Docker Image CI job logs.
- Trivy fails pull requests on high or critical vulnerabilities and uploads SARIF
  results to GitHub code scanning.
- Branch builds publish immutable SHA tags, which can be promoted through an
  external blue-green deployment system.

## Blue-green and canary deployment notes

1. Deploy the newly pushed `sha-*` tag to the green environment.
2. Send a small canary percentage of traffic to green and compare health checks,
   latency, and error rates against blue.
3. Promote green only when canary metrics meet service objectives.
4. Roll back by shifting traffic to the previous blue image tag.

## Troubleshooting

- If dependency layers stop hitting cache, confirm `package.json`,
  `pnpm-lock.yaml`, and `pnpm-workspace.yaml` changed intentionally.
- If standalone files are missing, confirm `next.config.ts` still enables
  `output: "standalone"`.
- If scans fail, inspect the SARIF upload or Trivy job log and patch the affected
  package or base image before promotion.

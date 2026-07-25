# Pre-Commit Hook Suite

This repository ships a Git pre-commit hook suite that blocks commits when staged frontend source changes fail quality gates.

## Installation

Run the setup command once after cloning the repository:

```bash
pnpm run prepare
```

The command points Git at the versioned `.githooks/` directory via `core.hooksPath`.

## Checks

The hook inspects staged files and runs only the checks relevant to those file types. ESLint receives the staged source file list directly so unrelated existing lint debt does not block focused commits:

| Check | Command | Runs when staged files include |
| --- | --- | --- |
| ESLint | `pnpm exec eslint --max-warnings=0 <staged files>` | JavaScript or TypeScript files |
| TypeScript | `pnpm exec tsc --noEmit` | TypeScript files |
| Unit suite | `pnpm run test:all` | TypeScript files |

These checks are intentionally dependency-free beyond the existing project toolchain, keeping the hook portable across developer machines and CI workspaces.

## Bypassing in emergencies

Avoid bypassing hooks. If an emergency fix requires it, use Git's explicit bypass flag and document the follow-up remediation in the pull request:

```bash
git commit --no-verify
```

## Runbook

1. If a check fails, run the printed command directly for full output.
2. Fix the reported lint, type, or test failure.
3. Stage the fix and commit again.
4. If the hook itself appears broken, verify `git config core.hooksPath` returns `.githooks` after running `pnpm run prepare`.

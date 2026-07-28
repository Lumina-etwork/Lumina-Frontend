#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';

const checks = [
  {
    name: 'lint',
    command: 'pnpm',
    args: ['exec', 'eslint', '--max-warnings=0'],
    passStagedFiles: true,
    stagedExtensions: new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']),
  },
  {
    name: 'typecheck',
    command: 'pnpm',
    args: ['exec', 'tsc', '--noEmit'],
    stagedExtensions: new Set(['.ts', '.tsx']),
  },
  {
    name: 'unit tests',
    command: 'pnpm',
    args: ['run', 'test:all'],
    stagedExtensions: new Set(['.ts', '.tsx']),
  },
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function getStagedFiles() {
  const output = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return output ? output.split('\n').filter((file) => existsSync(file)) : [];
}

function shouldRun(check, stagedFiles) {
  return stagedFiles.some((file) => check.stagedExtensions.has(extname(file)));
}

function runCheck(check, stagedFiles) {
  console.log(`\n▶ Running ${check.name}...`);
  const args = check.passStagedFiles ? [...check.args, ...stagedFiles.filter((file) => check.stagedExtensions.has(extname(file)))] : check.args;
  execFileSync(check.command, args, { stdio: 'inherit' });
  console.log(`✓ ${check.name} passed`);
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  console.log('No staged files detected; skipping pre-commit checks.');
  process.exit(0);
}

const runnableChecks = checks.filter((check) => shouldRun(check, stagedFiles));

if (runnableChecks.length === 0) {
  console.log('No staged source files require pre-commit checks.');
  process.exit(0);
}

try {
  for (const check of runnableChecks) {
    runCheck(check, stagedFiles);
  }
  console.log('\nAll pre-commit checks passed.');
} catch (error) {
  console.error('\nPre-commit checks failed. Fix the reported issue before committing.');
  process.exit(error.status || 1);
}

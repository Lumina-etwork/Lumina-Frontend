#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export const REQUIRED_NODE_MAJOR = 22;
export const REQUIRED_ENV = {
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000/api',
  NEXT_PUBLIC_HORIZON_URL: 'https://horizon-testnet.stellar.org',
  NEXT_PUBLIC_DEPLOY_CHANNEL: 'local',
  NEXT_PUBLIC_RELEASE_SLOT: 'blue',
};

export function parseArgs(argv) {
  return {
    checkOnly: argv.includes('--check'),
    skipInstall: argv.includes('--skip-install') || argv.includes('--check'),
    skipEnv: argv.includes('--skip-env'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export function getNodeMajor(version = process.version) {
  return Number.parseInt(version.replace(/^v/, '').split('.')[0] ?? '0', 10);
}

export function detectPackageManager(root = repoRoot) {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function missingEnvKeys(envText = '') {
  return Object.keys(REQUIRED_ENV).filter((key) => !new RegExp(`^${key}=`, 'm').test(envText));
}

export function buildEnvExample() {
  return `${Object.entries(REQUIRED_ENV)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function ensureEnvFiles() {
  const examplePath = join(repoRoot, '.env.example');
  const localPath = join(repoRoot, '.env.local');
  if (!existsSync(examplePath)) {
    writeFileSync(examplePath, buildEnvExample());
    console.log('created .env.example with local development defaults');
  }
  if (!existsSync(localPath)) {
    copyFileSync(examplePath, localPath);
    console.log('created .env.local from .env.example');
  }
  const missing = missingEnvKeys(readFileSync(localPath, 'utf8'));
  if (missing.length > 0) {
    throw new Error(`.env.local is missing required keys: ${missing.join(', ')}`);
  }
}

function printHelp() {
  console.log(`Lumina local development onboarding\n\nUsage: node scripts/onboard-local-dev.mjs [--check] [--skip-install] [--skip-env]\n\n--check         Validate prerequisites and env files without installing dependencies.\n--skip-install  Do not run the package manager install step.\n--skip-env      Do not create or validate .env files.`);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  const nodeMajor = getNodeMajor();
  if (nodeMajor < REQUIRED_NODE_MAJOR) {
    throw new Error(`Node.js ${REQUIRED_NODE_MAJOR}+ is required. Current runtime is ${process.version}.`);
  }

  const packageManager = detectPackageManager();
  console.log(`using ${packageManager} for dependency management`);

  if (!options.skipEnv) ensureEnvFiles();

  if (!options.skipInstall) {
    if (packageManager === 'pnpm') run('corepack', ['enable']);
    run(packageManager, ['install']);
  }

  if (!options.checkOnly) {
    run(packageManager, ['run', 'typecheck']);
    console.log('\nLocal setup is ready. Start the app with:');
    console.log(`${packageManager} run dev`);
  } else {
    console.log('onboarding checks passed');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

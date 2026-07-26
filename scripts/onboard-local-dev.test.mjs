import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEnvExample, detectPackageManager, getNodeMajor, missingEnvKeys, parseArgs, REQUIRED_ENV } from './onboard-local-dev.mjs';

assert.equal(getNodeMajor('v22.11.0'), 22);
assert.equal(getNodeMajor('20.10.0'), 20);
assert.deepEqual(parseArgs(['--check', '--skip-env']), { checkOnly: true, skipInstall: true, skipEnv: true, help: false });

const root = mkdtempSync(join(tmpdir(), 'lumina-onboard-'));
try {
  assert.equal(detectPackageManager(root), 'npm');
  writeFileSync(join(root, 'yarn.lock'), '');
  assert.equal(detectPackageManager(root), 'yarn');
  writeFileSync(join(root, 'pnpm-lock.yaml'), '');
  assert.equal(detectPackageManager(root), 'pnpm');
} finally {
  rmSync(root, { recursive: true, force: true });
}

const envExample = buildEnvExample();
for (const key of Object.keys(REQUIRED_ENV)) {
  assert.match(envExample, new RegExp(`^${key}=`, 'm'));
}
assert.deepEqual(missingEnvKeys(envExample), []);
assert.deepEqual(missingEnvKeys('NEXT_PUBLIC_API_BASE_URL=http://localhost:3000\n'), [
  'NEXT_PUBLIC_HORIZON_URL',
  'NEXT_PUBLIC_DEPLOY_CHANNEL',
  'NEXT_PUBLIC_RELEASE_SLOT',
]);

console.log('onboarding script tests passed');

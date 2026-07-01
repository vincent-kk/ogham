import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const bridgeDir = resolve(packageRoot, 'bridge');

const REQUIRED_ARTIFACTS = [
  'mcp-server.cjs',
  'injectStatic.mjs',
  'injectDynamic.mjs',
];

function isTruthy(v: string | undefined): boolean {
  return v !== undefined && v !== '' && v !== '0' && v !== 'false';
}

export async function setup(): Promise<void> {
  if (!isTruthy(process.env.CENNAD_E2E_SKIP_BUILD)) {
    const result = spawnSync('yarn', ['build:plugin'], {
      cwd: packageRoot,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0)
      throw new Error(
        `cennad e2e: \`yarn build:plugin\` failed (exit ${result.status ?? 'null'}). ` +
          'Fix bundle errors before running e2e.',
      );
  }

  const missing = REQUIRED_ARTIFACTS.filter(
    (name) => !existsSync(resolve(bridgeDir, name)),
  );
  if (missing.length > 0)
    throw new Error(
      `cennad e2e: required bridge artifacts missing: ${missing.join(', ')}. ` +
        `Expected under ${bridgeDir}. Did you run vitest from plugins/cennad?`,
    );

  process.env.CENNAD_E2E_BRIDGE = bridgeDir;
}

export async function teardown(): Promise<void> {
  // No-op: keep bridge artifacts to speed up repeated runs.
}

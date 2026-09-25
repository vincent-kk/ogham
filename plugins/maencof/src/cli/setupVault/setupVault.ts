/** The CLI runtime supplies process.execPath so the MCP server uses the same Node installation. */
import { access, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import {
  createMcpServerManager,
  resolveProjectMcpTarget,
} from '@ogham/agent-artifacts';

/** Explicit project connection inputs; bundlePath identifies this installed distribution. */
interface SetupVaultOptions {
  /** Host whose project connection is managed. */
  host: 'claude' | 'codex';
  /** Absolute invocation directory captured by the setup skill. */
  vaultRoot: string;
  /** Absolute path of the running setup bundle. */
  bundlePath: string;
  /** Apply the previewed connection when the setup request authorizes it. */
  apply?: boolean;
}

/** Preview or apply a project connection; return only paths, actions and success status. */
export async function runSetupVault(options: SetupVaultOptions) {
  if (!isAbsolute(options.vaultRoot))
    throw new Error('vaultRoot must be absolute');
  const vaultRoot = await realpath(options.vaultRoot);
  const serverPath = resolve(dirname(options.bundlePath), 'mcp-server.cjs');
  await access(serverPath);
  const target = resolveProjectMcpTarget({
    host: options.host,
    projectRoot: vaultRoot,
  });
  const manager = createMcpServerManager({ owner: 'maencof', target });
  await manager.inspect('maencof');
  const plan = await manager.plan({
    name: 'maencof',
    replaceDrift: false,
    definition: {
      transport: 'stdio',
      command: process.execPath,
      args: [serverPath],
      env: { OGHAM_HOST: options.host, MAENCOF_VAULT_PATH: vaultRoot },
    },
  });
  const blocked =
    Boolean(plan.failure) ||
    plan.outcomes.some((outcome) =>
      ['conflict', 'drift', 'unsupported'].includes(outcome.action),
    );
  const result =
    !blocked && options.apply ? await manager.apply(plan) : undefined;
  return {
    ok: !blocked && (result?.ok ?? true),
    mode: options.apply ? 'apply' : 'preview',
    vaultRoot,
    target: target.path,
    actions: (result?.outcomes ?? plan.outcomes).map(
      (outcome) => outcome.action,
    ),
    failure: plan.failure?.kind ?? result?.failure?.kind,
  };
}

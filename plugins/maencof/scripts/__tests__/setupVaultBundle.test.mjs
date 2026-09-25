import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'package.json'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const {
  StdioClientTransport,
} = require('@modelcontextprotocol/sdk/client/stdio.js');
const { parse } = createRequire(
  resolve(root, '../../shared/agent-artifacts/package.json'),
)('smol-toml');

test('standalone setup uses its own distribution and the live MCP reports the invocation vault', async () => {
  const temporary = await realpath(
    await mkdtemp(join(tmpdir(), 'maencof-distribution-')),
  );
  const bridge = join(temporary, 'installed', 'bridge');
  const vault = join(temporary, '사용자 공간');
  await mkdir(bridge, { recursive: true });
  await mkdir(vault);
  try {
    for (const name of ['setup-vault.cjs', 'mcp-server.cjs'])
      await copyFile(join(root, 'bridge', name), join(bridge, name));
    for (const host of ['claude', 'codex']) {
      const setup = spawnSync(
        process.execPath,
        [
          join(bridge, 'setup-vault.cjs'),
          '--host',
          host,
          '--vault-root',
          vault,
          '--apply',
        ],
        { cwd: bridge, encoding: 'utf8' },
      );
      assert.equal(setup.status, 0, setup.stderr);
      assert.equal(JSON.parse(setup.stdout).vaultRoot, vault);
      let command = process.execPath;
      let args = [join(bridge, 'mcp-server.cjs')];
      let env = { OGHAM_HOST: host, MAENCOF_VAULT_PATH: vault };
      if (host === 'claude') {
        const settings = JSON.parse(
          await readFile(join(vault, '.mcp.json'), 'utf8'),
        );
        ({ command, args, env } = settings.mcpServers.maencof);
      } else {
        const settings = parse(
          await readFile(join(vault, '.codex/config.toml'), 'utf8'),
        );
        ({ command, args, env } = settings.mcp_servers.maencof);
      }
      const client = new Client({
        name: 'maencof-distribution-test',
        version: '1.0.0',
      });
      const transport = new StdioClientTransport({
        command,
        args,
        env,
        cwd: bridge,
        stderr: 'pipe',
      });
      try {
        await client.connect(transport);
        const tools = await client.listTools();
        const inventory = tools.tools.find(
          (tool) => tool.name === 'kg_inventory',
        );
        assert.ok(inventory);
        assert.ok(inventory.inputSchema.properties.cursor);
        const result = await client.callTool({
          name: 'kg_status',
          arguments: {},
        });
        const status = JSON.parse(
          result.content.find((item) => item.type === 'text').text,
        );
        assert.equal(status.vaultPath, vault);
      } finally {
        await client.close();
      }
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

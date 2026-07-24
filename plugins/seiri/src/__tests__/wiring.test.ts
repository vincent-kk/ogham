import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform/compat';
import { describe, expect, it } from 'vitest';

import { DORMANT_HOOKS, HookName } from '../constants/hooks.js';
import { Route, STATE_PLACEHOLDER } from '../constants/http.js';
import { INTERVENTION_LEVELS } from '../constants/intervention.js';
import { RULE_ID_PREFIX } from '../constants/plugin.js';
import { ToolName } from '../constants/toolNames.js';

/**
 * Contracts that cross a language boundary.
 *
 * A constant only prevents drift where the value can be imported. JSON
 * config, build scripts and the browser page cannot import from `src/`,
 * so each of them restates a value that something else also states. These
 * assertions are what make a mismatch fail a run instead of surfacing as
 * a hook that silently never fires.
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

function read(...segments: string[]): string {
  return readFileSync(portableJoin(packageRoot, ...segments), 'utf8');
}

describe('wiring', () => {
  it('registers every active hook bundle in hooks.json', () => {
    const hooksJson = read('hooks', 'hooks.json');
    const active = Object.values(HookName).filter(
      (name) => !DORMANT_HOOKS.includes(name),
    );
    for (const name of active)
      expect(hooksJson).toContain(`bridge/${name}.mjs`);
  });

  it('keeps dormant hooks out of hooks.json until re-measurement', () => {
    const hooksJson = read('hooks', 'hooks.json');
    for (const name of DORMANT_HOOKS)
      expect(hooksJson).not.toContain(`bridge/${name}.mjs`);
  });

  it('builds every hook that hooks.json registers', () => {
    const buildScript = read('scripts', 'build-hooks.mjs');
    for (const name of Object.values(HookName))
      expect(buildScript).toContain(`name: '${name}'`);
  });

  it('declares the state slot the server rewrites', () => {
    expect(read('src', 'mcp', 'pages', 'settings', 'index.html')).toContain(
      STATE_PLACEHOLDER,
    );
  });

  it('verifies the state slot survived minification at build time', () => {
    expect(read('scripts', 'build-settings-html.mjs')).toContain(
      STATE_PLACEHOLDER,
    );
  });

  it('calls the same routes the server serves', () => {
    const app = read('src', 'mcp', 'pages', 'settings', 'scripts', 'app.js');
    for (const route of [Route.PLAN, Route.SAVE, Route.CLOSE])
      expect(app).toContain(`'${route}'`);
  });

  it('offers exactly the dial positions the config accepts', () => {
    const app = read('src', 'mcp', 'pages', 'settings', 'scripts', 'app.js');
    for (const level of INTERVENTION_LEVELS)
      expect(app).toContain(`'${level}'`);
  });

  it('namespaces every shipped rule so plugins cannot collide', () => {
    const manifest = JSON.parse(
      read('templates', 'rules', 'manifest.json'),
    ) as {
      rules: Array<{ id: string; filename: string }>;
    };

    for (const rule of manifest.rules) {
      expect(rule.id.startsWith(RULE_ID_PREFIX)).toBe(true);
      expect(rule.filename).toBe(`${rule.id}.md`);
    }
  });

  it('exposes the MCP server under the key tool references assume', () => {
    const mcpJson = JSON.parse(read('.mcp.json')) as {
      mcpServers: Record<string, unknown>;
    };
    // Skills reference tools as `mcp__plugin_seiri_<key>__<tool>`, so
    // renaming this key silently breaks every one of those references.
    expect(Object.keys(mcpJson.mcpServers)).toEqual(['tools']);
  });

  it('registers each declared tool name in the server', () => {
    const server = read('src', 'mcp', 'server', 'lifecycle', 'createServer.ts');
    for (const key of Object.keys(ToolName))
      expect(server).toContain(`ToolName.${key}`);
  });

  it('ships no agents — the manifest must not claim otherwise', () => {
    const manifest = JSON.parse(
      read('.claude-plugin', 'plugin.json'),
    ) as Record<string, unknown>;
    expect(manifest.agents).toBeUndefined();
    expect(manifest.skills).toBe('./skills/');
  });
});

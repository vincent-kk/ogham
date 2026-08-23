import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { DORMANT_HOOKS, HookName, HostTool } from '../constants/hooks.js';
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

  it('selects each watched tool by name in hooks.json', () => {
    const hooksJson = read('hooks', 'hooks.json');
    for (const tool of Object.values(HostTool))
      expect(hooksJson).toContain(`"matcher": "${tool}"`);
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
    // Isolation is guarded on emitted output, not on the input graph: with
    // `sideEffects: false` a root-barrel import contributes zero bytes, so an
    // input-graph check flags addresses that cost nothing. A byte cap plus
    // patterns that survive minification is what actually catches a regression.
    expect(buildScript).toContain('maxBytes');
    expect(buildScript).toContain('FORBIDDEN_PATTERNS');
    for (const pattern of [
      'fast-glob',
      'ZodError',
      // Written as a regex literal in the script, so its slash is escaped —
      // match the package scope alone rather than the escaped form.
      '@modelcontextprotocol',
      'XDG_CONFIG_HOME',
      'cross-spawn',
      'generateWindowsCmd',
    ])
      expect(buildScript).toContain(pattern);
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

  it('roundtrips the preview revision in the browser save body', () => {
    const app = read('src', 'mcp', 'pages', 'settings', 'scripts', 'app.js');
    const server = read('src', 'mcp', 'server', 'lifecycle', 'createServer.ts');
    const setupSkill = read('skills', 'setup', 'SKILL.md');
    expect(app).toContain('revision: previewRevision');
    expect(app).toContain('data.ruleDocs.revision');
    expect(server).toContain('revision: z');
    expect(setupSkill).toContain('resync, revision');
  });

  it('takes host rule targets from the server rather than assembling them', () => {
    const page = read('src', 'mcp', 'pages', 'settings', 'index.html');
    const app = read('src', 'mcp', 'pages', 'settings', 'scripts', 'app.js');
    const state = read(
      'src',
      'mcp',
      'tools',
      'openSettings',
      'utils',
      'buildSettingsState.ts',
    );
    expect(page).toContain('data-rules-target');
    // Both the per-rule line and the channel label arrive already resolved.
    // On a Codex host the channel is a section inside AGENTS.md, so a page
    // that joined a channel to a filename would print a path that is not one.
    expect(app).toContain('entry.displayTarget');
    expect(app).toContain('layer.displayTarget');
    expect(state).toContain('getRuleDocsChannel');
    expect(`${page}\n${app}`).not.toContain('.claude/rules/');
  });

  it('re-reads the switched layer from state the server already shipped', () => {
    const app = read('src', 'mcp', 'pages', 'settings', 'scripts', 'app.js');
    expect(app).toContain('state.ruleDocs.layers');
    // The toggle's own handler is the only thing that moves the layer, so the
    // redraw has to hang off it rather than off page load.
    expect(app).toContain('useLayer();');
    // Flipping the toggle redraws the list, the channel label and the diff.
    // Leaving any of the three behind shows one layer's answer under the
    // other layer's name.
    for (const call of [
      'renderRules()',
      'renderRuleTargets()',
      'refreshPreview()',
    ])
      expect(app.slice(app.indexOf('function useLayer'))).toContain(call);
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

  it('registers exactly one server tool for each declared tool name', () => {
    const server = read('src', 'mcp', 'server', 'lifecycle', 'createServer.ts');
    expect((server.match(/server\.registerTool\(/g) ?? []).length).toBe(
      Object.keys(ToolName).length,
    );
  });

  it('exposes every declared tool from the shipped MCP bundle', async () => {
    const client = new Client({ name: 'seiri-wiring-test', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [portableJoin(packageRoot, 'bridge', 'mcp-server.cjs')],
    });

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools.map(({ name }) => name).sort()).toEqual(
        Object.values(ToolName).sort(),
      );
    } finally {
      await client.close();
    }
  });

  it('routes Codex through hooks without the Claude failure event', () => {
    const claudeHooks = JSON.parse(read('hooks', 'hooks.json')) as {
      hooks: Record<
        string,
        Array<{ matcher?: string; hooks: Array<{ command: string }> }>
      >;
    };
    const codexHooks = JSON.parse(
      read('.codex-plugin', 'hooks.json'),
    ) as typeof claudeHooks;
    const rootManifest = JSON.parse(read('plugin.json')) as {
      hooks?: string;
    };
    const codexManifest = JSON.parse(
      read('.codex-plugin', 'plugin.json'),
    ) as typeof rootManifest;

    expect(rootManifest.hooks).toBe('./.codex-plugin/hooks.json');
    expect(codexManifest.hooks).toBe(rootManifest.hooks);
    expect(claudeHooks.hooks).toHaveProperty('PostToolUseFailure');
    expect(codexHooks.hooks).not.toHaveProperty('PostToolUseFailure');
    expect(
      claudeHooks.hooks.PostToolUse?.some(
        (group) => group.matcher === HostTool.SKILL,
      ),
    ).toBe(true);
    expect(
      codexHooks.hooks.PostToolUse?.some(
        (group) => group.matcher === HostTool.SKILL,
      ),
    ).toBe(false);
    expect(codexHooks.hooks.PostToolUse?.[0]?.hooks[0]?.command).toBe(
      claudeHooks.hooks.PostToolUse?.[0]?.hooks[0]?.command,
    );
  });

  it('ships no agents — the manifest must not claim otherwise', () => {
    const manifest = JSON.parse(
      read('.claude-plugin', 'plugin.json'),
    ) as Record<string, unknown>;
    expect(manifest.agents).toBeUndefined();
    expect(manifest.skills).toBe('./skills/');
  });
});

/**
 * Acceptance spec — claude (Anthropic) provider, per plugins/cennad/PLAN.md.
 *
 * This is big-picture DESIGN verification, not a dev unit test. It proves, end
 * to end through the public dispatcher contract:
 *   - provider registration (D1)
 *   - the claude config data model: defaults + schema (D1/D2/D3/D6)
 *   - the model x effort caps (D3 / section 3)
 *   - the claude-code CLI invocation contract (section 3 / D5 / D7), exercised
 *     through a fake `claude` binary on PATH that echoes the argv it receives.
 *
 * Target modules are loaded DYNAMICALLY so this file compiles and collects
 * before the implementation exists (tsc + vitest stay green for unrelated work).
 * Every test here is RED until the implementer builds claude per PLAN.md, then
 * turns GREEN — it is the acceptance gate, expected to fail until then.
 */
import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { CENNAD_HOME } from '../../constants/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../dispatcher/__tests__/fakeBinary.js';

// Variable-path dynamic import: a `string`-typed argument stops tsc from
// resolving the module (or its yet-to-exist exports), keeping `typecheck` green
// until the implementation lands. At runtime vitest resolves it normally.
async function load(spec: string): Promise<any> {
  return import(/* @vite-ignore */ spec);
}

const CONSTANTS = '../../constants/index.js';
const TYPES = '../../types/index.js';
const DISPATCHERS = '../../dispatcher/index.js';

describe('[acceptance] claude provider — registration (D1)', () => {
  it('PROVIDERS includes the "claude" key', async () => {
    const { PROVIDERS } = await load(TYPES);
    expect(PROVIDERS).toContain('claude');
  });

  it('the dispatcher registry exposes claude.start / claude.resume', async () => {
    const { dispatchers } = await load(DISPATCHERS);
    expect(
      dispatchers.claude,
      'claude dispatcher not registered yet',
    ).toBeDefined();
    expect(typeof dispatchers.claude.start).toBe('function');
    expect(typeof dispatchers.claude.resume).toBe('function');
  });
});

describe('[acceptance] claude config data model (D1/D2/D3/D6)', () => {
  it('DEFAULT_CONFIG carries claude in every per-provider section', async () => {
    const { DEFAULT_CONFIG } = await load(CONSTANTS);
    for (const section of [
      'ratio',
      'keywords',
      'option_flags',
      'model_map',
      'default_tier',
      'preamble',
      'recency_factor',
    ]) {
      expect(
        DEFAULT_CONFIG[section],
        `DEFAULT_CONFIG.${section}.claude missing`,
      ).toHaveProperty('claude');
    }
    expect(DEFAULT_CONFIG.ratio.claude.enabled).toBe(true);
  });

  it('default model_map.claude is the tier -> {model, effort} spec', async () => {
    const { DEFAULT_CONFIG } = await load(CONSTANTS);
    expect(DEFAULT_CONFIG.model_map.claude).toEqual({
      high: { model: 'opus', effort: 'max' },
      mid: { model: 'opus', effort: 'high' },
      low: { model: 'sonnet', effort: 'high' },
    });
  });

  it('claude flags are permission-based only — no sandbox field (D6)', async () => {
    const { DEFAULT_CONFIG } = await load(CONSTANTS);
    const claudeFlags = DEFAULT_CONFIG.option_flags.claude;
    expect(claudeFlags, 'option_flags.claude missing').toBeDefined();
    expect(claudeFlags).toHaveProperty('permission_mode');
    expect(claudeFlags).not.toHaveProperty('sandbox');
  });

  it('ClaudeFlagsSchema accepts all 6 permission modes and rejects junk', async () => {
    const { ClaudeFlagsSchema } = await load(TYPES);
    expect(
      ClaudeFlagsSchema,
      'ClaudeFlagsSchema not exported yet',
    ).toBeDefined();
    for (const mode of [
      'default',
      'acceptEdits',
      'auto',
      'dontAsk',
      'plan',
      'bypassPermissions',
    ]) {
      expect(
        ClaudeFlagsSchema.safeParse({ permission_mode: mode }).success,
        mode,
      ).toBe(true);
    }
    expect(
      ClaudeFlagsSchema.safeParse({ permission_mode: 'sandboxed' }).success,
    ).toBe(false);
  });
});

describe('[acceptance] claude model x effort caps (D3 / section 3)', () => {
  it('CLAUDE_EFFORT_LEVELS is the ordered 5-level scale, excluding ultracode', async () => {
    const { CLAUDE_EFFORT_LEVELS } = await load(CONSTANTS);
    expect(CLAUDE_EFFORT_LEVELS).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });

  it('CLAUDE_MODEL_ALIASES offers the curated alias set', async () => {
    const { CLAUDE_MODEL_ALIASES } = await load(CONSTANTS);
    expect(
      CLAUDE_MODEL_ALIASES,
      'CLAUDE_MODEL_ALIASES not exported yet',
    ).toBeDefined();
    for (const alias of ['opus', 'sonnet', 'haiku', 'fable', 'best']) {
      expect(CLAUDE_MODEL_ALIASES, alias).toContain(alias);
    }
  });

  it('MODEL_EFFORT_SETS encodes per-model caps (sonnet skips xhigh, haiku none)', async () => {
    const { MODEL_EFFORT_SETS } = await load(CONSTANTS);
    expect(
      MODEL_EFFORT_SETS,
      'MODEL_EFFORT_SETS not exported yet',
    ).toBeDefined();
    expect(MODEL_EFFORT_SETS.opus).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(MODEL_EFFORT_SETS.sonnet).toEqual(['low', 'medium', 'high', 'max']);
    expect(MODEL_EFFORT_SETS.sonnet).not.toContain('xhigh');
    expect(MODEL_EFFORT_SETS.haiku).toEqual([]);
  });
});

describe('[acceptance] claude-code CLI invocation contract (section 3 / D5 / D7)', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  // Fake `claude`: emulates `claude -p ... --output-format json` by printing a
  // single result object whose `result` is the argv it received, so the spec
  // can assert exactly which flags the dispatcher sent.
  const FAKE_CLAUDE = `#!/usr/bin/env node
const args = process.argv.slice(2);
const i = args.indexOf('--session-id');
const sid = i >= 0 ? args[i + 1] : 'fake-claude-session';
process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: JSON.stringify(args), session_id: sid }) + '\\n');
process.exit(0);
`;

  function baseOptions() {
    return {
      prompt: 'hello',
      tier: 'high',
      options: {},
      sessionId: 'claude-acc-session',
      cwd: process.cwd(),
      flags: { permission_mode: 'acceptEdits' },
      spawnTimeoutMs: 10_000,
      modelMap: {
        high: { model: 'opus', effort: 'max' },
        mid: { model: 'opus', effort: 'high' },
        low: { model: 'haiku' },
      },
    };
  }

  beforeAll(() => {
    handle = installFakeBinary('claude', FAKE_CLAUDE);
    restorePath = prependToPath(handle.dir);
  });

  afterAll(async () => {
    restorePath();
    handle.cleanup();
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('start sends -p/json/session-id/model/effort/permission-mode + isolation flags', async () => {
    const { dispatchers } = await load(DISPATCHERS);
    expect(
      dispatchers.claude,
      'claude dispatcher not registered yet',
    ).toBeDefined();

    const result = await dispatchers.claude.start(baseOptions());
    expect(result.status).toBe('success');
    const sent: string[] = JSON.parse(result.response);

    expect(sent).toContain('-p');
    expect(sent[sent.indexOf('--output-format') + 1]).toBe('json');
    expect(sent[sent.indexOf('--session-id') + 1]).toBe('claude-acc-session');
    expect(sent[sent.indexOf('--permission-mode') + 1]).toBe('acceptEdits');
    expect(sent[sent.indexOf('--model') + 1]).toBe('opus');
    expect(sent[sent.indexOf('--effort') + 1]).toBe('max');
    // D7 isolation — always attached so the child never inherits parent MCP/config
    expect(sent).toContain('--strict-mcp-config');
    expect(sent).toContain('--safe-mode');
    // a fresh start must not resume
    expect(sent).not.toContain('--resume');
    // D5 — externalSessionRef is the injected cennad sessionId (no output parsing)
    expect(result.externalSessionRef).toBe('claude-acc-session');
  });

  it('omits --effort for a tier whose model has no effort support (haiku)', async () => {
    const { dispatchers } = await load(DISPATCHERS);
    expect(dispatchers.claude).toBeDefined();

    const result = await dispatchers.claude.start({
      ...baseOptions(),
      tier: 'low',
    });
    expect(result.status).toBe('success');
    const sent: string[] = JSON.parse(result.response);
    expect(sent[sent.indexOf('--model') + 1]).toBe('haiku');
    expect(sent).not.toContain('--effort');
  });

  it('resume sends --resume <ref> and preserves the external session ref', async () => {
    const { dispatchers } = await load(DISPATCHERS);
    expect(dispatchers.claude).toBeDefined();

    const result = await dispatchers.claude.resume({
      ...baseOptions(),
      externalSessionRef: 'prior-session-id',
    });
    expect(result.status).toBe('success');
    const sent: string[] = JSON.parse(result.response);
    expect(sent[sent.indexOf('--resume') + 1]).toBe('prior-session-id');
    expect(sent).toContain('--strict-mcp-config');
    expect(sent).toContain('--safe-mode');
    expect(result.externalSessionRef).toBe('prior-session-id');
  });
});

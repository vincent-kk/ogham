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

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
    ])
      expect(
        DEFAULT_CONFIG[section],
        `DEFAULT_CONFIG.${section}.claude missing`,
      ).toHaveProperty('claude');

    expect(DEFAULT_CONFIG.ratio.claude.enabled).toBe(true);
  });

  it('default model_map.claude is the tier -> {model, effort} spec', async () => {
    const { DEFAULT_CONFIG } = await load(CONSTANTS);
    expect(DEFAULT_CONFIG.model_map.claude).toEqual({
      apex: { model: 'opus[1m]', effort: 'ultracode' },
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

  it('ClaudeFlagsSchema accepts headless-safe permission modes and rejects interactive-only modes', async () => {
    const { ClaudeFlagsSchema } = await load(TYPES);
    expect(
      ClaudeFlagsSchema,
      'ClaudeFlagsSchema not exported yet',
    ).toBeDefined();
    for (const mode of ['acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'])
      expect(
        ClaudeFlagsSchema.safeParse({ permission_mode: mode }).success,
        mode,
      ).toBe(true);

    for (const mode of ['default', 'plan'])
      expect(
        ClaudeFlagsSchema.safeParse({ permission_mode: mode }).success,
        mode,
      ).toBe(false);

    expect(
      ClaudeFlagsSchema.safeParse({ permission_mode: 'sandboxed' }).success,
    ).toBe(false);
  });
});

describe('[acceptance] claude model x effort caps (D3 / section 3)', () => {
  // `ultracode` is the top of this scale, not a separate switch: the CLI takes it
  // as an --effort value (measured 2026-07-28 — an unrecognised value warns and
  // falls back to the default, `ultracode` does neither, and the child session
  // reports "Ultracode is on"). It ranks above `max` because it adds multi-agent
  // orchestration on top of the deepest single-agent setting.
  it('CLAUDE_EFFORT_LEVELS puts ultracode at the top of the ordered scale', async () => {
    const { CLAUDE_EFFORT_LEVELS } = await load(CONSTANTS);
    expect(CLAUDE_EFFORT_LEVELS).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
      'ultracode',
    ]);
  });

  it('ClaudeEffortSchema accepts ultracode so config can store it', async () => {
    const { ClaudeEffortSchema } = await load(TYPES);
    expect(ClaudeEffortSchema.safeParse('ultracode').success).toBe(true);
    expect(ClaudeEffortSchema.safeParse('ultra').success).toBe(false);
  });

  it('CLAUDE_MODEL_ALIASES offers the curated alias set', async () => {
    const { CLAUDE_MODEL_ALIASES } = await load(CONSTANTS);
    expect(
      CLAUDE_MODEL_ALIASES,
      'CLAUDE_MODEL_ALIASES not exported yet',
    ).toBeDefined();
    for (const alias of ['opus', 'sonnet', 'haiku', 'fable', 'mythos', 'best'])
      expect(CLAUDE_MODEL_ALIASES, alias).toContain(alias);
  });

  // Caps follow the model each alias resolves to, measured 2026-07-28 via
  // `modelUsage.canonicalModel`: opus/opus[1m] → claude-opus-5, sonnet/sonnet[1m]
  // → claude-sonnet-5, fable/best → claude-fable-5, haiku → claude-haiku-4-5.
  // The Claude 5 family carries the whole ladder, so sonnet is no longer the
  // xhigh exception it was in the 4.6 generation; haiku has no effort axis at all
  // (the API rejects effort there), which is why its set stays empty.
  it('MODEL_EFFORT_SETS encodes per-model caps (haiku has no effort axis)', async () => {
    const { MODEL_EFFORT_SETS } = await load(CONSTANTS);
    expect(
      MODEL_EFFORT_SETS,
      'MODEL_EFFORT_SETS not exported yet',
    ).toBeDefined();
    const fullLadder = ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'];
    for (const alias of ['opus', 'opus[1m]', 'sonnet', 'sonnet[1m]', 'fable'])
      expect(MODEL_EFFORT_SETS[alias], alias).toEqual(fullLadder);

    expect(MODEL_EFFORT_SETS.haiku).toEqual([]);
  });

  // The CLI takes `--effort ultracode` for every alias, haiku included, so the gate
  // is cennad's to hold: a model with no effort support is the one place the top
  // mode is withheld, and any model that has an effort axis at all offers it.
  it('offers ultracode wherever a model has an effort axis at all', async () => {
    const { MODEL_EFFORT_SETS } = await load(CONSTANTS);
    for (const [alias, set] of Object.entries<readonly string[]>(
      MODEL_EFFORT_SETS,
    ))
      expect(
        set.length === 0 || set[set.length - 1] === 'ultracode',
        alias,
      ).toBe(true);
  });
});

describe('[acceptance] claude-code CLI invocation contract (section 3 / D5 / D7)', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  // Fake `claude`: emulates `claude -p ... --output-format stream-json` by printing
  // a result event whose `result` is the argv it received, so the spec can assert
  // exactly which flags the dispatcher sent.
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
      idleTimeoutMs: 5_000,
      hardCapMs: 10_000,
      modelMap: {
        apex: { model: 'opus[1m]', effort: 'max' },
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
    expect(sent[sent.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(sent).toContain('--verbose');
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

/**
 * Acceptance spec — gemini config is auto-pruned at setup/load (PLAN Phase 1).
 *
 * Per the user's request: this does NOT test gemini removal in general, only
 * the pruning behaviour. A pre-upgrade config.json that still carries `gemini`
 * keys must come back from loadConfig with gemini stripped from every section,
 * codex/antigravity intact, and the legacy gemini ratio weight migrated onto
 * the antigravity (Google) slot rather than silently lost.
 *
 * loadConfig + paths exist today, so this file compiles and runs now; it is RED
 * until Phase 1's configManager changes land, then GREEN.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME, CONFIG_PATH } from '../../constants/index.js';
import { loadConfig } from '../../core/configManager/index.js';

async function writeConfig(obj: unknown): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(obj));
}

function hasGeminiKey(section: unknown): boolean {
  return (
    typeof section === 'object' &&
    section !== null &&
    'gemini' in (section as Record<string, unknown>)
  );
}

describe('[acceptance] gemini config is pruned at setup/load', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });
  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('strips gemini from every per-provider section of an object-form config', async () => {
    await writeConfig({
      ratio: {
        gemini: { value: 40, enabled: true },
        codex: { value: 60, enabled: true },
        antigravity: { value: 50, enabled: false },
      },
      intervention_strength: 0,
      keywords: { gemini: 'g', codex: 'c', antigravity: 'a' },
      option_flags: {
        gemini: { yolo: true, sandbox: true, sandbox_backend: 'docker' },
        codex: { yolo: false, sandbox: 'workspace-write' },
        antigravity: { sandbox: false, skip_permissions: false },
      },
      default_tier: { gemini: 'high', codex: 'low', antigravity: 'mid' },
      preamble: { gemini: 'x', codex: 'y', antigravity: 'z' },
      recency_factor: { gemini: 'auto', codex: 'off', antigravity: 'auto' },
      session_ttl_hours: 72,
    });

    const cfg = (await loadConfig()) as any;

    for (const section of [
      'ratio',
      'keywords',
      'option_flags',
      'default_tier',
      'preamble',
      'recency_factor',
    ])
      expect(hasGeminiKey(cfg[section]), `gemini leaked into ${section}`).toBe(
        false,
      );

    expect(cfg.ratio).toHaveProperty('codex');
    expect(cfg.ratio.antigravity).toEqual({ value: 40, enabled: true });
  });

  it('migrates a legacy integer ratio so gemini weight lands on antigravity', async () => {
    await writeConfig({ ratio: { gemini: 3, codex: 2 } });
    const cfg = (await loadConfig()) as any;
    expect(hasGeminiKey(cfg.ratio)).toBe(false);
    expect(cfg.ratio.antigravity.enabled).toBe(true);
    expect(cfg.ratio.antigravity.value).toBeGreaterThan(0);
  });

  it('loads without crashing and keeps codex intact', async () => {
    await writeConfig({
      ratio: {
        gemini: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      keywords: { gemini: 'g', codex: 'c' },
    });
    const cfg = (await loadConfig()) as any;
    expect(cfg.ratio.codex).toBeDefined();
    expect(hasGeminiKey(cfg.ratio)).toBe(false);
  });
});

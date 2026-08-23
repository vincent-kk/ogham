/**
 * @file hostConfigurationSurfaces.test.ts
 * @description Claude/Codex configuration surface registry contract.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  HOST_CONFIGURATION_WATCHED_PATHS,
  inspectHostConfigurationSurfaces,
  renderHostConfigurationReference,
  resolveHostConfigurationSurfaces,
  resolveRuntimeHostConfigurationSurfaces,
} from '../index.js';

let root: string;
let projectRoot: string;
let env: Record<string, string>;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'maencof-host-surfaces-'));
  projectRoot = join(root, 'project');
  mkdirSync(projectRoot);
  env = {
    CLAUDE_CONFIG_DIR: join(root, 'claude-home'),
    CODEX_HOME: join(root, 'codex-home'),
  };
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('resolveHostConfigurationSurfaces', () => {
  it('preserves Claude instruction, Markdown rule, and Markdown agent surfaces', () => {
    const surface = resolveHostConfigurationSurfaces({
      host: 'claude',
      projectRoot,
      env,
    });

    expect(surface.instructions.effectivePath).toBe(
      join(projectRoot, 'CLAUDE.md'),
    );
    expect(surface.rules).toMatchObject({
      support: 'directory',
      directoryPath: join(projectRoot, '.claude', 'rules'),
      extension: 'md',
    });
    expect(surface.agents).toEqual({
      projectDirectory: join(projectRoot, '.claude', 'agents'),
      userDirectory: join(env.CLAUDE_CONFIG_DIR, 'agents'),
      extension: 'md',
      format: 'markdown',
    });
  });

  it('uses AGENTS and TOML agents while declaring Codex behavioral rules unsupported', () => {
    const surface = resolveHostConfigurationSurfaces({
      host: 'codex',
      projectRoot,
      env,
    });

    expect(surface.instructions.candidatePaths).toEqual([
      join(projectRoot, 'AGENTS.override.md'),
      join(projectRoot, 'AGENTS.md'),
    ]);
    expect(surface.rules).toMatchObject({
      support: 'unsupported',
      alternative: 'instruction-section',
      instructionTarget: join(projectRoot, 'AGENTS.md'),
    });
    expect(surface.agents).toEqual({
      projectDirectory: join(projectRoot, '.codex', 'agents'),
      userDirectory: join(env.CODEX_HOME, 'agents'),
      extension: 'toml',
      format: 'toml',
    });
  });

  it('derives the all-host changelog pathspec without Codex approval rules', () => {
    expect(HOST_CONFIGURATION_WATCHED_PATHS).toEqual(
      expect.arrayContaining([
        'CLAUDE.md',
        '.claude/CLAUDE.md',
        '.claude/rules/',
        '.claude/agents/',
        'AGENTS.override.md',
        'AGENTS.md',
        '.codex/agents/',
      ]),
    );
    expect(HOST_CONFIGURATION_WATCHED_PATHS).not.toContain('.codex/rules/');
  });

  it('inspects the exact paths selected by the registry', () => {
    const surface = resolveHostConfigurationSurfaces({
      host: 'codex',
      projectRoot,
      env,
    });
    mkdirSync(surface.agents.projectDirectory, { recursive: true });
    writeFileSync(surface.instructions.effectivePath, '# instructions\n');
    writeFileSync(
      join(surface.agents.projectDirectory, 'reviewer.toml'),
      'name = "reviewer"\n',
    );

    expect(inspectHostConfigurationSurfaces(surface)).toMatchObject({
      host: 'codex',
      instructions: {
        exists: true,
        target: surface.instructions.effectivePath,
      },
      rules: { support: 'unsupported' },
      agents: { projectFiles: 1, userFiles: 0, format: 'toml' },
    });
  });

  it('does not guess configuration coordinates for an unknown runtime host', () => {
    expect(
      resolveRuntimeHostConfigurationSurfaces(projectRoot, {
        ...env,
        OGHAM_HOST: 'future-host',
      }),
    ).toBeNull();
  });

  it('renders the two-host reference without mapping command approval rules', () => {
    const reference = renderHostConfigurationReference();

    expect(reference).toContain('.claude/rules/*.md');
    expect(reference).toContain('.codex/agents/*.toml');
    expect(reference).toContain('${CLAUDE_CONFIG_DIR:-~/.claude}/agents/*.md');
    expect(reference).toContain('${CODEX_HOME:-~/.codex}/agents/*.toml');
    expect(reference).toContain('AGENTS.md');
    expect(reference).toContain('unsupported');
    expect(reference).not.toContain('.codex/rules');
  });
});

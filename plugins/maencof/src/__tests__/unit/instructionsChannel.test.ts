/**
 * @file instructionsChannel.test.ts
 * @description 지침 문서의 호스트 채널 — MCP 는 호스트로 분기하고, 훅은 섹션을 따라간다.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  mergeMaencofSection,
  readMaencofSection,
} from '../../core/claudeMdMerger/index.js';
import { instructionsPath } from '../../hooks/shared/instructionsPath.js';
import { handleClaudeMdMerge } from '../../mcp/tools/claudemdMerge/index.js';
import { handleClaudeMdRead } from '../../mcp/tools/claudemdRead/index.js';
import { handleClaudeMdRemove } from '../../mcp/tools/claudemdRemove/index.js';

const DIRECTIVE = '## maencof\n\nvault directives.';

let vault: string;

const claudeMd = (): string => join(vault, 'CLAUDE.md');
const agentsMd = (): string => join(vault, 'AGENTS.md');
const agentsOverrideMd = (): string => join(vault, 'AGENTS.override.md');

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'maencof-channel-'));
});

afterEach(() => {
  delete process.env.OGHAM_HOST;
  delete process.env.PLUGIN_DATA;
  rmSync(vault, { recursive: true, force: true });
});

describe('claudemd tools on the Codex channel', () => {
  beforeEach(() => {
    process.env.OGHAM_HOST = 'codex';
  });

  it('merges into AGENTS.md — Codex never reads CLAUDE.md, so writing it is a silent no-op', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(readMaencofSection(agentsMd())).toBe(DIRECTIVE);
    expect(existsSync(claudeMd())).toBe(false);
  });

  it('reads back the section it merged, from the same file', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(handleClaudeMdRead(vault)).toEqual({
      exists: true,
      content: DIRECTIVE,
      file_exists: true,
    });
  });

  it('preserves pre-existing AGENTS.md text and backs up its pre-write bytes', () => {
    const existing = '# House rules\n\nKeep this text byte-for-byte.\n';
    writeFileSync(agentsMd(), existing, 'utf8');

    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(readFileSync(agentsMd(), 'utf8').startsWith(existing)).toBe(true);
    expect(readFileSync(agentsMd() + '.bak', 'utf8')).toBe(existing);
    expect(existsSync(claudeMd())).toBe(false);
  });

  it('removes from the file it wrote to', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    const result = handleClaudeMdRemove(vault, {});

    expect(result.removed).toBe(true);
    expect(readMaencofSection(agentsMd())).toBeNull();
  });

  it('relocates a hidden section when a non-empty AGENTS.override.md becomes effective', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });
    const overrideBefore = '# Effective override\n';
    writeFileSync(agentsOverrideMd(), overrideBefore, 'utf8');

    const result = handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(result.changed).toBe(true);
    expect(result.backup_path).toBe(agentsOverrideMd() + '.bak');
    expect(readMaencofSection(agentsOverrideMd())).toBe(DIRECTIVE);
    expect(readMaencofSection(agentsMd())).toBeNull();
    expect(readFileSync(agentsOverrideMd() + '.bak', 'utf8')).toBe(
      overrideBefore,
    );
  });
});

describe('claudemd tools on Claude', () => {
  it('still writes CLAUDE.md — the working host must not move', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(readMaencofSection(claudeMd())).toBe(DIRECTIVE);
    expect(existsSync(agentsMd())).toBe(false);
  });

  it('updates the unique existing .claude/CLAUDE.md section without forking a root file', () => {
    const nested = join(vault, '.claude', 'CLAUDE.md');
    mkdirSync(join(vault, '.claude'), { recursive: true });
    mergeMaencofSection(nested, 'old directives');

    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(readMaencofSection(nested)).toBe(DIRECTIVE);
    expect(existsSync(claudeMd())).toBe(false);
  });
});

describe('instructionsPath (hook-side runtime host signal)', () => {
  it('uses the Codex project target without an MCP host marker', () => {
    process.env.OGHAM_HOST = 'codex';
    handleClaudeMdMerge(vault, { content: DIRECTIVE });
    delete process.env.OGHAM_HOST;
    process.env.PLUGIN_DATA = '/host-managed/plugin-data';

    expect(instructionsPath(vault)).toBe(agentsMd());
  });

  it('stays on CLAUDE.md when that is where the section lives', () => {
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(instructionsPath(vault)).toBe(claudeMd());
  });

  it('defaults to CLAUDE.md when nothing is deployed anywhere', () => {
    expect(instructionsPath(vault)).toBe(claudeMd());
  });

  it('ignores a hand-written AGENTS.md that carries no maencof section', () => {
    writeFileSync(agentsMd(), '# House rules\n', 'utf8');
    handleClaudeMdMerge(vault, { content: DIRECTIVE });

    expect(instructionsPath(vault)).toBe(claudeMd());
    expect(readFileSync(agentsMd(), 'utf8')).toBe('# House rules\n');
  });
});

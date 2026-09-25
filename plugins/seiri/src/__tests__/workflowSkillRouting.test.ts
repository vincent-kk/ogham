import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

/** Published skill instructions; these checks verify routing contracts, not model adherence. */
const skills = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '../../skills',
);
/** File-level compiler opt-in required wherever a callable MCP address appears. */
const marker = '<!-- ogham-mcp-tools:seiri -->';

/** Read canonical instructions for one shipped skill. */
function skill(name: string): string {
  return readFileSync(portableJoin(skills, name, 'SKILL.md'), 'utf8');
}

/** Enumerate instruction files including references without assuming their depth. */
function documents(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = portableJoin(directory, entry.name);
    return entry.isDirectory()
      ? documents(path)
      : entry.name.endsWith('.md')
        ? [path]
        : [];
  });
}

describe('workflow skill routing contract', () => {
  it('opts every actionable owned MCP reference into host compilation', () => {
    const owned = documents(skills).filter((path) =>
      /mcp__plugin_seiri_tools__\w+/.test(readFileSync(path, 'utf8')),
    );
    expect(owned.length).toBeGreaterThan(0);
    for (const path of owned)
      expect(readFileSync(path, 'utf8').split(marker)).toHaveLength(2);
  });

  it('keeps callable workflow transitions in one shared reference', () => {
    const callers = documents(skills).filter((path) =>
      readFileSync(path, 'utf8').includes('mcp__plugin_seiri_tools__workflow'),
    );
    expect(callers).toEqual([
      portableJoin(skills, 'execute/references/workflow-lifecycle.md'),
    ]);
  });

  it('resolves lifecycle links inside the host-adapted skill tree', () => {
    for (const name of [
      'execute',
      'implement',
      'write-plan',
      'review-plan',
      'request-review',
      'receive-review',
      'finish',
      'verify',
      'trace-cause',
      'trace-structure',
    ]) {
      const body = skill(name);
      const link = body.match(/\]\(([^)]+workflow-lifecycle\.md)\)/);
      expect(link, name).not.toBeNull();
      expect(existsSync(portableJoin(skills, name, link![1])), name).toBe(true);
    }
  });

  it('requires native hook acknowledgement rather than treating accepted as activation', () => {
    const lifecycle = readFileSync(
      portableJoin(skills, 'execute/references/workflow-lifecycle.md'),
      'utf8',
    );
    expect(lifecycle).toMatch(/accepted[^\n]+not[^\n]+activat/i);
    expect(lifecycle).toMatch(/PostToolUse[^\n]+ACK/);
    expect(lifecycle).toMatch(/disabled[^\n]+continue/i);
    expect(lifecycle).toMatch(/Do not retry[^\n]+loop/);
  });

  it('makes lifecycle task-scoped with explicit roots and no compulsory ledger', () => {
    const lifecycle = readFileSync(
      portableJoin(skills, 'execute/references/workflow-lifecycle.md'),
      'utf8',
    );
    for (const action of ['start', 'resume', 'pause', 'finish'])
      expect(lifecycle).toContain(`\`${action}\``);
    expect(lifecycle).toMatch(/project_root[^\n]+absolute/);
    expect(lifecycle).toMatch(/task[^\n]+kebab-case/);
    expect(lifecycle).toMatch(/ledger[^\n]+optional/i);
    expect(lifecycle).toMatch(/child[^\n]+own[^\n]+start/i);
    expect(lifecycle).toMatch(/new user turn[^\n]+suspend/i);
    expect(lifecycle).toMatch(/same active task[^\n]+no[^\n]+call/i);
  });

  it('keeps standalone explanation and supporting analysis outside activation', () => {
    for (const name of [
      'explain',
      'trace-change',
      'trace-cause',
      'trace-structure',
      'verify',
    ]) {
      expect(skill(name), name).toMatch(
        /standalone[^\n]+(?:activate|activation)/i,
      );
      expect(skill(name), name).not.toContain(
        'mcp__plugin_seiri_tools__workflow',
      );
    }
  });

  it('does not require ledger creation merely to execute or review', () => {
    expect(skill('execute')).toMatch(/do not create a ledger merely/i);
    expect(skill('write-plan')).toContain(
      'Execution does not require a ledger.',
    );
    expect(skill('review-plan')).toMatch(/if (?:the|this) task has a ledger/i);
    expect(skill('request-review')).toMatch(
      /Do not create a ledger for a review-only request/i,
    );
  });

  it('does not equate lifecycle finish with proof of task completion', () => {
    const lifecycle = readFileSync(
      portableJoin(skills, 'execute/references/workflow-lifecycle.md'),
      'utf8',
    );
    expect(lifecycle).toMatch(/finish[^\n]+does not[^\n]+(?:prove|certify)/i);
    expect(skill('finish')).toMatch(/keep[^\n]+pause/i);
  });
});

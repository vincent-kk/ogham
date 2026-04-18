/**
 * @file skill-tools-coverage.test.ts
 * @description G2 guardrail — symmetric-difference check between skills/<name>/references/workflow.md
 *   and the sibling tools.md. Every imbas MCP tool name (bare or mcp__plugin_imbas_tools__* fully-qualified)
 *   invoked in workflow.md must appear in tools.md. Every tool name listed in tools.md that is NOT
 *   in workflow.md must carry an explicit `(declared-only)` or `(fallback)` marker.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

function skillNames(): string[] {
  return readdirSync(SKILLS_DIR).filter((name) => {
    const st = statSync(join(SKILLS_DIR, name));
    return st.isDirectory();
  });
}

// Bare tool names registered in src/mcp/server/server.ts. Kept in sync with
// EXPECTED_TOOLS in server-registration.test.ts. The fully-qualified form
// `mcp__plugin_imbas_tools__<name>` is also matched for agent tool lists.
const BARE_TOOL_NAMES = [
  'ping',
  'run_create', 'run_get', 'run_transition', 'run_list',
  'manifest_get', 'manifest_save', 'manifest_validate', 'manifest_plan',
  'manifest_implement_plan',
  'config_get', 'config_set',
  'cache_get', 'cache_set',
  'ast_search', 'ast_analyze',
] as const;

const TOOL_REGEX = new RegExp(
  `\\b(${BARE_TOOL_NAMES.join('|')}|mcp__plugin_imbas_tools__[a-z_]+)\\b`,
  'g',
);

/**
 * Extract tool names from markdown text, ignoring tools.md "(declared-only)" / "(fallback)"
 * marker rows. Returns a Map<tool-name, hasMarker>.
 */
function extractTools(content: string): Set<string> {
  return new Set(Array.from(content.matchAll(TOOL_REGEX), (m) => m[1]));
}

function extractToolsWithMarkers(content: string): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const line of content.split('\n')) {
    const hasMarker = /\(declared-only\)|\(fallback\)/.test(line);
    for (const m of line.matchAll(TOOL_REGEX)) {
      const name = m[1];
      // Sticky-OR: once a tool has a marker anywhere, it stays marked.
      result.set(name, (result.get(name) ?? false) || hasMarker);
    }
  }
  return result;
}

describe('G2 skill-tools-coverage — workflow ↔ tools.md symmetric difference', () => {
  const skills = skillNames();

  it('every tool invoked in workflow.md is listed in the sibling tools.md', () => {
    const drift: string[] = [];
    for (const skill of skills) {
      const workflow = join(SKILLS_DIR, skill, 'references', 'workflow.md');
      const tools = join(SKILLS_DIR, skill, 'references', 'tools.md');
      if (!existsSync(workflow) || !existsSync(tools)) continue;

      const used = extractTools(readFileSync(workflow, 'utf8'));
      const declared = extractToolsWithMarkers(readFileSync(tools, 'utf8'));
      for (const tool of used) {
        if (!declared.has(tool)) {
          drift.push(`skills/${skill}: workflow.md invokes ${tool} but tools.md does not list it`);
        }
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('tools.md entries not invoked in workflow.md carry (declared-only) or (fallback) marker', () => {
    const drift: string[] = [];
    for (const skill of skills) {
      const workflow = join(SKILLS_DIR, skill, 'references', 'workflow.md');
      const tools = join(SKILLS_DIR, skill, 'references', 'tools.md');
      if (!existsSync(workflow) || !existsSync(tools)) continue;

      const used = extractTools(readFileSync(workflow, 'utf8'));
      const declared = extractToolsWithMarkers(readFileSync(tools, 'utf8'));
      for (const [tool, hasMarker] of declared) {
        if (!used.has(tool) && !hasMarker) {
          drift.push(`skills/${skill}: tools.md lists ${tool} but it is not invoked in workflow.md and lacks (declared-only)/(fallback) marker`);
        }
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});

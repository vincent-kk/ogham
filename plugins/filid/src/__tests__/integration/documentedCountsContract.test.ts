import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FACTS_ACTIONS } from '../../constants/facts.js';
import { MCP_TOOL_NAMES } from '../../constants/mcpToolNames.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '../../..');
const repoRoot = resolve(packageRoot, '../..');

/**
 * Read one document as text.
 * @param path Path relative to the repository root.
 * @returns The file contents.
 */
function readDoc(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

/** Skills a user can invoke: one directory with a `SKILL.md` each. */
const skillCount = readdirSync(resolve(packageRoot, 'skills'), {
  withFileTypes: true,
}).filter((entry) => {
  if (!entry.isDirectory()) return false;
  return readdirSync(resolve(packageRoot, 'skills', entry.name)).includes(
    'SKILL.md',
  );
}).length;

/** Every catalog row and prose claim that states one of these counts. */
const CATALOG_DOCS = ['README.md', 'README-ko_kr.md'];

/**
 * Cut the filid section out of a catalog that documents every plugin.
 *
 * Sibling plugins keep their own counts and their own agent rows; asserting
 * over the whole file would make this contract fail on their content.
 *
 * @param text The whole catalog document.
 * @param doc Its path, for the failure message.
 * @returns The text from the filid heading up to the next heading of the same level.
 */
function filidSection(text: string, doc: string): string {
  const start = text.indexOf('### [`@ogham/filid`]');
  if (start === -1) throw new Error(`no filid section in ${doc}`);
  const next = text.indexOf('\n### ', start + 1);
  return next === -1 ? text.slice(start) : text.slice(start, next);
}

describe('documents that state a count match the source they describe', () => {
  it('counts the tools and skills the package actually ships', () => {
    expect(MCP_TOOL_NAMES.length).toBe(5);
    expect(skillCount).toBe(12);
  });

  it.each(CATALOG_DOCS)('states the right counts in %s', (doc) => {
    const text = filidSection(readDoc(doc), doc);
    const row = (label: string): string => {
      const match = new RegExp(`^\\|\\s*${label}[^|]*\\|([^|]*)\\|`, 'm').exec(
        text,
      );
      if (match === null) throw new Error(`no "${label}" row in ${doc}`);
      return match[1]!.trim();
    };

    expect(row('Skills')).toBe(String(skillCount));
    expect(row('MCP')).toBe(String(MCP_TOOL_NAMES.length));
    // The 1.0 release removed persona agents (ADR-13); the row must go with them.
    expect(text).not.toMatch(/^\|\s*Agents\s*\|/m);
  });

  it.each(CATALOG_DOCS)('drops what 1.0 removed, in %s', (doc) => {
    const text = filidSection(readDoc(doc), doc);

    expect(text).not.toMatch(/@ast-grep\/napi/);
    expect(text).not.toMatch(/SubagentStart/);
    expect(text).not.toMatch(/7[- ](?:persona|인)/);
  });

  it('names every facts action in the API surface table', () => {
    const text = readDoc('.metadata/filid/08-API-SURFACE.md');
    const row = /^\|\s*`facts`\s*\|([^|]*)\|/m.exec(text);
    if (row === null) throw new Error('no facts row in 08-API-SURFACE.md');

    expect(row[1]!.trim().split('/')).toEqual(Object.values(FACTS_ACTIONS));
  });

  it('states one tool count across the architecture document', () => {
    const text = readDoc('.metadata/filid/01-ARCHITECTURE.md');
    const claims = [
      ...text.matchAll(/(?:(\d+)개 도구|MCP 도구(?:는 정확히| 수는) (\d+)개)/g),
    ].map((match) => match[1] ?? match[2]);

    expect(claims.length).toBeGreaterThan(0);
    expect([...new Set(claims)]).toEqual([String(MCP_TOOL_NAMES.length)]);
  });
});

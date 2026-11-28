import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { DIRECTIVE_DOCUMENT_LIMITS } from '../constants/directives.js';

/** The published persist-directives instructions; these checks bind them to the runtime's constants, not to model adherence. */
const skill = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '../../skills/persist-directives',
);

/** The maintenance rules every new `index.md` starts with, pinned verbatim so the template cannot drift from the contract. */
const MAINTENANCE_RULES = [
  'While working, append one line to `notepad.jsonl` for anything that must not be lost.',
  'When a unit of work ends (a full round from planning through rework), hold a retrospective: distill the notepad into the documents above, append what happened to `history.jsonl`, refresh `dashboard.md`, then clear the notepad.',
  'A `rewrite` document is never appended to: read it whole, rewrite the sentence that already covers the matter, and delete a rule that a later one replaces.',
  'Keep this file within its size limit; what does not fit moves to `principles.md`.',
];

/**
 * Read one instruction file of the skill.
 * @param name Path relative to the skill directory.
 * @returns The file's text.
 */
function read(name: string): string {
  return readFileSync(portableJoin(skill, name), 'utf8');
}

describe('persist-directives skill documents', () => {
  it('routes the entry file to both references and to the append operation', () => {
    const entry = read('SKILL.md');
    expect(entry).toContain('](references/structure.md)');
    expect(entry).toContain('](references/maintenance.md)');
    expect(entry).toContain('directives_op: "append"');
  });

  it('states each document limit the runtime enforces', () => {
    const rows = read('references/structure.md').split('\n');
    for (const [file, limit] of Object.entries(DIRECTIVE_DOCUMENT_LIMITS)) {
      const row = rows.find((line) => line.startsWith(`| \`${file}\` `));
      expect(row, file).toContain(`${limit.toLocaleString('en-US')} bytes`);
    }
  });

  it('starts every entry document with the four maintenance rules', () => {
    const structure = read('references/structure.md');
    for (const rule of MAINTENANCE_RULES)
      expect(structure).toContain(`- ${rule}`);
  });

  it('tells the maintainer to replace rules rather than accumulate them', () => {
    const maintenance = read('references/maintenance.md');
    expect(maintenance).toContain('A `rewrite` document is never appended to.');
    expect(maintenance).toContain('The later user instruction wins.');
    expect(maintenance).toContain('is deleted, not kept beside it');
  });
});

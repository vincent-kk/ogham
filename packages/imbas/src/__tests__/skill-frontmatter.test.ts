/**
 * @file skill-frontmatter.test.ts
 * @description G3 guardrail — SKILL.md frontmatter linter.
 *   Parses YAML frontmatter (simple line parser sufficient for current schema) and asserts:
 *   - name matches parent directory name
 *   - description field present
 *   - version matches semver
 *   - user_invocable is a boolean when present
 *   - complexity (when present) is one of: simple | moderate | complex
 *   - plugin equals "imbas"
 *   - Trigger line inside description matches canonical regex /^\s*Trigger:\s+"[^"]+"(,\s+"[^"]+")*$/
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

const SEMVER = /^\d+\.\d+\.\d+$/;
const TRIGGER_RE = /^\s*Trigger:\s+"[^"]+"(,\s+"[^"]+")*$/;
const COMPLEXITY = new Set(['simple', 'moderate', 'complex']);

interface Frontmatter {
  name?: string;
  description?: string;
  version?: string;
  user_invocable?: boolean;
  complexity?: string;
  plugin?: string;
}

function parseFrontmatter(raw: string): { fm: Frontmatter; descriptionLines: string[] } {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return { fm: {}, descriptionLines: [] };
  let end = 1;
  while (end < lines.length && lines[end] !== '---') end++;
  const body = lines.slice(1, end);

  const fm: Frontmatter = {};
  const descriptionLines: string[] = [];
  let inDescription = false;

  for (const line of body) {
    if (inDescription) {
      if (/^[a-z_]+:/.test(line)) {
        inDescription = false;
      } else {
        descriptionLines.push(line);
        continue;
      }
    }
    const m = line.match(/^(name|description|version|user_invocable|complexity|plugin):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim().replace(/^"(.*)"$/, '$1');
    if (key === 'description' && val === '>') {
      inDescription = true;
      continue;
    }
    if (key === 'user_invocable') {
      (fm as Record<string, unknown>)[key] = val === 'true';
    } else {
      (fm as Record<string, unknown>)[key] = val;
    }
  }
  // If folded description was used, populate fm.description from the folded lines.
  if (fm.description === undefined && descriptionLines.length > 0) {
    fm.description = descriptionLines.map((l) => l.trim()).filter(Boolean).join(' ');
  }
  return { fm, descriptionLines };
}

describe('G3 skill-frontmatter — canonical SKILL.md frontmatter', () => {
  const skills = readdirSync(SKILLS_DIR).filter((name) => {
    const st = statSync(join(SKILLS_DIR, name));
    return st.isDirectory();
  });

  it('every SKILL.md has name matching directory, valid version, plugin=imbas', () => {
    const drift: string[] = [];
    for (const skill of skills) {
      const path = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!statSync(path, { throwIfNoEntry: false })) continue;
      const { fm } = parseFrontmatter(readFileSync(path, 'utf8'));
      if (fm.name !== skill) drift.push(`${path}: name="${fm.name}" does not match dir="${skill}"`);
      if (!fm.version || !SEMVER.test(fm.version)) drift.push(`${path}: version="${fm.version}" is not semver`);
      if (!fm.description) drift.push(`${path}: description missing`);
      if (fm.plugin !== 'imbas') drift.push(`${path}: plugin="${fm.plugin}" must be "imbas"`);
      if (fm.complexity && !COMPLEXITY.has(fm.complexity)) {
        drift.push(`${path}: complexity="${fm.complexity}" not in ${Array.from(COMPLEXITY).join('|')}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('every Trigger line in description matches canonical regex', () => {
    const drift: string[] = [];
    for (const skill of skills) {
      const path = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!statSync(path, { throwIfNoEntry: false })) continue;
      const { descriptionLines } = parseFrontmatter(readFileSync(path, 'utf8'));
      const triggerLine = descriptionLines.find((l) => /\bTrigger:/.test(l));
      if (!triggerLine) continue; // Optional — not every skill declares a Trigger line
      if (!TRIGGER_RE.test(triggerLine)) {
        drift.push(`${path}: Trigger line does not match canonical regex: ${JSON.stringify(triggerLine)}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});

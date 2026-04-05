/**
 * @file skill-doc-sync.test.ts
 * @description G1 guardrail — asserts skill doc field references resolve to Zod schemas.
 *   Parses only fenced code blocks and backticked table cells in every skill markdown file.
 *   Extracts references to config.language.* and phases.*.<field> and verifies they
 *   exist in LanguageConfigSchema / ValidatePhaseSchema / SplitPhaseSchema /
 *   DevplanPhaseSchema. Fails CI on drift.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LanguageConfigSchema,
} from '../types/config.js';
import {
  ValidatePhaseSchema,
  SplitPhaseSchema,
  DevplanPhaseSchema,
} from '../types/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

function walkMarkdown(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkMarkdown(full, acc);
    else if (entry.endsWith('.md')) acc.push(full);
  }
  return acc;
}

/**
 * Extract text from fenced code blocks and backticked table cells only.
 * Excludes lines marked with `<!-- schema-doc-sync: ignore -->` and ignore-block ranges.
 */
function extractStructuredText(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inFence = false;
  let inIgnoreBlock = false;

  for (const line of lines) {
    if (/<!--\s*schema-doc-sync:\s*ignore-block\s*-->/.test(line)) {
      inIgnoreBlock = true;
      continue;
    }
    if (/<!--\s*schema-doc-sync:\s*end\s*-->/.test(line)) {
      inIgnoreBlock = false;
      continue;
    }
    if (inIgnoreBlock) continue;
    if (/<!--\s*schema-doc-sync:\s*ignore\s*-->/.test(line)) continue;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    // Inline backtick extraction for table cells / prose
    const ticks = line.match(/`[^`\n]+`/g);
    if (ticks) out.push(ticks.join(' '));
  }
  return out.join('\n');
}

const LANGUAGE_KEYS = Object.keys(LanguageConfigSchema.shape);
const PHASE_FIELD_MAP: Record<string, readonly string[]> = {
  validate: Object.keys(ValidatePhaseSchema.shape),
  split: Object.keys(SplitPhaseSchema.shape),
  devplan: Object.keys(DevplanPhaseSchema.shape),
};

describe('G1 skill-doc-sync — schema field references', () => {
  const files = walkMarkdown(SKILLS_DIR);

  it('every config.language.<key> reference resolves to LanguageConfigSchema', () => {
    const drift: string[] = [];
    for (const file of files) {
      const structured = extractStructuredText(readFileSync(file, 'utf8'));
      const matches = structured.matchAll(/config\.language\.([a-z_]+)/g);
      for (const m of matches) {
        const key = m[1];
        if (!LANGUAGE_KEYS.includes(key)) {
          drift.push(`${file}: config.language.${key} not in LanguageConfigSchema (known: ${LANGUAGE_KEYS.join(', ')})`);
        }
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('every phases.<phase>.<field> reference resolves to the phase schema', () => {
    const drift: string[] = [];
    for (const file of files) {
      const structured = extractStructuredText(readFileSync(file, 'utf8'));
      const matches = structured.matchAll(/phases\.(validate|split|devplan)\.([a-z_]+)/g);
      for (const m of matches) {
        const phase = m[1];
        const field = m[2];
        const known = PHASE_FIELD_MAP[phase];
        if (!known || !known.includes(field)) {
          drift.push(`${file}: phases.${phase}.${field} not in ${phase} phase schema (known: ${known?.join(', ') ?? 'N/A'})`);
        }
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});

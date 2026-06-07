#!/usr/bin/env node
/**
 * @file check-spec-ref-backlinks.mjs
 * @description Verifies that every provider-specific SPEC file has a backlink
 *   in the parent SPEC-provider.md AND at least one references/<name>/ tree
 *   exists under any skill directory.
 *
 *   Reads: .metadata/imbas/specs/SPEC-provider-{name}.md
 *   Checks:
 *     1. SPEC-provider.md contains the SPEC-provider-{name}.md literal.
 *     2. At least one skills/star/references/{name}/ directory exists.
 *
 *   Exit 0 on success. Exit 1 with list of failures.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const SPECS_DIR = join(PKG_ROOT, '..', '..', '.metadata', 'imbas', 'specs');
const SKILLS_DIR = join(PKG_ROOT, 'skills');
const PARENT_SPEC = join(SPECS_DIR, 'SPEC-provider.md');

if (!existsSync(SPECS_DIR)) {
  console.error('check-spec-ref-backlinks: FAIL — specs dir not found:', SPECS_DIR);
  process.exit(1);
}

if (!existsSync(PARENT_SPEC)) {
  console.error('check-spec-ref-backlinks: FAIL — SPEC-provider.md not found:', PARENT_SPEC);
  process.exit(1);
}

const parentContent = readFileSync(PARENT_SPEC, 'utf8');

// Find all SPEC-provider-*.md files
const providerSpecFiles = readdirSync(SPECS_DIR).filter(
  (f) => f.startsWith('SPEC-provider-') && f.endsWith('.md')
);

if (providerSpecFiles.length === 0) {
  console.log('check-spec-ref-backlinks: OK — no provider specs found (nothing to check)');
  process.exit(0);
}

const failures = [];
const successes = [];

for (const specFile of providerSpecFiles) {
  // Extract provider name: SPEC-provider-<name>.md -> <name>
  const providerName = specFile.replace(/^SPEC-provider-/, '').replace(/\.md$/, '');

  // Check 1: parent spec contains backlink
  if (!parentContent.includes(specFile)) {
    failures.push(`missing backlink in SPEC-provider.md for: ${specFile}`);
  }

  // Check 2: at least one skills/*/references/<name>/ exists
  let hasReferencesTree = false;
  if (existsSync(SKILLS_DIR)) {
    const skillDirs = readdirSync(SKILLS_DIR).filter((entry) => {
      const full = join(SKILLS_DIR, entry);
      return statSync(full).isDirectory();
    });
    for (const skill of skillDirs) {
      const refPath = join(SKILLS_DIR, skill, 'references', providerName);
      if (existsSync(refPath) && statSync(refPath).isDirectory()) {
        hasReferencesTree = true;
        break;
      }
    }
  }

  if (!hasReferencesTree) {
    failures.push(`missing references tree under skills/*/references/${providerName}/`);
  }

  if (!failures.some((f) => f.includes(providerName))) {
    successes.push(providerName);
  }
}

if (failures.length > 0) {
  console.error(`check-spec-ref-backlinks: FAIL — missing:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(`check-spec-ref-backlinks: OK — ${successes.join(', ')}`);
process.exit(0);

#!/usr/bin/env node
/**
 * Inject content-hash digests of rule doc templates into manifest.json so
 * the runtime can detect template drift against deployed .claude/rules/<file>.
 *
 * Modes:
 *   default  — compute sha256 for every manifest entry's filename, write
 *              templateHash back into templates/rules/manifest.json
 *              (idempotent; JSON order preserved).
 *   --check  — fail with exit 1 if stored templateHash disagrees with the
 *              current file content. Used by CI to catch build skips.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesDir = resolve(__dirname, '..', 'templates', 'rules');
const manifestPath = resolve(rulesDir, 'manifest.json');

const checkMode = process.argv.includes('--check');

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const raw = readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(raw);
if (!manifest || !Array.isArray(manifest.rules)) {
  console.error(`[sync-rule-hashes] malformed manifest at ${manifestPath}`);
  process.exit(1);
}

const mismatches = [];
let mutated = false;

for (const entry of manifest.rules) {
  if (!entry.filename || typeof entry.filename !== 'string') {
    console.error(
      `[sync-rule-hashes] entry missing filename: ${JSON.stringify(entry)}`,
    );
    process.exit(1);
  }
  const templatePath = resolve(rulesDir, entry.filename);
  // NOTE: hashes are computed over raw bytes. .gitattributes must enforce
  // `text eol=lf` for packages/filid/templates/rules/*.md so developers
  // on Windows (core.autocrlf) don't trigger false-positive drift in --check mode.
  let content;
  try {
    content = readFileSync(templatePath);
  } catch (err) {
    console.error(
      `[sync-rule-hashes] template missing for "${entry.id}" at ${templatePath}: ${err.message}`,
    );
    process.exit(1);
  }
  const hash = sha256Hex(content);

  if (entry.templateHash !== hash) {
    mismatches.push({ id: entry.id, expected: entry.templateHash ?? '<absent>', actual: hash });
    if (!checkMode) {
      entry.templateHash = hash;
      mutated = true;
    }
  }
}

if (checkMode) {
  if (mismatches.length > 0) {
    console.error('[sync-rule-hashes] manifest is stale:');
    for (const m of mismatches) {
      console.error(`  - ${m.id}: stored=${m.expected} actual=${m.actual}`);
    }
    console.error('Run `node scripts/sync-rule-hashes.mjs` (or `yarn filid build`) to refresh.');
    process.exit(1);
  }
  console.log('[sync-rule-hashes] manifest up to date');
  process.exit(0);
}

if (mutated) {
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(manifestPath, serialized, 'utf8');
  console.log(
    `[sync-rule-hashes] updated ${mismatches.length} entr${mismatches.length === 1 ? 'y' : 'ies'} in manifest.json`,
  );
} else {
  console.log('[sync-rule-hashes] manifest up to date');
}

#!/usr/bin/env node
// loaded by: manual invocation — node .metadata/rule-bench/apply-rules-sync.mjs
// Syncs canonical rule templates (plugins/*/templates/rules/*.md) to their two
// deployed copies: .claude/rules/<file> (verbatim bytes) and the root AGENTS.md
// marker sections (<!-- NS:START:file --> ... <!-- NS:END:file -->). Run AFTER
// editing templates and re-injecting manifest hashes (yarn build:rules).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const plugins = [
  { ns: 'SEIRI', dir: join(repoRoot, 'plugins', 'seiri') },
  { ns: 'FILID', dir: join(repoRoot, 'plugins', 'filid') },
];

let agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');
const changed = [];

for (const { ns, dir } of plugins) {
  const manifest = JSON.parse(readFileSync(join(dir, 'templates', 'rules', 'manifest.json'), 'utf8'));
  for (const entry of manifest.rules) {
    const content = readFileSync(join(dir, 'templates', 'rules', entry.filename), 'utf8');
    const deployed = join(repoRoot, '.claude', 'rules', entry.filename);
    if (readFileSync(deployed, 'utf8') !== content) {
      writeFileSync(deployed, content);
      changed.push(`.claude/rules/${entry.filename}`);
    }
    const start = `<!-- ${ns}:START:${entry.filename} -->`;
    const end = `<!-- ${ns}:END:${entry.filename} -->`;
    const a = agents.indexOf(start);
    const b = agents.indexOf(end);
    if (a === -1 || b === -1) {
      console.warn(`marker missing in AGENTS.md: ${entry.filename}`);
      continue;
    }
    const body = content.endsWith('\n') ? content : content + '\n';
    const next = agents.slice(0, a) + start + '\n' + body + agents.slice(b);
    if (next !== agents) {
      agents = next;
      changed.push(`AGENTS.md#${entry.filename}`);
    }
  }
}

writeFileSync(join(repoRoot, 'AGENTS.md'), agents);
console.log(changed.length === 0 ? 'all targets already in sync' : `synced:\n  ${changed.join('\n  ')}`);

#!/usr/bin/env node
// loaded by: manual invocation — node .metadata/rule-bench/prepare.mjs --issue iA --arm R0|R1|R2 --rep 1 --out <scratch>
// Copies the issue fixture into an isolated run directory, deploys the arm's rule
// files into <runDir>/.claude/rules/ (R0 deploys none), and prints {runDir, prompt}.
// The bench marker file is written BESIDE the run dir, never inside it (no observer effect).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const benchRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Reads a `--name value` CLI argument.
 * @param {string} name - flag name without dashes
 * @param {string} [fallback] - value when the flag is absent
 * @returns {string | undefined} the argument value
 */
function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const issue = arg('issue');
const armName = arg('arm', 'R0');
const rep = arg('rep', '1');
const out = arg('out');
if (!issue || !out) {
  console.error('usage: prepare.mjs --issue <id> --arm R0|R1|R2 --rep N --out <dir>');
  process.exit(2);
}

const issueDir = join(benchRoot, 'issues', issue);
const runDir = resolve(out, `${issue}-${armName}-t${rep}`);
if (existsSync(runDir)) rmSync(runDir, { recursive: true, force: true });
mkdirSync(runDir, { recursive: true });
cpSync(join(issueDir, 'fixture'), runDir, { recursive: true });

if (armName !== 'R0') {
  const armDir = join(benchRoot, 'arms', armName);
  const rulesDir = join(runDir, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  for (const f of readdirSync(armDir).filter((n) => n.endsWith('.md')))
    cpSync(join(armDir, f), join(rulesDir, f));
}

const task = readFileSync(join(issueDir, 'task.md'), 'utf8').trim();
const lines = [
  `This folder is an isolated scratch repository: ${runDir}`,
  'Work ONLY inside this folder. Do not read, list, or modify anything outside it. Do not use the network or any package manager.',
];
if (armName !== 'R0')
  lines.push(`Before starting, read every .md file under ${join(runDir, '.claude', 'rules')} and follow those rules where they apply.`);
lines.push('', 'Task:', task, '');
lines.push('Do not modify or delete any existing *.test.js file.');
lines.push('When you are done, reply with a short summary of what you changed.');

writeFileSync(
  resolve(out, `${issue}-${armName}-t${rep}.bench.json`),
  JSON.stringify({ issue, arm: armName, rep: Number(rep) }, null, 2) + '\n',
);
console.log(JSON.stringify({ runDir, prompt: lines.join('\n') }));

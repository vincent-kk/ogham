#!/usr/bin/env node
/**
 * check-agent-tools-frontmatter.mjs
 *
 * Guards against silent expansion of agent `tools:` frontmatter arrays.
 *
 * Reads each imbas agent markdown file, extracts the `tools:` list from the
 * YAML frontmatter, and diffs it against the pinned baseline in
 * scripts/baselines/agent-tools-frontmatter.json.
 *
 * Exits 0 if every agent's current tools array exactly equals the baseline
 * (order-independent). Exits 1 on any drift with a human-readable diff.
 *
 * Rationale: agent `tools:` frontmatter is a soft constraint in local provider
 * mode (the array grants Atlassian tools even when running as local). The
 * skill-level Constraints block directs the LLM not to invoke them, but a
 * future patch could silently widen the grant. This script makes that
 * widening visible in CI / Phase F verification.
 *
 * Update the baseline JSON only when intentionally changing agent permissions.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const AGENTS_DIR = join(PKG_ROOT, 'agents');
const BASELINE_PATH = join(__dirname, 'baselines', 'agent-tools-frontmatter.json');

function extractToolsFromFrontmatter(markdown) {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const frontmatter = fmMatch[1];
  const lines = frontmatter.split('\n');
  const tools = [];
  let inTools = false;
  for (const line of lines) {
    if (/^tools:\s*$/.test(line)) {
      inTools = true;
      continue;
    }
    if (inTools) {
      const itemMatch = line.match(/^\s+-\s+(\S+)\s*$/);
      if (itemMatch) {
        tools.push(itemMatch[1]);
      } else if (/^\S/.test(line)) {
        // New top-level key → end of tools list.
        break;
      }
    }
  }
  return tools;
}

function sortedEqual(a, b) {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

function diffArrays(current, baseline) {
  const currentSet = new Set(current);
  const baselineSet = new Set(baseline);
  const added = [...currentSet].filter((x) => !baselineSet.has(x));
  const removed = [...baselineSet].filter((x) => !currentSet.has(x));
  return { added, removed };
}

function main() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`Baseline not found: ${BASELINE_PATH}`);
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const errors = [];

  for (const [agentName, baselineTools] of Object.entries(baseline.agents)) {
    const mdPath = join(AGENTS_DIR, `${agentName}.md`);
    if (!existsSync(mdPath)) {
      errors.push(`Agent file missing: ${mdPath}`);
      continue;
    }
    const md = readFileSync(mdPath, 'utf8');
    const currentTools = extractToolsFromFrontmatter(md);
    if (currentTools === null) {
      errors.push(`${agentName}: could not parse tools: frontmatter`);
      continue;
    }
    if (!sortedEqual(currentTools, baselineTools)) {
      const { added, removed } = diffArrays(currentTools, baselineTools);
      errors.push(
        `${agentName}: tools frontmatter drift\n` +
          (added.length ? `  added   (+): ${added.join(', ')}\n` : '') +
          (removed.length ? `  removed (-): ${removed.join(', ')}\n` : '') +
          '  If this change is intentional, update scripts/baselines/agent-tools-frontmatter.json.'
      );
    }
  }

  if (errors.length > 0) {
    console.error('agent-tools-frontmatter drift detected:');
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log(
    `OK: all ${Object.keys(baseline.agents).length} agent tools: frontmatters match baseline.`
  );
}

main();

#!/usr/bin/env node
/**
 * Complexity Scorer - Evaluates skill complexity and recommends structure
 *
 * Usage:
 *     node complexity_scorer.mjs --interactive
 *     node complexity_scorer.mjs --analyze <skill-path>
 *
 * Output:
 *     JSON: {
 *         "score": 0.52,
 *         "category": "medium",
 *         "structure_recommendation": {...},
 *         "components": {...}
 *     }
 */

import { parseArgs } from 'node:util';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

function calculateComplexity(spec) {
  const fileScore = Math.min(spec.fileCount / 20, 1.0);
  const mcpScore = spec.hasMcpIntegration ? 1.0 : 0.0;
  const workflowScore = Math.min(spec.workflowSteps / 10, 1.0);
  const conditionalScore = Math.min(spec.conditionals / 15, 1.0);
  const depsScore = Math.min(spec.externalDeps / 5, 1.0);

  const complexity =
    fileScore * 0.3 +
    mcpScore * 0.2 +
    workflowScore * 0.1 +
    conditionalScore * 0.15 +
    depsScore * 0.25;

  let category;
  if (complexity < 0.4) category = 'simple';
  else if (complexity < 0.7) category = 'medium';
  else category = 'complex';

  let structure;
  if (category === 'simple') {
    structure = {
      skill_md_target: '2-3k words',
      include_reference_md: false,
      include_examples_md: false,
      include_knowledge: false,
      include_docs: false,
      scripts_count: '1-2',
      description: 'Minimal structure with SKILL.md and basic scripts',
    };
  } else if (category === 'medium') {
    structure = {
      skill_md_target: '3-4k words',
      include_reference_md: true,
      include_examples_md: true,
      include_knowledge: false,
      include_docs: false,
      scripts_count: '3-5',
      description: 'Standard structure with layered documentation',
    };
  } else {
    structure = {
      skill_md_target: '4-5k words (compressed)',
      include_reference_md: true,
      include_examples_md: true,
      include_knowledge: true,
      include_docs: true,
      scripts_count: '5-7+',
      description: 'Full hierarchy with deep knowledge base',
    };
  }

  return {
    score: Math.round(complexity * 100) / 100,
    category,
    components: {
      file_score: Math.round(fileScore * 100) / 100,
      mcp_score: Math.round(mcpScore * 100) / 100,
      workflow_score: Math.round(workflowScore * 100) / 100,
      conditional_score: Math.round(conditionalScore * 100) / 100,
      deps_score: Math.round(depsScore * 100) / 100,
    },
    structure_recommendation: structure,
  };
}

function countFilesRecursive(dir) {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFilesRecursive(fullPath);
      }
    }
  } catch {
    // ignore permission errors etc.
  }
  return count;
}

function analyzeExistingSkill(skillPath) {
  if (!existsSync(skillPath)) {
    throw new Error(`Skill path not found: ${skillPath}`);
  }

  const fileCount = countFilesRecursive(skillPath);

  let hasMcp = false;
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (existsSync(skillMdPath)) {
    const content = readFileSync(skillMdPath, 'utf-8');
    const contentLower = content.toLowerCase();
    const mcpUsagePatterns = ['mcp__', 'mcp_server', 'compatibility:'];
    hasMcp = mcpUsagePatterns.some((p) => contentLower.includes(p));
  }

  let workflowSteps = 0;
  if (existsSync(skillMdPath)) {
    const content = readFileSync(skillMdPath, 'utf-8');
    workflowSteps = content.split('\n').filter((line) => line.trim().startsWith('##')).length;
  }

  let conditionals = 0;
  const scriptsDir = path.join(skillPath, 'scripts');
  if (existsSync(scriptsDir)) {
    const scriptFiles = readdirSync(scriptsDir).filter(
      (f) => f.endsWith('.py') || f.endsWith('.mjs') || f.endsWith('.js')
    );
    for (const file of scriptFiles) {
      try {
        const content = readFileSync(path.join(scriptsDir, file), 'utf-8');
        const ifMatches = content.match(/\bif\s/g);
        const elifMatches = content.match(/\belif\s/g);
        const elseIfMatches = content.match(/\belse if\s/g);
        conditionals += (ifMatches ? ifMatches.length : 0) +
                        (elifMatches ? elifMatches.length : 0) +
                        (elseIfMatches ? elseIfMatches.length : 0);
      } catch {
        // skip unreadable files
      }
    }
  }

  let externalDeps = 0;
  const requirements = path.join(skillPath, 'requirements.txt');
  if (existsSync(requirements)) {
    const lines = readFileSync(requirements, 'utf-8').split('\n').filter((l) => l.trim());
    externalDeps = lines.length;
  }
  const packageJson = path.join(skillPath, 'package.json');
  if (existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
      externalDeps += Object.keys(pkg.dependencies || {}).length;
    } catch {
      // skip
    }
  }

  return {
    fileCount,
    hasMcpIntegration: hasMcp,
    workflowSteps,
    conditionals,
    externalDeps,
  };
}

async function interactiveMode() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log('=== Skill Complexity Scorer - Interactive Mode ===\n');

  const fileCount = parseInt(await rl.question('Expected total file count (scripts + references + assets): '), 10);
  const mcpAnswer = await rl.question('MCP integration planned? (yes/no): ');
  const mcpIntegration = mcpAnswer.toLowerCase() === 'yes';
  const workflowSteps = parseInt(await rl.question('Number of workflow steps: '), 10);
  const conditionals = parseInt(await rl.question('Number of conditional branches: '), 10);
  const externalDeps = parseInt(await rl.question('Number of external dependencies: '), 10);

  rl.close();

  return calculateComplexity({
    fileCount,
    hasMcpIntegration: mcpIntegration,
    workflowSteps,
    conditionals,
    externalDeps,
  });
}

const { values } = parseArgs({
  options: {
    interactive: { type: 'boolean', default: false },
    analyze: { type: 'string' },
  },
  strict: true,
});

let result;

if (values.interactive) {
  result = await interactiveMode();
} else if (values.analyze) {
  const spec = analyzeExistingSkill(values.analyze);
  result = calculateComplexity(spec);
  result.analyzed_spec = {
    file_count: spec.fileCount,
    has_mcp_integration: spec.hasMcpIntegration,
    workflow_steps: spec.workflowSteps,
    conditionals: spec.conditionals,
    external_deps: spec.externalDeps,
  };
} else {
  console.error('Usage: node complexity_scorer.mjs --interactive | --analyze <skill-path>');
  process.exit(1);
}

console.log('\n' + JSON.stringify(result, null, 2));

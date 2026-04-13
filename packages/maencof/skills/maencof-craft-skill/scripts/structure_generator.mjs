#!/usr/bin/env node
/**
 * Structure Generator - Creates skill directory structure based on complexity
 *
 * Usage:
 *     node structure_generator.mjs --name <skill-name> --complexity <simple|medium|complex> --path <output-path>
 *
 * Example:
 *     node structure_generator.mjs --name api-client --complexity medium --path ./skills
 */

import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SKILL_MD_TEMPLATES = {
  simple: `---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
---

# {title}

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Workflow
[Simple 2-3 step process]

## Resources
### scripts/
[Brief description of available scripts]

## Quick Reference
[Common operations cheat sheet]
`,

  medium: `---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
---

# {title}

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Core Workflow
[High-level 4-6 step process with references to reference.md]

## Resources
### reference.md
Detailed workflows, algorithms, and implementation guidance.

### examples.md
Real-world usage examples and patterns.

### scripts/
[Brief description of available automation tools]

## Quick Reference
[Common operations cheat sheet]
`,

  complex: `---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
---

# {title}

## Quick Start
[2-3 sentence overview - keep brief, details in reference.md]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Core Workflow
[High-level overview - details in reference.md]

## Resources
### reference.md
Comprehensive workflows, algorithms, and mode-specific processes.

### examples.md
5-10 real-world examples covering all complexity levels.

### knowledge/
Deep-dive topics: skill anatomy, MCP integration, resource design, quality standards.

### scripts/
[Brief index of automation tools - details in reference.md]

### docs/
Migration guides, troubleshooting, advanced patterns.

## Quick Reference
[Essential operations only - full reference in reference.md]
`,
};

function generateStructure(name, complexity, outputPath) {
  const skillPath = path.join(outputPath, name);

  if (existsSync(skillPath)) {
    throw new Error(`Skill directory already exists: ${skillPath}`);
  }

  mkdirSync(skillPath, { recursive: true });

  const filesCreated = [];

  // Create SKILL.md
  const title = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const skillMdContent = SKILL_MD_TEMPLATES[complexity]
    .replace(/{name}/g, name)
    .replace(/{title}/g, title);
  writeFileSync(path.join(skillPath, 'SKILL.md'), skillMdContent);
  filesCreated.push('SKILL.md');

  // Create scripts/
  const scriptsDir = path.join(skillPath, 'scripts');
  mkdirSync(scriptsDir);
  writeFileSync(
    path.join(scriptsDir, 'example.mjs'),
    `#!/usr/bin/env node\n// Example script for ${name}\n`
  );
  filesCreated.push('scripts/example.mjs');

  // Medium complexity additions
  if (complexity === 'medium' || complexity === 'complex') {
    writeFileSync(
      path.join(skillPath, 'reference.md'),
      `# Detailed Reference for ${title}\n\n[TODO: Add detailed workflows]\n`
    );
    filesCreated.push('reference.md');

    writeFileSync(
      path.join(skillPath, 'examples.md'),
      `# ${title} Examples\n\n[TODO: Add 5-10 examples]\n`
    );
    filesCreated.push('examples.md');
  }

  // Complex additions
  if (complexity === 'complex') {
    const knowledgeDir = path.join(skillPath, 'knowledge');
    mkdirSync(knowledgeDir);
    for (const topic of [
      'skill-anatomy.md',
      'progressive-disclosure.md',
      'mcp-integration.md',
      'bundled-resources.md',
      'quality-standards.md',
    ]) {
      const topicTitle = topic
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      writeFileSync(
        path.join(knowledgeDir, topic),
        `# ${topicTitle}\n\n[TODO: Add content]\n`
      );
      filesCreated.push(`knowledge/${topic}`);
    }

    const docsDir = path.join(skillPath, 'docs');
    mkdirSync(docsDir);
    for (const doc of [
      'migration-guide.md',
      'mode-comparison.md',
      'complexity-tuning.md',
      'troubleshooting.md',
      'advanced-patterns.md',
    ]) {
      const docTitle = doc
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      writeFileSync(
        path.join(docsDir, doc),
        `# ${docTitle}\n\n[TODO: Add content]\n`
      );
      filesCreated.push(`docs/${doc}`);
    }
  }

  const nextSteps = [
    'Edit SKILL.md to complete TODO items',
    'Update description in YAML frontmatter',
    'Implement scripts in scripts/ directory',
  ];

  if (complexity === 'medium' || complexity === 'complex') {
    nextSteps.push(
      'Fill in reference.md with detailed workflows',
      'Add 5-10 examples to examples.md'
    );
  }

  if (complexity === 'complex') {
    nextSteps.push(
      'Complete knowledge/ deep-dive topics',
      'Write docs/ guides (migration, troubleshooting, etc.)'
    );
  }

  return {
    skill_path: skillPath,
    files_created: filesCreated,
    next_steps: nextSteps,
  };
}

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    complexity: { type: 'string' },
    path: { type: 'string' },
  },
  strict: true,
});

if (!values.name || !values.complexity || !values.path) {
  console.error('Usage: node structure_generator.mjs --name <name> --complexity <simple|medium|complex> --path <output-path>');
  process.exit(1);
}

if (!['simple', 'medium', 'complex'].includes(values.complexity)) {
  console.error(`Invalid complexity: ${values.complexity}. Must be simple, medium, or complex.`);
  process.exit(1);
}

const result = generateStructure(values.name, values.complexity, path.resolve(values.path));
console.log(JSON.stringify(result, null, 2));

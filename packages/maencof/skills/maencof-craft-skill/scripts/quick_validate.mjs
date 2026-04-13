#!/usr/bin/env node
/**
 * Quick validation script for skills - minimal version
 *
 * Usage: node quick_validate.mjs <skill_directory>
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function validateSkill(skillPath) {
  const skillMd = path.join(skillPath, 'SKILL.md');

  if (!existsSync(skillMd)) {
    return { valid: false, message: 'SKILL.md not found' };
  }

  const content = readFileSync(skillMd, 'utf-8');

  if (!content.startsWith('---')) {
    return { valid: false, message: 'No YAML frontmatter found' };
  }

  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { valid: false, message: 'Invalid frontmatter format' };
  }

  const frontmatter = match[1];

  if (!frontmatter.includes('name:')) {
    return { valid: false, message: "Missing 'name' in frontmatter" };
  }
  if (!frontmatter.includes('description:')) {
    return { valid: false, message: "Missing 'description' in frontmatter" };
  }

  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (!/^[a-z0-9-]+$/.test(name)) {
      return { valid: false, message: `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)` };
    }
    if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
      return { valid: false, message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens` };
    }
  }

  const descMatch = frontmatter.match(/description:\s*(.+)/);
  if (descMatch) {
    const description = descMatch[1].trim();
    if (description.includes('<') || description.includes('>')) {
      return { valid: false, message: 'Description cannot contain angle brackets (< or >)' };
    }
  }

  return { valid: true, message: 'Skill is valid!' };
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: node quick_validate.mjs <skill_directory>');
  process.exit(1);
}

const { valid, message } = validateSkill(args[0]);
console.log(message);
process.exit(valid ? 0 : 1);

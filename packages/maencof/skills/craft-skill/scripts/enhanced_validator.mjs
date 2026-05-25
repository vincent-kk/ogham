#!/usr/bin/env node
/**
 * Enhanced Validator - Comprehensive skill validation
 *
 * Usage:
 *     node enhanced_validator.mjs <skill-directory> [--strict]
 *
 * Validates:
 * - YAML frontmatter format and required fields
 * - Naming conventions
 * - Description quality
 * - File organization
 * - Resource references
 * - SKILL.md size limits
 * - Script executability and syntax
 * - Shebang lines
 * - docs/ directory references
 */

import { parseArgs } from 'node:util';
import { readFileSync, existsSync, readdirSync, accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.qualityScore = 0;
  }

  addError(msg) {
    this.errors.push(`❌ ERROR: ${msg}`);
  }

  addWarning(msg) {
    this.warnings.push(`⚠️  WARNING: ${msg}`);
  }

  addPass(msg) {
    this.passed.push(`✅ PASS: ${msg}`);
  }

  isValid() {
    return this.errors.length === 0;
  }

  calculateQualityScore() {
    const total = this.passed.length + this.warnings.length + this.errors.length;
    if (total === 0) {
      this.qualityScore = 0;
      return;
    }
    const score = ((this.passed.length + this.warnings.length * 0.5) / total) * 100;
    this.qualityScore = Math.round(score * 10) / 10;
  }

  report() {
    this.calculateQualityScore();
    const lines = [];
    lines.push('='.repeat(60));
    lines.push('VALIDATION REPORT');
    lines.push('='.repeat(60));

    if (this.passed.length > 0) {
      lines.push('\n✅ PASSED CHECKS:');
      lines.push(...this.passed);
    }
    if (this.warnings.length > 0) {
      lines.push('\n⚠️  WARNINGS:');
      lines.push(...this.warnings);
    }
    if (this.errors.length > 0) {
      lines.push('\n❌ ERRORS:');
      lines.push(...this.errors);
    }

    lines.push('\n' + '='.repeat(60));
    lines.push(`QUALITY SCORE: ${this.qualityScore}/100`);
    lines.push('='.repeat(60));

    if (this.isValid()) {
      lines.push('✅ VALIDATION PASSED');
    } else {
      lines.push(`❌ VALIDATION FAILED (${this.errors.length} errors)`);
    }
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

function validateYamlFrontmatter(skillPath, result) {
  const skillMd = path.join(skillPath, 'SKILL.md');

  if (!existsSync(skillMd)) {
    result.addError('SKILL.md not found');
    return;
  }

  const content = readFileSync(skillMd, 'utf-8');

  if (!content.startsWith('---')) {
    result.addError('SKILL.md must start with YAML frontmatter (---)');
    return;
  }

  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    result.addError('Invalid YAML frontmatter format');
    return;
  }

  const frontmatter = match[1];
  result.addPass('YAML frontmatter format is valid');

  for (const field of ['name', 'description']) {
    if (!frontmatter.includes(`${field}:`)) {
      result.addError(`Missing required field '${field}' in frontmatter`);
    } else {
      result.addPass(`Required field '${field}' present`);
    }
  }

  for (const field of ['version', 'complexity']) {
    if (frontmatter.includes(`${field}:`)) {
      result.addWarning(`Deprecated field '${field}' found in frontmatter (use git tags instead)`);
    }
  }

  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (!/^[a-z0-9-]+$/.test(name)) {
      result.addError(`Name '${name}' must be hyphen-case (lowercase, hyphens only)`);
    } else if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
      result.addError(`Name '${name}' cannot start/end with hyphen or have consecutive hyphens`);
    } else {
      result.addPass(`Name '${name}' follows hyphen-case convention`);
    }
  }

  const descMatch = frontmatter.match(/description:\s*(.+)/);
  if (descMatch) {
    const description = descMatch[1].trim();
    if (description.includes('<') || description.includes('>')) {
      result.addError('Description cannot contain angle brackets (< or >)');
    }
    if (description.split(/\s+/).length < 10) {
      result.addWarning('Description is very short (<10 words) - consider adding more detail');
    } else {
      result.addPass('Description is adequately detailed');
    }
  }
}

function validateSkillMdSize(skillPath, result) {
  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) return;

  const content = readFileSync(skillMd, 'utf-8');
  const wordCount = content.split(/\s+/).length;

  if (wordCount > 5000) {
    result.addError(`SKILL.md is too large (${wordCount} words, max 5000)`);
  } else if (wordCount > 4500) {
    result.addWarning(`SKILL.md is approaching size limit (${wordCount}/5000 words)`);
  } else {
    result.addPass(`SKILL.md size is appropriate (${wordCount} words)`);
  }
}

function validateFileOrganization(skillPath, result) {
  const scriptsDir = path.join(skillPath, 'scripts');

  if (!existsSync(scriptsDir)) {
    result.addWarning('No scripts/ directory found - consider if automation scripts would be helpful');
  } else {
    result.addPass('scripts/ directory present');
  }

  if (existsSync(scriptsDir)) {
    const allScripts = readdirSync(scriptsDir).filter(
      (f) => f.endsWith('.py') || f.endsWith('.mjs') || f.endsWith('.js')
    );

    if (allScripts.length > 0) {
      result.addPass(`Found ${allScripts.length} script(s)`);
    }

    for (const scriptName of allScripts) {
      const scriptPath = path.join(scriptsDir, scriptName);

      // Check executable permission
      try {
        accessSync(scriptPath, constants.X_OK);
      } catch {
        result.addWarning(`Script ${scriptName} is not executable (chmod +x needed)`);
      }

      // Check shebang line
      try {
        const firstLine = readFileSync(scriptPath, 'utf-8').split('\n')[0];
        if (!firstLine.startsWith('#!')) {
          const shebangHint = scriptName.endsWith('.py')
            ? '#!/usr/bin/env python3'
            : '#!/usr/bin/env node';
          result.addWarning(`Script ${scriptName} missing shebang line (${shebangHint})`);
        } else {
          result.addPass(`Script ${scriptName} has shebang line`);
        }
      } catch {
        result.addWarning(`Could not read ${scriptName} for shebang check`);
      }

      // Check syntax validity
      try {
        if (scriptName.endsWith('.mjs') || scriptName.endsWith('.js')) {
          execFileSync('node', ['--check', scriptPath], { encoding: 'utf-8', stdio: 'pipe' });
          result.addPass(`Script ${scriptName} has valid JavaScript syntax`);
        } else if (scriptName.endsWith('.py')) {
          execFileSync('python3', ['-m', 'py_compile', scriptPath], { encoding: 'utf-8', stdio: 'pipe' });
          result.addPass(`Script ${scriptName} has valid Python syntax`);
        }
      } catch (e) {
        const lang = scriptName.endsWith('.py') ? 'Python' : 'JavaScript';
        result.addError(`Script ${scriptName} has syntax error: ${e.message}`);
      }
    }
  }
}

function validateResourceReferences(skillPath, result) {
  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) return;

  const content = readFileSync(skillMd, 'utf-8').toLowerCase();

  const checks = [
    { pattern: 'reference.md', filePath: path.join(skillPath, 'reference.md'), label: 'reference.md' },
    { pattern: 'examples.md', filePath: path.join(skillPath, 'examples.md'), label: 'examples.md' },
    { pattern: 'knowledge/', filePath: path.join(skillPath, 'knowledge'), label: 'knowledge/' },
    { pattern: 'docs/', filePath: path.join(skillPath, 'docs'), label: 'docs/' },
  ];

  for (const { pattern, filePath, label } of checks) {
    if (content.includes(pattern)) {
      if (!existsSync(filePath)) {
        result.addError(`SKILL.md references ${label} but file doesn't exist`);
      } else {
        result.addPass(`${label} exists as referenced`);
      }
    }
  }
}

function validateSkill(skillPath, strict = false) {
  const result = new ValidationResult();

  if (!existsSync(skillPath)) {
    result.addError(`Skill directory not found: ${skillPath}`);
    return result;
  }

  validateYamlFrontmatter(skillPath, result);
  validateSkillMdSize(skillPath, result);
  validateFileOrganization(skillPath, result);
  validateResourceReferences(skillPath, result);

  if (strict && result.warnings.length > 0) {
    for (const warning of result.warnings) {
      result.addError(warning.replace('⚠️  WARNING:', '').trim());
    }
    result.warnings = [];
  }

  return result;
}

const { values, positionals } = parseArgs({
  options: {
    strict: { type: 'boolean', default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length === 0) {
  console.error('Usage: node enhanced_validator.mjs <skill-directory> [--strict]');
  process.exit(1);
}

const skillPath = path.resolve(positionals[0]);
const result = validateSkill(skillPath, values.strict);

console.log(result.report());
process.exit(result.isValid() ? 0 : 1);

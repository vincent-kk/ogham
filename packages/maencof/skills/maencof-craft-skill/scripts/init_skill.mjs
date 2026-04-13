#!/usr/bin/env node
/**
 * Enhanced Skill Initializer - Creates new skills with mode support
 *
 * Usage:
 *     node init_skill.mjs <skill-name> [--mode <create|refactor|improve|fix>] [--complexity <simple|medium|complex>]
 *
 * Features:
 * - 4 mode support (CREATE/REFACTOR/IMPROVE/FIX)
 * - Complexity-based template selection
 * - Automated analysis and actionable fixes for REFACTOR/IMPROVE/FIX modes
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import {
  existsSync, readFileSync, readdirSync, accessSync, chmodSync, writeFileSync, statSync, constants,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectModeAuto(skillName, basePath) {
  const skillPath = path.join(basePath, skillName);
  if (existsSync(skillPath) && existsSync(path.join(skillPath, 'SKILL.md'))) {
    return 'improve';
  }
  return 'create';
}

async function getComplexityRecommendation(skillName, interactive = true) {
  if (interactive) {
    console.log(`\n=== Complexity Assessment for '${skillName}' ===`);
    console.log('1. simple   - Basic skill with minimal workflow (1-2 scripts)');
    console.log('2. medium   - Standard skill with multiple steps (3-5 scripts)');
    console.log('3. complex  - Advanced skill with deep documentation (5-7+ scripts)');

    const rl = createInterface({ input: stdin, output: stdout });
    const choice = (await rl.question('\nSelect complexity (1-3) or press Enter for auto-detect: ')).trim();
    rl.close();

    if (choice === '1') return 'simple';
    if (choice === '2') return 'medium';
    if (choice === '3') return 'complex';
  }
  return 'medium';
}

function createSkill(skillName, complexity, outputPath) {
  const generator = path.join(__dirname, 'structure_generator.mjs');

  if (!existsSync(generator)) {
    console.error(`❌ Error: structure_generator.mjs not found at ${generator}`);
    return false;
  }

  try {
    const output = execFileSync('node', [
      generator,
      '--name', skillName,
      '--complexity', complexity,
      '--path', outputPath,
    ], { encoding: 'utf-8' });

    const result = JSON.parse(output);

    console.log(`\n✅ Skill '${skillName}' created successfully!`);
    console.log(`📁 Location: ${result.skill_path}`);
    console.log('\n📄 Files created:');
    for (const file of result.files_created) {
      console.log(`  - ${file}`);
    }
    console.log('\n📝 Next steps:');
    result.next_steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });

    return true;
  } catch (e) {
    console.error(`❌ Error creating skill: ${e.stderr || e.message}`);
    return false;
  }
}

function analyzeSkillMd(skillPath) {
  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) {
    return { exists: false };
  }

  const content = readFileSync(skillMd, 'utf-8');
  const wordCount = content.split(/\s+/).length;
  const lines = content.split('\n');
  const lineCount = lines.length;
  const headers = lines.filter((line) => line.trim().startsWith('#'));

  return {
    exists: true,
    word_count: wordCount,
    line_count: lineCount,
    header_count: headers.length,
    over_limit: wordCount > 5000,
  };
}

function getComplexityAnalysis(skillPath) {
  const analyzer = path.join(__dirname, 'complexity_scorer.mjs');
  if (!existsSync(analyzer)) return null;

  try {
    const output = execFileSync('node', [analyzer, '--analyze', skillPath], {
      encoding: 'utf-8',
    });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function runValidation(skillPath) {
  const validator = path.join(__dirname, 'enhanced_validator.mjs');
  if (!existsSync(validator)) return null;

  try {
    const output = execFileSync('node', [validator, skillPath], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output;
  } catch (e) {
    // Validator may exit with non-zero for failures but still produce output
    return e.stdout || null;
  }
}

function refactorSkill(skillPath) {
  console.log(`\n🔄 REFACTOR mode for: ${skillPath}`);

  const mdInfo = analyzeSkillMd(skillPath);
  if (!mdInfo.exists) {
    console.log('❌ SKILL.md not found');
    return false;
  }

  console.log(`\n📊 Current SKILL.md: ${mdInfo.word_count} words, ${mdInfo.line_count} lines, ${mdInfo.header_count} sections`);

  if (mdInfo.over_limit) {
    console.log('⚠️  SKILL.md exceeds 5k word limit — extraction to reference.md recommended');
  }

  const complexity = getComplexityAnalysis(skillPath);
  if (complexity) {
    console.log(`📈 Complexity: ${complexity.category} (score: ${complexity.score})`);
    const rec = complexity.structure_recommendation || {};
    console.log(`   Recommended structure: ${rec.description || 'N/A'}`);
  }

  const missing = [];
  if (complexity && ['medium', 'complex'].includes(complexity.category)) {
    if (!existsSync(path.join(skillPath, 'reference.md'))) missing.push('reference.md');
    if (!existsSync(path.join(skillPath, 'examples.md'))) missing.push('examples.md');
  }
  if (complexity && complexity.category === 'complex') {
    if (!existsSync(path.join(skillPath, 'knowledge'))) missing.push('knowledge/');
    if (!existsSync(path.join(skillPath, 'docs'))) missing.push('docs/');
  }

  if (missing.length > 0) {
    console.log(`\n📁 Missing for '${complexity.category}' complexity:`);
    for (const m of missing) {
      console.log(`  - ${m}`);
    }
  }

  console.log('\n🔍 Running validation...');
  const validationOutput = runValidation(skillPath);
  if (validationOutput) console.log(validationOutput);

  return true;
}

function improveSkill(skillPath) {
  console.log(`\n📈 IMPROVE mode for: ${skillPath}`);

  const complexity = getComplexityAnalysis(skillPath);
  if (complexity) {
    console.log(`\n📊 Current complexity: ${complexity.category} (score: ${complexity.score})`);
    const rec = complexity.structure_recommendation || {};
    console.log(`   Target SKILL.md size: ${rec.skill_md_target || 'N/A'}`);
    console.log(`   Recommended scripts: ${rec.scripts_count || 'N/A'}`);
  }

  const hasReference = existsSync(path.join(skillPath, 'reference.md'));
  const hasExamples = existsSync(path.join(skillPath, 'examples.md'));
  const hasKnowledge = existsSync(path.join(skillPath, 'knowledge'));
  const hasDocs = existsSync(path.join(skillPath, 'docs'));
  const scriptsDir = path.join(skillPath, 'scripts');
  let scriptCount = 0;
  if (existsSync(scriptsDir)) {
    scriptCount = readdirSync(scriptsDir).filter(
      (f) => f.endsWith('.py') || f.endsWith('.mjs') || f.endsWith('.js')
    ).length;
  }

  console.log('\n📁 Current structure:');
  console.log(`  reference.md:  ${hasReference ? '✅' : '❌'}`);
  console.log(`  examples.md:   ${hasExamples ? '✅' : '❌'}`);
  console.log(`  knowledge/:    ${hasKnowledge ? '✅' : '❌'}`);
  console.log(`  docs/:         ${hasDocs ? '✅' : '❌'}`);
  console.log(`  scripts:       ${scriptCount} file(s)`);

  console.log('\n🔍 Running validation...');
  const validationOutput = runValidation(skillPath);
  if (validationOutput) console.log(validationOutput);

  return true;
}

function fixSkill(skillPath) {
  console.log(`\n🔧 FIX mode for: ${skillPath}`);

  console.log('\n🔍 Running validation to identify issues...');
  const validationOutput = runValidation(skillPath);
  if (validationOutput) console.log(validationOutput);

  const scriptsDir = path.join(skillPath, 'scripts');
  let fixedCount = 0;

  if (existsSync(scriptsDir)) {
    const scripts = readdirSync(scriptsDir).filter(
      (f) => f.endsWith('.py') || f.endsWith('.mjs') || f.endsWith('.js')
    );

    // Auto-fix: script permissions
    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script);
      try {
        accessSync(scriptPath, constants.X_OK);
      } catch {
        const stat = statSync(scriptPath);
        chmodSync(scriptPath, stat.mode | 0o111);
        console.log(`  🔧 Fixed permissions: ${script}`);
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ Auto-fixed ${fixedCount} permission issue(s)`);
    }

    // Auto-fix: missing shebang
    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script);
      let content = readFileSync(scriptPath, 'utf-8');
      if (!content.startsWith('#!')) {
        const shebang = script.endsWith('.py') ? '#!/usr/bin/env python3' : '#!/usr/bin/env node';
        content = shebang + '\n' + content;
        writeFileSync(scriptPath, content);
        console.log(`  🔧 Added shebang to: ${script}`);
      }
    }
  }

  console.log('\n🔍 Re-validating after auto-fixes...');
  const revalidation = runValidation(skillPath);
  if (revalidation) console.log(revalidation);

  return true;
}

// --- Main ---

const { values, positionals } = parseArgs({
  options: {
    mode: { type: 'string' },
    complexity: { type: 'string' },
    path: { type: 'string', default: '.' },
    'non-interactive': { type: 'boolean', default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length === 0) {
  console.error('Usage: node init_skill.mjs <skill-name> [--mode create|refactor|improve|fix] [--complexity simple|medium|complex] [--path <dir>]');
  process.exit(1);
}

const skillName = positionals[0];
const basePath = path.resolve(values.path);
const skillPath = path.join(basePath, skillName);

const mode = values.mode || detectModeAuto(skillName, basePath);

console.log(`🎯 Mode: ${mode.toUpperCase()}`);

let success = false;

if (mode === 'create') {
  let complexity = values.complexity;
  if (!complexity) {
    complexity = await getComplexityRecommendation(skillName, !values['non-interactive']);
  }
  success = createSkill(skillName, complexity, basePath);
} else if (mode === 'refactor') {
  if (!existsSync(skillPath)) {
    console.error(`❌ Error: Skill not found at ${skillPath}`);
    process.exit(1);
  }
  success = refactorSkill(skillPath);
} else if (mode === 'improve') {
  if (!existsSync(skillPath)) {
    console.error(`❌ Error: Skill not found at ${skillPath}`);
    process.exit(1);
  }
  success = improveSkill(skillPath);
} else if (mode === 'fix') {
  if (!existsSync(skillPath)) {
    console.error(`❌ Error: Skill not found at ${skillPath}`);
    process.exit(1);
  }
  success = fixSkill(skillPath);
} else {
  console.error(`❌ Unknown mode: ${mode}`);
  process.exit(1);
}

process.exit(success ? 0 : 1);

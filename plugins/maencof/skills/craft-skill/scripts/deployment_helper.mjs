#!/usr/bin/env node
/**
 * Intelligent Deployment Helper - Assists with skill deployment decisions
 *
 * Usage:
 *     node deployment_helper.mjs <skill-path> [--scope project|global] [--symlink]
 *     node deployment_helper.mjs --analyze <package.zip>
 *
 * Features:
 * - Intelligent deployment location detection
 * - Project-specific vs global skill recommendations
 * - Symlink creation support
 * - Dependency checking
 */

import { parseArgs } from 'node:util';
import {
  existsSync, mkdirSync, rmSync, cpSync, symlinkSync,
  lstatSync, readdirSync, readFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

function getClaudeSkillsDir() {
  return path.join(homedir(), '.claude', 'skills');
}

function getProjectSkillsDir() {
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const claudeDir = path.join(current, '.claude');
    if (existsSync(claudeDir)) {
      return path.join(claudeDir, 'skills');
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function analyzeDeploymentLocation(skillName, isGeneric = null) {
  const globalDir = getClaudeSkillsDir();
  const projectDir = getProjectSkillsDir();

  const recommendations = {
    skill_name: skillName,
    global_location: path.join(globalDir, skillName),
    project_location: projectDir ? path.join(projectDir, skillName) : null,
    in_project: projectDir !== null,
    recommendation: null,
    reasons: [],
  };

  if (isGeneric === true) {
    recommendations.recommendation = 'global';
    recommendations.reasons.push('Skill is marked as generic/reusable');
  } else if (isGeneric === false) {
    recommendations.recommendation = 'project';
    recommendations.reasons.push('Skill is marked as project-specific');
  } else if (projectDir) {
    recommendations.recommendation = 'project';
    recommendations.reasons.push('Currently in a project directory');
  } else {
    recommendations.recommendation = 'global';
    recommendations.reasons.push('Not in a project directory');
  }

  if (existsSync(path.join(globalDir, skillName))) {
    recommendations.existing_global = true;
    recommendations.reasons.push('⚠️  Skill already exists in global location');
  }

  if (projectDir && existsSync(path.join(projectDir, skillName))) {
    recommendations.existing_project = true;
    recommendations.reasons.push('⚠️  Skill already exists in project location');
  }

  return recommendations;
}

function checkDependencies() {
  const nodeVersion = process.version.replace('v', '');
  const [major] = nodeVersion.split('.').map(Number);

  return {
    node_version: nodeVersion,
    node_ok: major >= 18,
  };
}

function extractPackage(zipPath, outputDir) {
  console.log(`📦 Extracting package: ${zipPath}`);
  execSync(`unzip -o "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });

  const skillDirs = readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(outputDir, d.name));

  if (skillDirs.length !== 1) {
    throw new Error(`Expected 1 skill directory, found ${skillDirs.length}`);
  }

  return skillDirs[0];
}

async function deploySkill(skillPath, targetDir, useSymlink = false) {
  const skillName = path.basename(skillPath);
  const targetPath = path.join(targetDir, skillName);

  if (existsSync(targetPath)) {
    const rl = createInterface({ input: stdin, output: stdout });
    const response = await rl.question(`⚠️  ${targetPath} already exists. Overwrite? (yes/no): `);
    rl.close();

    if (response.toLowerCase() !== 'yes') {
      console.log('❌ Deployment cancelled');
      return false;
    }

    if (lstatSync(targetPath).isSymbolicLink()) {
      rmSync(targetPath);
    } else {
      rmSync(targetPath, { recursive: true, force: true });
    }
  }

  mkdirSync(targetDir, { recursive: true });

  if (useSymlink) {
    console.log(`🔗 Creating symlink: ${targetPath} -> ${skillPath}`);
    symlinkSync(path.resolve(skillPath), targetPath);
  } else {
    console.log(`📁 Copying skill: ${skillPath} -> ${targetPath}`);
    cpSync(skillPath, targetPath, { recursive: true });
  }

  console.log(`✅ Deployed to: ${targetPath}`);
  return true;
}

function analyzePackage(zipPath) {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'skill-'));

  try {
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    // Find metadata
    let metadata = { error: 'No metadata found' };
    const metadataPath = findFile(tmpDir, '.skill-metadata.json');
    if (metadataPath) {
      metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    }

    // Find skill directory
    const entries = readdirSync(tmpDir, { withFileTypes: true });
    const skillDirs = entries.filter((d) => d.isDirectory());
    const skillName = skillDirs.length > 0 ? skillDirs[0].name : 'unknown';

    const deploymentRec = analyzeDeploymentLocation(skillName);
    const depChecks = checkDependencies();

    return {
      metadata,
      deployment: deploymentRec,
      dependencies: depChecks,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function findFile(dir, filename) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return fullPath;
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename);
      if (found) return found;
    }
  }
  return null;
}

const { values, positionals } = parseArgs({
  options: {
    scope: { type: 'string' },
    symlink: { type: 'boolean', default: false },
    analyze: { type: 'string' },
  },
  allowPositionals: true,
  strict: true,
});

// Analyze mode
if (values.analyze) {
  const zipPath = path.resolve(values.analyze);
  if (!existsSync(zipPath)) {
    console.error(`❌ Package not found: ${zipPath}`);
    process.exit(1);
  }

  console.log('🔍 Analyzing package...');
  const analysis = analyzePackage(zipPath);

  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT ANALYSIS');
  console.log('='.repeat(60));
  console.log(JSON.stringify(analysis, null, 2));
  process.exit(0);
}

// Deploy mode
if (positionals.length === 0) {
  console.error('Usage: node deployment_helper.mjs <skill-path> [--scope project|global] [--symlink]');
  console.error('       node deployment_helper.mjs --analyze <package.zip>');
  process.exit(1);
}

let skillPath = path.resolve(positionals[0]);

// Handle zip files
if (skillPath.endsWith('.zip')) {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'skill-'));
  skillPath = extractPackage(skillPath, tmpDir);
}

if (!existsSync(skillPath)) {
  console.error(`❌ Skill path not found: ${skillPath}`);
  process.exit(1);
}

const skillName = path.basename(skillPath);
const recommendations = analyzeDeploymentLocation(skillName);

console.log('\n' + '='.repeat(60));
console.log(`DEPLOYMENT PLANNING: ${skillName}`);
console.log('='.repeat(60));

console.log(`\n📍 Recommended scope: ${recommendations.recommendation}`);
for (const reason of recommendations.reasons) {
  console.log(`  • ${reason}`);
}

const scope = values.scope || recommendations.recommendation;

let targetDir;
if (scope === 'global') {
  targetDir = getClaudeSkillsDir();
} else {
  targetDir = getProjectSkillsDir();
  if (!targetDir) {
    console.error('❌ Not in a project directory. Use --scope global');
    process.exit(1);
  }
}

console.log(`\n📁 Target: ${targetDir}`);

const depChecks = checkDependencies();
console.log(`\n🟢 Node.js ${depChecks.node_version}: ${depChecks.node_ok ? '✅' : '❌'}`);

console.log('\n🚀 Deploying...');
const success = await deploySkill(skillPath, targetDir, values.symlink);

if (success) {
  console.log('\n✅ Deployment complete!');
  console.log(`\n📝 Test the skill by asking Claude:`);
  console.log(`   "Use the ${skillName} skill to [your task]"`);
}

process.exit(success ? 0 : 1);

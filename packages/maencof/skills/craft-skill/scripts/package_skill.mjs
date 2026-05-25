#!/usr/bin/env node
/**
 * Enhanced Skill Packager - Creates distributable skill packages
 *
 * Usage:
 *     node package_skill.mjs <skill-path> [output-dir]
 *
 * Features:
 * - Integrated enhanced_validator.mjs validation
 * - Version metadata inclusion
 * - CHANGELOG.md auto-update support
 * - Detailed packaging logs
 */

import { parseArgs } from 'node:util';
import { execFileSync, execSync } from 'node:child_process';
import {
  existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, mkdtempSync, cpSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function calculateChecksum(filePath) {
  const hash = createHash('sha256');
  const content = readFileSync(filePath);
  hash.update(content);
  return hash.digest('hex');
}

function extractMetadata(skillPath) {
  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) {
    throw new Error('SKILL.md not found');
  }

  const content = readFileSync(skillMd, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('Invalid YAML frontmatter');
  }

  const frontmatter = match[1];
  const metadata = {};

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      metadata[key] = value;
    }
  }

  return metadata;
}

function validateSkill(skillPath) {
  const validator = path.join(__dirname, 'enhanced_validator.mjs');

  if (!existsSync(validator)) {
    console.log('⚠️  Warning: enhanced_validator.mjs not found, skipping validation');
    return true;
  }

  console.log('🔍 Running validation...');
  try {
    const output = execFileSync('node', [validator, skillPath], { encoding: 'utf-8' });
    console.log(output);
    return true;
  } catch (e) {
    if (e.stdout) console.log(e.stdout);
    return false;
  }
}

function getSkillStructureInfo(skillPath) {
  const scriptsDir = path.join(skillPath, 'scripts');
  let scriptsCount = 0;
  if (existsSync(scriptsDir)) {
    scriptsCount = readdirSync(scriptsDir).filter(
      (f) => f.endsWith('.py') || f.endsWith('.mjs') || f.endsWith('.js')
    ).length;
  }

  return {
    has_reference_md: existsSync(path.join(skillPath, 'reference.md')),
    has_examples_md: existsSync(path.join(skillPath, 'examples.md')),
    has_knowledge: existsSync(path.join(skillPath, 'knowledge')),
    has_docs: existsSync(path.join(skillPath, 'docs')),
    scripts_count: scriptsCount,
  };
}

function createInstallInstructions(metadata, structure, skillName) {
  const versionSuffix = metadata.version ? ` v${metadata.version}` : '';

  let content = `# Installation Instructions for ${skillName}${versionSuffix}

## Quick Install

1. Extract the zip file:
   \`\`\`bash
   unzip ${skillName}.zip
   \`\`\`

2. Move to Claude Code skills directory:
   \`\`\`bash
   mv ${skillName} ~/.claude/skills/
   \`\`\`

3. Verify installation:
   \`\`\`bash
   node ~/.claude/skills/${skillName}/scripts/enhanced_validator.mjs ~/.claude/skills/${skillName}
   \`\`\`

## Structure

This skill includes:
`;

  if (structure.has_reference_md) content += '- ✅ reference.md - Detailed documentation\n';
  if (structure.has_examples_md) content += '- ✅ examples.md - Usage examples\n';
  if (structure.has_knowledge) content += '- ✅ knowledge/ - Deep-dive topics\n';
  if (structure.has_docs) content += '- ✅ docs/ - Additional guides\n';
  content += `- ✅ ${structure.scripts_count} automation script(s)\n`;

  content += `
## Verification

After installation, ask Claude:
> "Use the ${skillName} skill to [example task]"

Claude should recognize and use the skill automatically.

## Troubleshooting

If Claude doesn't recognize the skill:
1. Check file permissions: \`ls -la ~/.claude/skills/${skillName}\`
2. Verify SKILL.md exists and has valid YAML frontmatter
3. Restart Claude Code application

## Uninstallation

To remove this skill:
\`\`\`bash
rm -rf ~/.claude/skills/${skillName}
\`\`\`
`;

  return content;
}

function collectFiles(dir, base) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isFile()) {
      results.push({ fullPath, relPath });
    } else if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, base));
    }
  }
  return results;
}

function packageSkill(skillPath, outputDir) {
  const skillName = path.basename(skillPath);

  console.log(`📦 Packaging skill: ${skillName}`);

  if (!validateSkill(skillPath)) {
    console.log('❌ Validation failed. Fix issues before packaging.');
    return false;
  }

  let metadata;
  try {
    metadata = extractMetadata(skillPath);
    if (metadata.version) {
      console.log(`📋 Version: ${metadata.version}`);
    }
  } catch (e) {
    console.error(`❌ Error extracting metadata: ${e.message}`);
    return false;
  }

  const structure = getSkillStructureInfo(skillPath);

  mkdirSync(outputDir, { recursive: true });

  const packageMetadata = {
    name: skillName,
    packaged: new Date().toISOString(),
    requires: {
      claude_code_version: '>=1.0.0',
      node_version: '>=18.0',
    },
    structure,
  };

  for (const field of ['version', 'complexity', 'created']) {
    if (metadata[field]) {
      packageMetadata[field] = metadata[field];
    }
  }

  // Stage files in a temp directory for zip creation
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'skill-pkg-'));
  const stageDir = path.join(tmpDir, skillName);

  try {
    // Copy skill files to staging
    cpSync(skillPath, stageDir, { recursive: true });

    // Add metadata
    writeFileSync(
      path.join(stageDir, '.skill-metadata.json'),
      JSON.stringify(packageMetadata, null, 2)
    );
    console.log('  + .skill-metadata.json');

    // Add INSTALL.md at top level of staging
    const installContent = createInstallInstructions(metadata, structure, skillName);
    writeFileSync(path.join(tmpDir, 'INSTALL.md'), installContent);
    console.log('  + INSTALL.md');

    // Log files being packaged
    const files = collectFiles(stageDir, stageDir);
    for (const f of files) {
      console.log(`  + ${f.relPath}`);
    }

    // Create zip
    const zipPath = path.join(outputDir, `${skillName}.zip`);
    console.log(`\n🗜️  Creating package: ${zipPath}`);

    execSync(`cd "${tmpDir}" && zip -r "${zipPath}" "${skillName}" INSTALL.md`, {
      stdio: 'pipe',
    });

    // Calculate checksum
    const checksum = calculateChecksum(zipPath);
    packageMetadata.checksum = `sha256:${checksum}`;

    // Save metadata separately
    const metadataPath = path.join(outputDir, `${skillName}.metadata.json`);
    writeFileSync(metadataPath, JSON.stringify(packageMetadata, null, 2));

    console.log('\n✅ Package created successfully!');
    console.log(`📦 Package: ${zipPath}`);
    console.log(`📋 Metadata: ${metadataPath}`);
    console.log(`🔐 Checksum: ${checksum.slice(0, 16)}...`);

    return true;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- Main ---

const { positionals } = parseArgs({
  allowPositionals: true,
  strict: true,
});

if (positionals.length === 0) {
  console.error('Usage: node package_skill.mjs <skill-path> [output-dir]');
  process.exit(1);
}

const skillPath = path.resolve(positionals[0]);
const outputDir = path.resolve(positionals[1] || './dist');

if (!existsSync(skillPath)) {
  console.error(`❌ Error: Skill path not found: ${skillPath}`);
  process.exit(1);
}

const success = packageSkill(skillPath, outputDir);
process.exit(success ? 0 : 1);

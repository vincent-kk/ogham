#!/usr/bin/env node
// migrate — Batch migration of CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md
//
// Usage: node migrate.mjs <target-path> [--dry-run|--execute] [--auto-commit]
//
// Phases:
//   1. Scan & Conflict Detection
//   2. Rename (--execute only)
//   3. Reference Update (--execute only)
//   4. Report
//
// Pure Node.js (ESM), no external dependencies. Replaces the POSIX
// sh + find + sed pipeline so behaviour is identical on macOS, Linux,
// and Windows. Only `git` is spawned, via an argv array (no shell).
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

const SCAN_NAMES = new Set(['CLAUDE.md', 'SPEC.md']);
const EXCLUDE_SCAN = new Set([
  'node_modules',
  'dist',
  '.git',
  '.claude',
  '.claude-plugin',
]);
const EXCLUDE_REF = new Set(['node_modules', 'dist', '.git']);
const REF_EXTS = new Set(['.md', '.ts', '.tsx', '.js', '.jsx']);

// Normalize native separators to '/' for stable, portable output.
const disp = (p) => p.split(sep).join('/');

function printHelp() {
  console.log(
    [
      'Usage: migrate.mjs <target-path> [--dry-run|--execute] [--auto-commit]',
      '',
      'Options:',
      '  --dry-run      Show migration plan without modifying files (default)',
      '  --execute      Perform the actual migration',
      '  --auto-commit  Auto-commit changes after successful migration',
      '',
      'Phases:',
      '  1. Scan & Conflict Detection',
      '  2. Rename (--execute only)',
      '  3. Reference Update (--execute only)',
      '  4. Report',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  let targetPath = '';
  let mode = 'dry-run';
  let autoCommit = false;

  for (const arg of argv)
    if (arg === '--dry-run') mode = 'dry-run';
    else if (arg === '--execute') mode = 'execute';
    else if (arg === '--auto-commit') autoCommit = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      process.stderr.write(`[filid:migrate] Unknown option: ${arg}\n`);
      process.exit(1);
    } else if (targetPath === '') targetPath = arg;
    else {
      process.stderr.write('[filid:migrate] Error: Multiple paths provided\n');
      process.exit(1);
    }

  if (targetPath === '') targetPath = '.';
  return { targetPath, mode, autoCommit };
}

// Recursively collect files under `root`, skipping excluded directory names
// and symlinks. Matches by exact name (exactNames) or extension (extensions).
function walk(root, { exactNames, extensions, excludeDirs }) {
  const results = [];
  const recurse = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries)
      if (entry.isDirectory()) {
        if (!excludeDirs.has(entry.name)) recurse(join(dir, entry.name));
      } else if (entry.isFile())
        if (exactNames) {
          if (exactNames.has(entry.name)) results.push(join(dir, entry.name));
        } else if (extensions && extensions.has(extname(entry.name)))
          results.push(join(dir, entry.name));
  };
  recurse(root);
  return results;
}

function detectGit(target) {
  const r = spawnSync(
    'git',
    ['-C', target, 'rev-parse', '--is-inside-work-tree'],
    { stdio: 'ignore', windowsHide: true },
  );
  return r.status === 0;
}

function runGit(args, { capture = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0) {
    const detail = (r.stderr || (r.error && r.error.message) || '')
      .toString()
      .trim();
    process.stderr.write(
      `[filid:migrate] git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}\n`,
    );
    process.exit(1);
  }
  return capture ? r.stdout : '';
}

function renameFile(src, dst, isGit) {
  if (!isGit) {
    renameSync(src, dst);
    return;
  }
  const r = spawnSync('git', ['mv', basename(src), basename(dst)], {
    cwd: dirname(src),
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.error || r.status !== 0) {
    const detail = (r.stderr || (r.error && r.error.message) || '')
      .toString()
      .trim();
    process.stderr.write(
      `[filid:migrate] git mv failed for ${disp(src)}${detail ? `: ${detail}` : ''}\n`,
    );
    process.exit(1);
  }
}

// Depth of fileDir relative to a renamed baseDir (0 = same directory).
function depthOf(baseDir, fileDir) {
  const rel = relative(baseDir, fileDir);
  return rel === '' ? 0 : rel.split(sep).length;
}

// For each renamed dir, rewrite depth-aware references to `oldName` under it.
//   depth 0     → bare "CLAUDE.md" and "./CLAUDE.md"
//   depth N > 0 → "../" × N + "CLAUDE.md"
// Files outside renamed directories are never touched.
function scopedUpdate(dirs, oldName, newName, mode) {
  let updated = 0;
  const listing = [];
  const files = [];

  for (const rdir of dirs) {
    if (!rdir || !existsSync(rdir) || !statSync(rdir).isDirectory()) continue;

    for (const file of walk(rdir, {
      extensions: REF_EXTS,
      excludeDirs: EXCLUDE_REF,
    })) {
      let content;
      try {
        content = readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      const depth = depthOf(rdir, dirname(file));
      if (depth === 0) {
        if (!content.includes(oldName)) continue;
        if (mode === 'execute') {
          const next = content
            .split(`./${oldName}`)
            .join(`./${newName}`)
            .split(oldName)
            .join(newName);
          writeFileSync(file, next);
          files.push(file);
        } else listing.push(`  ${disp(file)} (depth=0: bare + ./)`);
        updated++;
      } else {
        const prefix = '../'.repeat(depth);
        const pattern = `${prefix}${oldName}`;
        if (!content.includes(pattern)) continue;
        if (mode === 'execute') {
          writeFileSync(
            file,
            content.split(pattern).join(`${prefix}${newName}`),
          );
          files.push(file);
        } else listing.push(`  ${disp(file)} (depth=${depth}: ${pattern})`);
        updated++;
      }
    }
  }

  return { updated, listing, files };
}

function main() {
  const { targetPath, mode, autoCommit } = parseArgs(process.argv.slice(2));

  const target = resolve(targetPath);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(
      `[filid:migrate] Error: Directory not found: ${disp(target)}\n`,
    );
    process.exit(1);
  }

  const isGit = detectGit(target);

  // -------------------------------------------------------------------------
  // Phase 1 — Scan & Conflict Detection
  // -------------------------------------------------------------------------
  console.log('## Phase 1 — Scan & Conflict Detection');
  console.log('');

  const found = walk(target, {
    exactNames: SCAN_NAMES,
    excludeDirs: EXCLUDE_SCAN,
  });
  const claudeFiles = found.filter((f) => basename(f) === 'CLAUDE.md').sort();
  const specFiles = found.filter((f) => basename(f) === 'SPEC.md').sort();

  if (claudeFiles.length + specFiles.length === 0) {
    console.log('Nothing to migrate. No CLAUDE.md or SPEC.md files found.');
    process.exit(0);
  }

  console.log(
    `Found: ${claudeFiles.length} CLAUDE.md, ${specFiles.length} SPEC.md`,
  );
  console.log('');

  const renameClaude = [];
  const renameSpec = [];
  let conflictCount = 0;

  for (const file of claudeFiles) {
    const dir = dirname(file);
    if (existsSync(join(dir, 'INTENT.md'))) {
      console.log(
        `  CONFLICT: ${disp(dir)}/ — both CLAUDE.md and INTENT.md exist`,
      );
      conflictCount++;
    } else {
      console.log(`  RENAME: ${disp(file)} → ${disp(dir)}/INTENT.md`);
      renameClaude.push(file);
    }
  }

  for (const file of specFiles) {
    const dir = dirname(file);
    if (existsSync(join(dir, 'DETAIL.md'))) {
      console.log(
        `  CONFLICT: ${disp(dir)}/ — both SPEC.md and DETAIL.md exist`,
      );
      conflictCount++;
    } else {
      console.log(`  RENAME: ${disp(file)} → ${disp(dir)}/DETAIL.md`);
      renameSpec.push(file);
    }
  }

  const renameCount = renameClaude.length + renameSpec.length;
  console.log('');
  console.log(`Renames planned: ${renameCount}`);
  console.log(`Conflicts (skipped): ${conflictCount}`);

  if (renameCount === 0) {
    console.log('');
    console.log('No files to rename (all have conflicts). Resolve manually.');
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Phase 2 — Rename (--execute only)
  // -------------------------------------------------------------------------
  console.log('');
  console.log('## Phase 2 — Rename');

  const renamedClaudeDirs = [];
  const renamedSpecDirs = [];
  let renamedCount = 0;

  if (mode === 'execute') {
    for (const file of renameClaude) {
      const dir = dirname(file);
      renameFile(file, join(dir, 'INTENT.md'), isGit);
      renamedClaudeDirs.push(dir);
      renamedCount++;
    }
    for (const file of renameSpec) {
      const dir = dirname(file);
      renameFile(file, join(dir, 'DETAIL.md'), isGit);
      renamedSpecDirs.push(dir);
      renamedCount++;
    }
    console.log(`Renamed: ${renamedCount} files`);
  } else {
    for (const file of renameClaude) renamedClaudeDirs.push(dirname(file));
    for (const file of renameSpec) renamedSpecDirs.push(dirname(file));
    console.log('(dry-run — skipped)');
  }

  // -------------------------------------------------------------------------
  // Phase 3 — Scoped Reference Update
  // -------------------------------------------------------------------------
  console.log('');
  console.log('## Phase 3 — Reference Update (scoped)');

  let refFilesUpdated = 0;
  const refUpdatedFiles = [];

  if (mode === 'execute') {
    const claudeRes = scopedUpdate(
      renamedClaudeDirs,
      'CLAUDE.md',
      'INTENT.md',
      'execute',
    );
    const specRes = scopedUpdate(
      renamedSpecDirs,
      'SPEC.md',
      'DETAIL.md',
      'execute',
    );
    refFilesUpdated = claudeRes.updated + specRes.updated;
    refUpdatedFiles.push(...claudeRes.files, ...specRes.files);
    console.log(`Updated references in: ${refFilesUpdated} files`);
  } else {
    console.log('Scoped reference scan (files that would be updated):');
    const claudeRes = scopedUpdate(
      renamedClaudeDirs,
      'CLAUDE.md',
      'INTENT.md',
      'dry-run',
    );
    const specRes = scopedUpdate(
      renamedSpecDirs,
      'SPEC.md',
      'DETAIL.md',
      'dry-run',
    );
    for (const line of claudeRes.listing) console.log(line);
    for (const line of specRes.listing) console.log(line);

    const refPreviewCount = claudeRes.updated + specRes.updated;
    if (refPreviewCount === 0)
      console.log('No scoped cross-file references found.');
    else
      console.log(`Files with scoped references to update: ${refPreviewCount}`);
    console.log('(dry-run — no changes made)');
  }

  // -------------------------------------------------------------------------
  // Phase 4 — Report & Auto-Commit
  // -------------------------------------------------------------------------
  console.log('');
  console.log('## Phase 4 — Report');
  console.log('');
  console.log(`Mode: ${mode}`);
  console.log(`Renames: ${renameCount} planned`);
  if (mode === 'execute') {
    console.log(`Renamed: ${renamedCount} files`);
    console.log(`References updated: ${refFilesUpdated} files`);
  }
  console.log(`Conflicts skipped: ${conflictCount}`);

  if (mode === 'execute' && autoCommit && isGit) {
    console.log('');
    console.log('## Auto-Commit');
    const message =
      'refactor: migrate CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming\n\n' +
      `Renamed: ${renamedCount} files\n` +
      `References updated: ${refFilesUpdated} files\n` +
      `Conflicts skipped: ${conflictCount}`;
    // git mv already staged the renames; add only reference-updated files so
    // unrelated working-tree changes stay out of the migration commit.
    for (let i = 0; i < refUpdatedFiles.length; i += 100)
      runGit(['-C', target, 'add', '--', ...refUpdatedFiles.slice(i, i + 100)]);
    runGit(['-C', target, 'commit', '-m', message]);
    const sha = runGit(['-C', target, 'rev-parse', '--short', 'HEAD'], {
      capture: true,
    });
    console.log(`Committed: ${sha.trim()}`);
  } else if (mode === 'execute' && autoCommit && !isGit) {
    console.log('');
    console.log('Warning: --auto-commit ignored (not a git repository)');
  }

  if (mode === 'dry-run') {
    console.log('');
    console.log('To execute this migration, run with --execute');
  }
}

main();

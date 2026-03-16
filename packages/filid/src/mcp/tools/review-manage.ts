/**
 * MCP tool handler: review-manage
 * Manages review session lifecycle: branch normalization, directory creation,
 * checkpoint detection, committee election, cleanup, content hashing, and cache checking.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type {
  CheckpointStatus,
  CommitteeElection,
  Complexity,
  PersonaId,
  ReviewCacheResult,
  ReviewContentHash,
} from '../../types/review.js';

import {
  formatPrComment,
  formatRevalidateComment,
  handleGenerateHumanSummary,
} from './review-format.js';
import { normalizeBranch } from './review-utils.js';

const execFileAsync = promisify(execFile);

export interface ReviewManageInput {
  action:
    | 'normalize-branch'
    | 'ensure-dir'
    | 'checkpoint'
    | 'elect-committee'
    | 'cleanup'
    | 'content-hash'
    | 'check-cache'
    | 'format-pr-comment'
    | 'format-revalidate-comment'
    | 'generate-human-summary';
  projectRoot: string;
  branchName?: string;
  baseRef?: string;
  changedFilesCount?: number;
  changedFractalsCount?: number;
  hasInterfaceChanges?: boolean;
}

/**
 * Execute a git command safely. Uses execFile (no shell) to prevent injection.
 */
async function gitExec(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trimEnd();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`git ${args[0]} failed in ${cwd}: ${msg}`);
  }
}

/**
 * Compute content hash for a review session.
 * Uses git ls-tree for committed state (not working tree).
 */
async function computeContentHash(
  projectRoot: string,
  baseCommit: string,
  changedFiles: string[],
): Promise<{ sessionHash: string; fileHashes: Record<string, string> }> {
  const fileHashes: Record<string, string> = {};

  if (changedFiles.length > 0) {
    // Get blob hashes for files at HEAD
    let lsTreeOutput = '';
    try {
      lsTreeOutput = await gitExec(projectRoot, [
        'ls-tree',
        '-r',
        'HEAD',
        '--',
        ...changedFiles,
      ]);
    } catch {
      // ls-tree may fail if all files are deleted; that's fine
    }

    // Parse ls-tree output: "<mode> <type> <hash>\t<path>"
    const headBlobs = new Map<string, string>();
    if (lsTreeOutput) {
      for (const line of lsTreeOutput.split('\n')) {
        if (!line) continue;
        const tabIdx = line.indexOf('\t');
        if (tabIdx === -1) continue;
        const filePath = line.slice(tabIdx + 1);
        const parts = line.slice(0, tabIdx).split(' ');
        const blobHash = parts[2];
        headBlobs.set(filePath, blobHash);
      }
    }

    // Build fileHashes: present in HEAD → blob hash, absent → DELETED
    for (const file of changedFiles) {
      fileHashes[file] = headBlobs.get(file) ?? 'DELETED';
    }
  }

  // Build hash input: baseCommit + sorted path:hash entries
  const sortedEntries = Object.keys(fileHashes)
    .sort()
    .map((p) => `${p}:${fileHashes[p]}`)
    .join('\n');
  const hashInput =
    baseCommit + '\n' + (sortedEntries ? sortedEntries + '\n' : '');
  const sessionHash = createHash('sha256').update(hashInput).digest('hex');

  return { sessionHash, fileHashes };
}

// normalizeBranch imported from review-utils.ts

async function handleNormalizeBranch(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for normalize-branch action');
  }
  const normalized = normalizeBranch(input.branchName);
  return { normalized };
}

async function handleEnsureDir(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for ensure-dir action');
  }
  const normalized = normalizeBranch(input.branchName);
  const dirPath = path.join(input.projectRoot, '.filid', 'review', normalized);

  let created = false;
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    created = true;
  }

  return { path: dirPath, created };
}

async function handleCheckpoint(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for checkpoint action');
  }
  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  let dirEntries: string[] = [];
  try {
    dirEntries = await fs.readdir(reviewDir);
  } catch {
    // directory does not exist
  }
  const checkFiles = new Set([
    'structure-check.md',
    'session.md',
    'verification.md',
    'review-report.md',
  ]);
  const existingFiles = dirEntries.filter((f) => checkFiles.has(f));

  const hasStructureCheck = existingFiles.includes('structure-check.md');
  const hasSession = existingFiles.includes('session.md');
  const hasVerification = existingFiles.includes('verification.md');
  const hasReport = existingFiles.includes('review-report.md');

  let phase: CheckpointStatus['phase'];
  if (!hasStructureCheck && !hasSession) {
    phase = 'A';
  } else if (!hasSession) {
    // Phase A done (structure-check.md exists), Phase B pending
    phase = 'B';
  } else if (!hasStructureCheck && hasSession && !hasVerification) {
    // session.md only (no structure-check.md) — check no_structure_check flag
    const sessionPath = path.join(reviewDir, 'session.md');
    let noStructureCheck = false;
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      const match = content.match(/^no_structure_check:\s*(true)/m);
      noStructureCheck = !!match;
    } catch {
      // file read error — treat as flag absent
    }
    // If Phase A was intentionally skipped, proceed to C; otherwise restart A
    phase = noStructureCheck ? 'C' : 'A';
  } else if (!hasVerification) {
    phase = 'C';
  } else if (!hasReport) {
    phase = 'C';
  } else {
    phase = 'DONE';
  }

  const result: CheckpointStatus = { phase, files: existingFiles };
  return result as unknown as Record<string, unknown>;
}

async function handleElectCommittee(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (input.changedFilesCount === undefined) {
    throw new Error('changedFilesCount is required for elect-committee action');
  }
  if (input.changedFractalsCount === undefined) {
    throw new Error(
      'changedFractalsCount is required for elect-committee action',
    );
  }
  if (input.hasInterfaceChanges === undefined) {
    throw new Error(
      'hasInterfaceChanges is required for elect-committee action',
    );
  }

  const { changedFilesCount, changedFractalsCount, hasInterfaceChanges } =
    input;

  // Determine complexity
  let complexity: Complexity;
  if (
    changedFilesCount <= 3 &&
    changedFractalsCount <= 1 &&
    !hasInterfaceChanges
  ) {
    complexity = 'LOW';
  } else if (changedFilesCount > 10 || changedFractalsCount >= 4) {
    complexity = 'HIGH';
  } else {
    complexity = 'MEDIUM';
  }

  // Select committee based on complexity
  let committee: PersonaId[];
  if (complexity === 'LOW') {
    committee = ['engineering-architect', 'operations-sre'];
  } else if (complexity === 'MEDIUM') {
    committee = [
      'engineering-architect',
      'knowledge-manager',
      'business-driver',
      'operations-sre',
    ];
  } else {
    committee = [
      'engineering-architect',
      'knowledge-manager',
      'operations-sre',
      'business-driver',
      'product-manager',
      'design-hci',
    ];
  }

  // Build adversarial pairs from selected committee members
  const adversarialPairs: [PersonaId, PersonaId[]][] = [];

  if (committee.includes('business-driver')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('knowledge-manager'))
      challengers.push('knowledge-manager');
    if (committee.includes('operations-sre'))
      challengers.push('operations-sre');
    if (challengers.length > 0) {
      adversarialPairs.push(['business-driver', challengers]);
    }
  }

  if (committee.includes('product-manager')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('engineering-architect'))
      challengers.push('engineering-architect');
    if (challengers.length > 0) {
      adversarialPairs.push(['product-manager', challengers]);
    }
  }

  if (committee.includes('design-hci')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('engineering-architect'))
      challengers.push('engineering-architect');
    if (challengers.length > 0) {
      adversarialPairs.push(['design-hci', challengers]);
    }
  }

  const result: CommitteeElection = {
    complexity,
    committee,
    adversarialPairs,
  };
  return result as unknown as Record<string, unknown>;
}

async function handleCleanup(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for cleanup action');
  }
  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  // Validate the resolved path stays under projectRoot/.filid/review/
  const resolvedReview = path.resolve(reviewDir);
  const expectedPrefix = path.resolve(
    path.join(input.projectRoot, '.filid', 'review'),
  );
  if (!resolvedReview.startsWith(expectedPrefix)) {
    throw new Error('Invalid cleanup target: path traversal detected');
  }

  await fs.rm(reviewDir, { recursive: true, force: true });

  return { deleted: true };
}

async function handleContentHash(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for content-hash action');
  }
  if (!input.baseRef) {
    throw new Error('baseRef is required for content-hash action');
  }

  const baseCommit = await gitExec(input.projectRoot, [
    'merge-base',
    input.baseRef,
    'HEAD',
  ]);

  const diffOutput = await gitExec(input.projectRoot, [
    'diff',
    '--name-only',
    `${baseCommit}..HEAD`,
  ]);
  const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

  const { sessionHash, fileHashes } = await computeContentHash(
    input.projectRoot,
    baseCommit,
    changedFiles,
  );

  const contentHash: ReviewContentHash = {
    sessionHash,
    baseCommit,
    fileHashes,
    computedAt: new Date().toISOString(),
  };

  // Ensure review dir exists and write content-hash.json
  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(
    path.join(reviewDir, 'content-hash.json'),
    JSON.stringify(contentHash, null, 2),
  );

  return contentHash as unknown as Record<string, unknown>;
}

async function handleCheckCache(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for check-cache action');
  }
  if (!input.baseRef) {
    throw new Error('baseRef is required for check-cache action');
  }

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );
  const hashFilePath = path.join(reviewDir, 'content-hash.json');

  // Compute current hash
  const baseCommit = await gitExec(input.projectRoot, [
    'merge-base',
    input.baseRef,
    'HEAD',
  ]);
  const diffOutput = await gitExec(input.projectRoot, [
    'diff',
    '--name-only',
    `${baseCommit}..HEAD`,
  ]);
  const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];
  const { sessionHash: currentHash } = await computeContentHash(
    input.projectRoot,
    baseCommit,
    changedFiles,
  );

  // Read cached hash
  let cachedHash: string | null = null;
  try {
    const raw = await fs.readFile(hashFilePath, 'utf-8');
    const cached = JSON.parse(raw) as ReviewContentHash;
    cachedHash = cached.sessionHash;
  } catch {
    // No cached hash — cache miss
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash: null,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message: 'No prior review cache found. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  // Compare hashes
  if (currentHash !== cachedHash) {
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message:
        'Content changed since last review. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  // Hash matches — check if review-report.md exists
  const reportPath = path.join(reviewDir, 'review-report.md');
  try {
    await fs.access(reportPath);
  } catch {
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message:
        'Hash matches but prior review is incomplete. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  // Cache hit
  const fixRequestsPath = path.join(reviewDir, 'fix-requests.md');
  let fixRequestsExists = false;
  try {
    await fs.access(fixRequestsPath);
    fixRequestsExists = true;
  } catch {
    // fix-requests.md is optional
  }

  const result: ReviewCacheResult = {
    cacheHit: true,
    action: 'skip-to-existing-results',
    currentHash,
    cachedHash,
    existingReportPath: reportPath,
    existingFixRequestsPath: fixRequestsExists ? fixRequestsPath : null,
    message: 'Review cache hit — content unchanged since last review.',
  };
  return result as unknown as Record<string, unknown>;
}

/**
 * Handle review-manage MCP tool calls.
 */
export async function handleReviewManage(
  args: unknown,
): Promise<Record<string, unknown>> {
  const input = args as ReviewManageInput;

  if (!input.action) {
    throw new Error('action is required');
  }
  if (!input.projectRoot) {
    throw new Error('projectRoot is required');
  }

  const handlers: Record<
    string,
    (input: ReviewManageInput) => Promise<Record<string, unknown>>
  > = {
    'normalize-branch': handleNormalizeBranch,
    'ensure-dir': handleEnsureDir,
    checkpoint: handleCheckpoint,
    'elect-committee': handleElectCommittee,
    cleanup: handleCleanup,
    'content-hash': handleContentHash,
    'check-cache': handleCheckCache,
    'format-pr-comment': formatPrComment,
    'format-revalidate-comment': formatRevalidateComment,
    'generate-human-summary': handleGenerateHumanSummary,
  };

  const handler = handlers[input.action];
  if (!handler) {
    throw new Error(`Unknown action: ${input.action}`);
  }

  return handler(input);
}

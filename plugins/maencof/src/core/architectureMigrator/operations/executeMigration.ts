/**
 * @file executeMigration.ts
 * @description WAL(Write-Ahead Log) 기반으로 마이그레이션을 원자적으로 실행한다.
 */
import { mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type {
  MigrationOp,
  MigrationPlan,
  MigrationResult,
  MigrationWAL,
} from '../../../types/setup.js';

import { updateFrontmatterField } from './updateFrontmatterField.js';
import { updateVersionFile } from './updateVersionFile.js';
import { writeWAL } from './writeWAL.js';

/**
 * WAL 기반으로 마이그레이션을 실행한다.
 */
export function executeMigration(
  vaultPath: string,
  plan: MigrationPlan,
): MigrationResult {
  const walPath = join(vaultPath, '.maencof-meta', 'migration-wal.json');
  const wal: MigrationWAL = {
    id: `mig-${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    operations: plan.operations.map((op) => ({
      op,
      status: 'pending' as const,
    })),
  };

  // WAL 기록
  writeWAL(walPath, wal);

  let executedCount = 0;
  let failedCount = 0;

  for (const entry of wal.operations)
    try {
      executeOp(entry.op, vaultPath);
      entry.status = 'done';
      entry.executedAt = new Date().toISOString();
      executedCount++;
      writeWAL(walPath, wal);
    } catch (err) {
      failedCount++;
      wal.status = 'in_progress'; // remains in_progress for rollback
      writeWAL(walPath, wal);
      return {
        success: false,
        walId: wal.id,
        operationsExecuted: executedCount,
        operationsFailed: failedCount,
        error: err instanceof Error ? err.message : String(err),
      };
    }

  wal.status = 'completed';
  wal.completedAt = new Date().toISOString();
  writeWAL(walPath, wal);

  return {
    success: true,
    walId: wal.id,
    operationsExecuted: executedCount,
    operationsFailed: 0,
  };
}

function executeOp(op: MigrationOp, _vaultPath: string): void {
  switch (op.type) {
    case 'create_dir':
      mkdirSync(op.path, { recursive: true });
      break;
    case 'move_file':
      mkdirSync(dirname(op.to), { recursive: true });
      renameSync(op.from, op.to);
      break;
    case 'update_frontmatter':
      updateFrontmatterField(op.path, op.field, op.newValue);
      break;
    case 'update_version':
      updateVersionFile(op.path, op.newVersion);
      break;
  }
}

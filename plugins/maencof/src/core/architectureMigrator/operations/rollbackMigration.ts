/**
 * @file rollbackMigration.ts
 * @description WAL을 읽어 완료된 작업을 역순으로 롤백한다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { MigrationOp, MigrationWAL } from '../../../types/setup.js';

import { updateFrontmatterField } from './updateFrontmatterField.js';
import { updateVersionFile } from './updateVersionFile.js';
import { writeWAL } from './writeWAL.js';

/**
 * WAL을 읽어 완료된 작업을 역순으로 롤백한다.
 */
export function rollbackMigration(vaultPath: string): {
  success: boolean;
  rolledBack: number;
  error?: string;
} {
  const walPath = join(vaultPath, '.maencof-meta', 'migration-wal.json');
  if (!existsSync(walPath))
    return { success: false, rolledBack: 0, error: 'No WAL file found' };

  const wal: MigrationWAL = JSON.parse(
    readFileSync(walPath, 'utf-8'),
  ) as MigrationWAL;

  // 완료된 작업만 역순으로 롤백
  const doneEntries = wal.operations
    .filter((e) => e.status === 'done')
    .reverse();

  let rolledBack = 0;
  for (const entry of doneEntries)
    try {
      rollbackOp(entry.op, vaultPath);
      entry.status = 'rolled_back';
      rolledBack++;
    } catch (err) {
      wal.status = 'rolled_back';
      writeWAL(walPath, wal);
      return {
        success: false,
        rolledBack,
        error: err instanceof Error ? err.message : String(err),
      };
    }

  wal.status = 'rolled_back';
  wal.completedAt = new Date().toISOString();
  writeWAL(walPath, wal);

  return { success: true, rolledBack };
}

function rollbackOp(op: MigrationOp, _vaultPath: string): void {
  switch (op.type) {
    case 'create_dir':
      // 디렉토리가 비어있으면 삭제 (rmdirSync는 비어있을 때만 성공)
      try {
        rmdirSync(op.path);
      } catch {
        // 비어있지 않으면 무시
      }
      break;
    case 'move_file':
      if (existsSync(op.to)) {
        mkdirSync(dirname(op.from), { recursive: true });
        renameSync(op.to, op.from);
      }
      break;
    case 'update_frontmatter':
      if (existsSync(op.path))
        updateFrontmatterField(op.path, op.field, op.oldValue);

      break;
    case 'update_version':
      if (existsSync(op.path)) updateVersionFile(op.path, op.oldVersion);

      break;
  }
}

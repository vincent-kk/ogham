import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { MigrationBackup, MigrationOp } from '../../../../types/setup.js';

/**
 * @param backupDir 이 실행만 소유하는 비어 있는 백업 디렉터리.
 * @param operations 실행할 연산. 수정·이동 목적지와 원본의 초기 상태를 보존한다.
 * @returns 모든 복사가 완료된 복원 목록. 복사 오류는 전파하여 실행을 막는다.
 */
export function createMigrationBackup(
  backupDir: string,
  operations: MigrationOp[],
): MigrationBackup {
  mkdirSync(backupDir, { recursive: true });
  const paths: string[] = [];
  const createdDirectories: string[] = [];
  for (const op of operations) {
    const files =
      op.type === 'move_file'
        ? [op.from, op.to]
        : op.type === 'update_frontmatter' || op.type === 'update_version'
          ? [op.path]
          : [];
    for (const path of files) if (!paths.includes(path)) paths.push(path);
    const target =
      op.type === 'create_dir'
        ? op.path
        : op.type === 'move_file'
          ? dirname(op.to)
          : undefined;
    if (target) {
      let dir = target;
      while (!existsSync(dir)) {
        if (!createdDirectories.includes(dir)) createdDirectories.push(dir);
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
  }
  const files = paths.map((path, index) => {
    if (!existsSync(path)) return { path };
    const copy = `${index}.backup`;
    copyFileSync(path, join(backupDir, copy));
    return { path, copy };
  });
  return { files, createdDirectories };
}

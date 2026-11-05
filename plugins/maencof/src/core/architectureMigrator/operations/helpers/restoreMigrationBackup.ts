import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { MigrationBackup } from '../../../../types/setup.js';

/**
 * @param backupDir 실패한 실행의 보존된 사본 디렉터리.
 * @param backup 첫 변경 전의 바이트·부재 상태 목록.
 * @returns 없음. 복원 실패를 전파하여 사본을 유지하고 재시도하게 한다.
 */
export function restoreMigrationBackup(
  backupDir: string,
  backup: MigrationBackup,
): void {
  for (const file of backup.files) {
    if (file.copy) {
      mkdirSync(dirname(file.path), { recursive: true });
      copyFileSync(join(backupDir, file.copy), file.path);
    } else rmSync(file.path, { force: true });
  }
  for (const dir of [...backup.createdDirectories].sort(
    (a, b) => b.length - a.length,
  ))
    if (existsSync(dir)) rmdirSync(dir);
}

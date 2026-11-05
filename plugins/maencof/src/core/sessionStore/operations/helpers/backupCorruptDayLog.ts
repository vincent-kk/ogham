import {
  constants,
  copyFileSync,
  existsSync,
  readFileSync,
} from 'node:fs';

import { backupPathFor } from '../../../backupPath/index.js';

/**
 * 빈 로그로 폴백할 기존 파일을 덮기 전에 원본 바이트를 보존한다.
 * @param path 기록할 일자 JSON 파일의 경로. 없는 파일과 유효한 로그는 건너뛴다.
 * @returns 없음. 읽기·백업 실패는 전파하여 호출자의 덮어쓰기를 막는다.
 */
export function backupCorruptDayLog(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf-8');
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'sessions' in parsed &&
      parsed.sessions
    )
      return;
  } catch {
    // 파싱 불가 데이터도 복구 대상이므로 아래에서 바이트 그대로 보존한다.
  }
  copyFileSync(path, backupPathFor(path), constants.COPYFILE_EXCL);
}

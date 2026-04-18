import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ChangeLogEntry {
  timestamp: string;
  action: string;
  path: string;
  category: string;
  sessionId: string;
}

export function appendChangeLog(cwd: string, entry: ChangeLogEntry): void {
  try {
    const logDir = path.join(cwd, '.filid');
    const logFile = path.join(logDir, 'change-log.jsonl');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // 로그 쓰기 실패는 조용히 무시 (hook 실패로 이어지지 않도록)
  }
}

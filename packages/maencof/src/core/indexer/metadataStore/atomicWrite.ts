/**
 * @file atomicWrite.ts
 * @description Tmp-file + fs.rename 기반 원자적 JSON 쓰기.
 */
import { rename, unlink, writeFile } from 'node:fs/promises';

import {
  ATOMIC_WRITE_RETRY_BACKOFF_MS as DEFAULT_BACKOFF_MS,
  ATOMIC_WRITE_RETRY_ATTEMPTS as DEFAULT_RETRIES,
} from '../../../constants/atomicWrite.js';

export interface AtomicWriteOptions {
  /** 시도 횟수 (기본 3). */
  retries?: number;
  /** 시도 간 backoff (ms, 기본 50). */
  backoffMs?: number;
}

/**
 * `data`를 `${absPath}.tmp.${pid}.${rand}`로 작성한 뒤 `fs.rename`으로 `absPath`에 옮긴다.
 *
 * - tmp/rename 실패 시 backoff 후 재시도. 모든 시도 실패 시 마지막 에러를 throw.
 * - 다중 프로세스 환경에서 partial write를 차단하고 last-writer-wins 시멘틱을 보장한다.
 */
export async function atomicWriteJson(
  absPath: string,
  data: unknown,
  opts: AtomicWriteOptions = {},
): Promise<void> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const payload = JSON.stringify(data);

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    const tmpPath = `${absPath}.tmp.${process.pid}.${Math.random().toString(36).slice(2)}`;
    try {
      await writeFile(tmpPath, payload, 'utf-8');
      await rename(tmpPath, absPath);
      return;
    } catch (err) {
      lastErr = err;
      await unlink(tmpPath).catch(() => undefined);
      if (attempt < retries - 1) {
        await sleep(backoffMs);
      }
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

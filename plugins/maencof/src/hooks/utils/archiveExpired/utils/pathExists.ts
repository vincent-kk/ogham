/**
 * @file pathExists.ts
 * @description 경로 존재 여부를 boolean으로 반환한다 (access 예외를 흡수).
 */
import { access } from 'node:fs/promises';

export async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

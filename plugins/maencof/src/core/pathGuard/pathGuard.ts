/**
 * @file pathGuard.ts
 * @description vault 루트 밖으로 벗어나는 사용자 경로 입력을 거부하는 경로 봉쇄 헬퍼.
 *   create 핸들러에 인라인으로 있던 검사를 공용화 (read/update/delete/move 재사용).
 */
import { resolve, sep } from 'node:path';

/** 경로 봉쇄 결과 — 통과 시 절대경로, 탈출 시 error 메시지. */
export type VaultPathResolution = { absolutePath: string } | { error: string };

/**
 * `userPath` 를 vault 루트 기준 절대경로로 해석하되, 결과가 루트 밖이면 거부한다.
 *
 * `resolve` 는 절대 경로 입력 시 base 를 무시하므로, `../` traversal 과
 * 절대경로 탈출이 모두 `startsWith` 검사에서 걸러진다. 루트 자기 자신은
 * (뒤에 `sep` 이 붙지 않아) 문서 경로가 아닌 것으로 간주해 함께 거부한다.
 */
export function resolveWithinVault(
  vaultPath: string,
  userPath: string,
): VaultPathResolution {
  const absolutePath = resolve(vaultPath, userPath);
  if (!absolutePath.startsWith(resolve(vaultPath) + sep))
    return { error: `Path escapes vault root: ${userPath}` };
  return { absolutePath };
}

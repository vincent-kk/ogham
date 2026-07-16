/**
 * @file nearestSrcRoot.ts
 * @description 소스 파일에서 가장 가까운 상위 `src` 디렉터리를 찾는다.
 *
 * 전략들이 `projectRoot/src` 를 앵커로 쓰면 모노레포(projectRoot=repo root,
 * 소스는 `plugins/<pkg>/src/**`)에서 테스트 루트를 영원히 놓친다 — 테스트
 * 탐색의 앵커는 프로젝트 루트가 아니라 소스 파일 자신의 `src` 여야 한다.
 */
import { portableBasename, portableDirname } from '@ogham/cross-platform/paths';

/**
 * Walk up from the source file until a directory named `src` is found.
 * Returns its absolute path, or null when the file is not under any `src`.
 */
export function nearestSrcRoot(sourceFilePath: string): string | null {
  let dir = portableDirname(sourceFilePath);
  while (true) {
    if (portableBasename(dir) === 'src') return dir;
    const parent = portableDirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

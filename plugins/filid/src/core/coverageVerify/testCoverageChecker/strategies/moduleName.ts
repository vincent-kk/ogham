/**
 * @file moduleName.ts
 * @description 파일 경로에서 확장자를 제외한 모듈명을 추출한다.
 */
import { portableBasename } from '@ogham/cross-platform/paths';

/**
 * Extract the module name (basename without extension) from a file path.
 */
export function moduleName(filePath: string): string {
  return portableBasename(filePath).replace(/\.[^.]+$/, '');
}

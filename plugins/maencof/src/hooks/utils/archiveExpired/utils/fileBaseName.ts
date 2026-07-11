/**
 * @file fileBaseName.ts
 * @description 절대 경로에서 확장자 없는 파일명을 얻는다.
 */
export function fileBaseName(absolutePath: string): string {
  const pathSegments = absolutePath.split('/');
  return pathSegments[pathSegments.length - 1].replace(/\.md$/, '');
}

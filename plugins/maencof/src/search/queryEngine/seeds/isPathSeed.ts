/**
 * @file isPathSeed.ts
 * @description 시드 문자열이 경로 시드('.md' 종결 또는 '/' 포함)인지 판별한다.
 */
export function isPathSeed(seed: string): boolean {
  return seed.endsWith('.md') || seed.includes('/');
}

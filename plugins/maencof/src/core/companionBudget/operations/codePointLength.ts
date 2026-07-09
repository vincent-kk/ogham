/**
 * @file codePointLength.ts
 * @description 서로게이트 쌍을 한 글자로 세는 코드포인트 길이.
 */
export function codePointLength(text: string): number {
  return [...text].length;
}

/**
 * @file quoteYamlScalar.ts
 * @description YAML 스칼라 인용: 큰따옴표로 감싸고 내부 따옴표/백슬래시를 이스케이프.
 */
export function quoteYamlScalar(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

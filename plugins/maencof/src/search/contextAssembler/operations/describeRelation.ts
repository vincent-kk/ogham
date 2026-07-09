/**
 * @file describeRelation.ts
 * @description 홉 거리 기반 관계 설명을 생성한다.
 */
export function describeRelation(hops: number): string {
  switch (hops) {
    case 0:
      return 'seed';
    case 1:
      return 'direct link';
    case 2:
      return '2-hop';
    case 3:
      return '3-hop';
    default:
      return `${hops}-hop`;
  }
}

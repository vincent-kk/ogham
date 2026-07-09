/**
 * @file layerName.ts
 * @description Layer 번호를 사람이 읽기 쉬운 이름으로 변환한다.
 */
export function layerName(layer: number): string {
  switch (layer) {
    case 1:
      return 'Core';
    case 2:
      return 'Derived';
    case 3:
      return 'External';
    case 4:
      return 'Action';
    default:
      return `L${layer}`;
  }
}

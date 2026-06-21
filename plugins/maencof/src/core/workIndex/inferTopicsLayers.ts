/**
 * @file inferTopicsLayers.ts
 * @description 파일 경로에서 레이어 디렉터리·토픽(파일명 stem)을 추론하는 순수 함수.
 *
 * 레이어는 architecture.ts 의 `layerFromDir` 재사용(`01_Core`~`05_Context`) — 정규식 하드코딩 금지.
 * 토픽은 파일명 stem 이다: 경로 2단계 세그먼트는 서브레이어(topical/structural/buffer 등)이지
 * 토픽이 아니다. 정규화는 하지 않는다(의도적 단순화; 필요해지면 tags 기반으로 승격).
 */
import { layerFromDir } from '../../constants/architecture.js';

export function inferTopicsLayers(files: string[]): {
  layers: string[];
  topics: string[];
} {
  const layers = new Set<string>();
  const topics = new Set<string>();

  for (const file of files) {
    const parts = file.split('/');
    const head = parts[0];
    if (head && layerFromDir(head) !== undefined) layers.add(head);
    const stem = (parts[parts.length - 1] ?? '').replace(/\.md$/i, '');
    topics.add(stem || 'uncategorized');
  }

  return { layers: [...layers], topics: [...topics] };
}

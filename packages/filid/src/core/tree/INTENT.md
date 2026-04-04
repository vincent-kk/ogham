# tree -- 프랙탈 트리 모듈

## Purpose

프랙탈 트리 구축, 노드 분류(fractal/organ/pure-function/hybrid), 바운더리 체인 탐지를 수행한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `fractal-tree` | 트리 구축, 스캔, 노드 탐색 |
| `organ-classifier` | 노드 타입 분류 (우선순위 기반) |
| `boundary-detector` | INTENT.md 바운더리 체인 탐지 |

## Boundaries

### Always do
- 분류 우선순위 변경 시 테스트 업데이트

### Ask first
- `KNOWN_ORGAN_DIR_NAMES` 목록 변경

### Never do
- 파일시스템 구조 직접 변경

## Dependencies
- `../utils/`, `../../types/`

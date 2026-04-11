# fractal-tree -- 프랙탈 트리 구축, 스캔, 노드 탐색

## Purpose

프랙탈 트리 구축, 스캔, 노드 탐색.

## Structure

- `tree-builder/` — 트리 구축 및 탐색 (buildFractalTree, findNode, getAncestors, getDescendants, getFractalsUnderOrgans)
- `scanner/` — 파일시스템 스캔 및 프레임워크 감지 (scanProject, shouldExclude, detectFrameworks, discoverDirectories, collectNodeMetadata, correctNodeTypes)
- `fractal-tree.ts` — slim facade (tree-builder/ + scanner/ re-export)

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트

### Ask first
- 공개 API 시그니처 변경

### Never do
- 모듈 경계 외부 로직 인라인

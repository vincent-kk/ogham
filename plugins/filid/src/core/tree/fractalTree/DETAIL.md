# fractalTree — Contract

## Requirements

- `readdirSync(..., { withFileTypes: true })` recursion으로 root와 descendants를 탐색한다.
- exclusion, max depth와 symlink 정책을 path별로 적용한다.
- 각 directory의 document, peer file과 adapter entry/framework evidence를 수집한다.
- snapshot이 ownership map을 제공하면 ambiguous/unsupported entry point
  descriptor를 tree 분류에 사용하지 않는다.
- adapter별 entry point override는 core가 해석하지 않고 해당 adapter에
  그대로 전달한다.
- bottom-up correction 뒤 tree relation과 owner metadata를 일관되게 조립한다.
- scan은 project tree를 변경하지 않는다.

## API Contracts

- `discoverDirectories(rootPath, options): Promise<string[]>` — root를 포함한 정렬된 절대 directory paths.
- `collectNodeMetadata(paths, root, options, adapters): Promise<NodeEntry[]>` — adapter-aware metadata.
- `correctNodeTypes(entries, children, names): NodeEntry[]` — deepest-first classification correction.
- `scanProject(rootPath, options?): Promise<FractalTree>` — complete read-only tree.

## Acceptance Criteria

### AC-fractal-tree-discovery — dependency 제거

- 기존 fixture의 node path 집합이 glob 구현과 readdir 구현에서 동일하다.
- `fast-glob` 없이 excluded path와 max depth가 유지된다.

### AC-fractal-tree-entry — adapter ownership

- arbitrary adapter entry descriptor가 node에 보존되고 fractal classification을 유도한다.
- ownership이 확정된 entry descriptor만 snapshot tree 분류를 유도한다.
- adapter별 override가 대상 adapter 호출에만 전달된다.
- core source에는 초기 adapter의 entry filename literal이 없다.

## Last Updated

2026-07-26 — Node 20 recursion과 StructureAdapter 기반 scan 계약을 정의했다.

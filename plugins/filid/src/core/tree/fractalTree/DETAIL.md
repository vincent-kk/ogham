# fractalTree — Contract

## Requirements

- `readdirSync(..., { withFileTypes: true })` recursion으로 root와 descendants를 탐색한다.
- exclusion, max depth와 symlink 정책을 path별로 적용한다.
- git이 무시하고 추적하지도 않는 path는 directory에서도 peer file에서도 evidence가 되지 않는다. 판정은 `lib/createIgnoreFilter`가 scan 시작에 한 번 만든 filter가 맡고, git이 없거나 root가 work tree 밖이면 filter는 항상 false를 돌려준다.
- 각 directory의 document, peer file과 adapter entry/framework evidence를 수집한다.
- snapshot이 ownership map을 제공하면 ambiguous/unsupported entry point descriptor를 tree 분류에 사용하지 않는다.
- adapter별 entry point override는 core가 해석하지 않고 해당 adapter에 그대로 전달한다.
- bottom-up correction 뒤 tree relation과 owner metadata를 일관되게 조립한다.
- scan은 project tree를 변경하지 않는다.

## API Contracts

- `discoverDirectories(rootPath, options, isIgnored?): Promise<string[]>` — root를 포함한 정렬된 절대 directory paths. `isIgnored` 생략은 ignore 없는 탐색이다.
- `collectNodeMetadata(paths, root, options, adapters, isIgnored?): Promise<NodeEntry[]>` — adapter-aware metadata.
- `correctNodeTypes(entries, children, names): NodeEntry[]` — deepest-first classification correction.
- `scanProject(rootPath, options?): Promise<FractalTree>` — complete read-only tree.

## Acceptance Criteria

### AC-fractal-tree-discovery — dependency 제거

- 기존 fixture의 node path 집합이 glob 구현과 readdir 구현에서 동일하다.
- `fast-glob` 없이 excluded path와 max depth가 유지된다.

### AC-fractal-tree-ignored — git이 무시하는 build 산출물

- git이 무시하는 root peer file은 `peerFiles`에 들어가지 않는다. build cache는 fractal 경계에 대한 증거가 아니므로 allowlist가 아니라 traversal이 막는다.
- git이 무시하는 directory는 node로 잡히지 않는다.
- ignore pattern에 걸려도 git이 추적하는 파일은 그대로 스캔된다.
- git work tree 밖의 root는 ignore 이전과 동일한 tree를 만든다.

### AC-fractal-tree-entry — adapter ownership

- arbitrary adapter entry descriptor가 node에 보존되고 fractal classification을 유도한다.
- ownership이 확정된 entry descriptor만 snapshot tree 분류를 유도한다.
- adapter별 override가 대상 adapter 호출에만 전달된다.
- core source에는 초기 adapter의 entry filename literal이 없다.

## Last Updated

2026-07-28 — git이 무시하는 path를 traversal 단계에서 제외하는 계약을 추가했다.

# fractalTree — Contract

## Requirements

- `readdirSync(..., { withFileTypes: true })` recursion으로 root와 descendants를 탐색한다.
- Apply built-in `ScanOptions.exclude`, config `ignore`, and config `structure.excludeFromScan` project-relative patterns through one path-and-ancestor matcher. A matching directory is pruned; matching files are absent from both peer files and the flat scanned path list.
- git이 무시하고 추적하지도 않는 path는 directory에서도 peer file에서도 evidence가 되지 않는다. 판정은 `lib/createIgnoreFilter`가 scan 시작에 한 번 만든 filter가 맡고, git이 없거나 root가 work tree 밖이면 filter는 항상 false를 돌려준다.
- 각 directory의 document, peer file과 adapter entry/framework evidence를 수집한다.
- snapshot이 ownership map을 제공하면 ambiguous/unsupported entry point descriptor를 tree 분류에 사용하지 않는다.
- `kind: 'manifest'` descriptor는 그 ownership 필터에서 제외한다. ownership map은 adapter가 발견한 **source file**로 만들어지고 manifest는 source file이 아니라 선언 파일이라 그 map에 결코 들어오지 않는다 — 필터를 그대로 적용하면 snapshot 경로에서만 manifest entry가 사라져 tree와 adapter 보고가 갈린다. 필터의 목적인 "소유가 모호한 descriptor가 분류를 유도하는 것"은 manifest에 해당하지 않는다: manifest는 분류하지 않는 kind이고 descriptor가 adapter ID를 스스로 밝힌다.
- adapter별 entry point override는 core가 해석하지 않고 해당 adapter에 그대로 전달한다.
- bottom-up correction 뒤 tree relation과 owner metadata를 일관되게 조립한다.
- scan은 project tree를 변경하지 않는다.

## API Contracts

- `discoverDirectories(rootPath, options, isIgnored?): Promise<string[]>` — root를 포함한 정렬된 절대 directory paths. `isIgnored` 생략은 ignore 없는 탐색이다.
- `collectNodeMetadata(paths, root, options, adapters, isIgnored?): Promise<NodeEntry[]>` — adapter-aware metadata.
- `correctNodeTypes(entries, children, names): NodeEntry[]` — deepest-first classification correction.
- `scanProject(rootPath, options?): Promise<FractalTree>` — complete read-only tree.
- `scanFileSetOptions(config?): ScanOptions` — supplies full traversal, config `ignore`, and config `structure.excludeFromScan` patterns as the single file-set policy for tree scanning and adapter discovery. `structure.maxDepth` is a rule threshold, not a traversal cap.
- `listScannedFilePaths(rootPath, options?): Promise<string[]>` — the same file set `scanProject` collects as `peerFiles`, flattened to project-relative POSIX paths sorted by raw bytes. It runs the same discovery and the same ignore filter, so the two sets cannot drift; it returns raw entry names without `pathForCompare`, because a rename that changes only case must read as a different path list.

## Acceptance Criteria

### AC-fractal-tree-discovery — dependency 제거

- 기존 fixture의 node path 집합이 glob 구현과 readdir 구현에서 동일하다.
- `fast-glob` 없이 excluded path와 max depth가 유지된다.

### AC-fractal-tree-ignored — git이 무시하는 build 산출물

- git이 무시하는 root peer file은 `peerFiles`에 들어가지 않는다. build cache는 fractal 경계에 대한 증거가 아니므로 allowlist가 아니라 traversal이 막는다.
- git이 무시하는 directory는 node로 잡히지 않는다.
- ignore pattern에 걸려도 git이 추적하는 파일은 그대로 스캔된다.
- git work tree 밖의 root는 ignore 이전과 동일한 tree를 만든다.

### AC-fractal-tree-excluded-paths — Config path exclusions

- An excluded directory is not a node; an excluded file is absent from `peerFiles` and `listScannedFilePaths`.
- 목록이 비면 내장 pattern만 적용한 tree와 동일하다.

### AC-fractal-tree-exclude-depth — pattern 적용 깊이

- `**/` matches zero or more path segments; other patterns are rooted at the project root. Matching any ancestor excludes its descendants.

### AC-fractal-tree-flat-paths — 평면 경로 목록

- `listScannedFilePaths`가 돌려주는 집합은 같은 root·option에서 `scanProject`가 모은 `peerFiles`의 합집합과 정확히 같다.
- git이 무시하는 파일, dot 항목, 제외 디렉터리 안의 파일, 깊이 한계를 넘는 디렉터리의 파일은 목록에 없다.

### AC-fractal-tree-entry — adapter ownership

- arbitrary adapter entry descriptor가 node에 보존되고 fractal classification을 유도한다.
- ownership이 확정된 entry descriptor만 snapshot tree 분류를 유도한다.
- adapter별 override가 대상 adapter 호출에만 전달된다.
- core source에는 초기 adapter의 entry filename literal이 없다.

## Last Updated

2026-07-30 — config가 공급하는 제외 디렉터리 이름을 exclusion 판정에 더하는 계약을 추가했다.

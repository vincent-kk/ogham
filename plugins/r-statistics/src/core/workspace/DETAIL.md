# workspace — Contract

## Requirements

- 실행마다 `data/`·`artifacts/` 를 가진 격리 디렉터리를 만든다.
- `workspaceId` 는 경로 구분자와 상위 참조를 포함할 수 없다 — 워크스페이스 탈출을 입력 단계에서 거부한다.
- 아티팩트 수집은 확장자 화이트리스트를 따르며, 수집된 항목마다 sha256 을 기록한다.
- 재사용 모드에 따라 상태가 갈린다: stateless 재사용은 이전 아티팩트를 지우고, `workspace_files` 재사용은 이전 데이터와 `createdAt` 을 보존한다.
- TTL 이 지난 워크스페이스는 `createdAt` 기록을 근거로 정리한다.

## API Contracts

- `createWorkspace(options: CreateWorkspaceOptions): Promise<WorkspaceHandle>` — `data/`·`artifacts/` 와 `meta.json`(createdAt) 을 `DIR_MODE`(0700) 로 만든다. 잘못된 `workspaceId` 는 거부한다.
- `collectArtifacts(...)` — `artifacts/` 안만 수집하고 sha256 과 kind(매니페스트 우선, 없으면 확장자 추론) 를 붙인다. realpath 가 루트 밖으로 나가는 symlink 는 `ARTIFACT_POLICY_FAILED` 로 throw 한다.
- `readManifest(...)` — `artifacts/manifest.json` 이 없으면 `undefined`, 있으면 파싱해 아티팩트 kind 를 매핑한다.
- `pruneExpired(ttlHours: number): Promise<number>` — `meta.json` 의 `createdAt`(폴백 mtime) 기준으로 TTL 초과 워크스페이스를 제거하고 제거 개수를 돌려준다.

## Acceptance Criteria

### AC-workspace-isolation — 격리와 입력 방어

- 생성된 워크스페이스에 `data/`·`artifacts/` 가 존재한다.
- 경로 traversal 문자를 포함한 `workspaceId` 는 거부하고, 영숫자·언더스코어·하이픈 조합은 허용한다.

### AC-artifact-collection — 아티팩트 정책

- 화이트리스트 확장자 파일만 sha256·kind 와 함께 수집된다.
- 화이트리스트 밖 확장자는 무시된다.
- 매니페스트 부재 시 `undefined`, 존재 시 kind 매핑 결과를 돌려준다.

### AC-workspace-reuse — 재사용 시 상태 규약

- stateless 재사용은 이전 아티팩트를 지운다.
- `workspace_files` 재사용은 이전 데이터와 `createdAt` 을 보존한다.
- TTL 초과 워크스페이스는 prune 대상이 된다.

## Last Updated

2026-07-30 — 격리·수집·재사용 계약을 문서화했다.

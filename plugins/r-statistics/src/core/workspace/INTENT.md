## Purpose

temp 격리 워크스페이스 모듈. 세션별 디렉토리를 만들고(`data/` 입력·`artifacts/` 출력), 실행 종료 후 ARTIFACTS_DIR 에서만 산출물을 수집(해시·확장자 화이트리스트·symlink 탈출 거부)하며, 만료 워크스페이스를 정리한다.

## Structure

| File                             | Role                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| `operations/createWorkspace.ts`  | `data/`·`artifacts/` 생성 + `meta.json`(createdAt), WorkspaceHandle 반환 |
| `operations/collectArtifacts.ts` | ARTIFACTS_DIR 수집 + 해시 + 확장자·symlink 정책 강제                     |
| `operations/readManifest.ts`     | `artifacts/manifest.json` 파싱 (없으면 undefined)                        |
| `operations/pruneExpired.ts`     | createdAt(meta.json) 기준 ttl 초과 제거(폴백 mtime)                      |
| `index.ts`                       | barrel                                                                   |

## Conventions

- 출력 수집은 `artifacts/` 한정 — 그 밖의 경로 쓰기는 수집 대상 아님
- symlink 가 실제 루트 밖으로 해석되면 `ARTIFACT_POLICY_FAILED` throw
- 확장자 화이트리스트(`ALLOWED_ARTIFACT_EXTENSIONS`) 외 파일은 무시
- 디렉토리 권한은 `DIR_MODE`(0700)

## Boundaries

### Always do

- 산출물 해시(sha256) 부여 + realpath 격리 확인
- manifest 의 kind 를 우선, 없으면 확장자로 추론

### Ask first

- 확장자 화이트리스트 변경
- 수집 범위를 하위 디렉토리까지 확장

### Never do

- ARTIFACTS_DIR 밖 경로 수집
- Rscript 탐색·spawn 책임 침범 (rRuntime 소관)

## Dependencies

- `node:fs/promises`, `node:path`
- `../../constants/{defaults,paths,messages}`, `../../types/{enums,rExecution}`, `../../utils/{mimeForExtension,randomId,sha256File,isFileNotFound,isoNow}`

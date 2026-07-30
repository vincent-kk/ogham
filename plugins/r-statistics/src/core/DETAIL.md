# core — Contract

## Requirements

- core 는 도메인 무지 실행 기반이다: 통계 의미·기법 적합성을 평가하지 않고, MCP 도구 계층을 알지 못한다.
- 네 하위 fractal(`rRuntime`·`workspace`·`commandGate`·`jobStore`)은 서로의 내부 파일을 직접 import 하지 않고 각자의 배럴을 경유한다.
- `index.ts` 는 네 fractal 의 공개 심볼만 이름으로 재노출한다 — 구현 파일을 노출하지 않는다.

## API Contracts

- 실행: `discoverRscript`, `spawnRscript`, `decodeOutput` (+ `SpawnRscriptOptions`, `SpawnRscriptResult`)
- 격리: `createWorkspace`, `collectArtifacts`, `readManifest`, `pruneExpired` (+ `WorkspaceHandle`)
- 게이트: `validateCommand`, `resolveInstaller`, `validateRScript` (+ `InstallerCommand`, `RScriptValidation`)
- 잡: `createJob`, `getJob`, `updateJob`, `cancelJob`, `cancelAllJobs`, `hasActiveWorkspaceJob` (+ `RJob`, `CreateJobInput`)

각 심볼의 의미는 소유 fractal 의 DETAIL 계약을 따른다. 배럴은 의미를 더하지 않는다.

## Acceptance Criteria

### AC-core-domain-ignorance — 도메인 무지

- core 아래 어떤 파일도 통계 기법 이름이나 가정 판정 로직을 담지 않는다.
- core 는 `mcp/` 의 심볼을 import 하지 않는다 — 의존 방향은 `mcp → core` 한 방향이다.

### AC-core-barrel-surface — 배럴 표면

- `core/index.ts` 의 재노출은 전부 named export 이며 네 하위 배럴만을 원천으로 한다.
- 하위 fractal 간 직접 import(다른 fractal 의 `operations/` 파일 참조)가 0건이다.

## Last Updated

2026-07-30 — 실행 기반 레이어의 경계와 배럴 표면을 문서화했다.

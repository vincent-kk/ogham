## Purpose

sync 실행의 오케스트레이션 — 대상 열거, facts→어댑터 계획 수립, 디스크 반영/검사. 쓰기가 일어나는 유일한 모듈.

## Structure

| Path                             | Role                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `steps/listPluginDirectories.ts` | 저장소 루트 → `.claude-plugin` 보유 플러그인 디렉터리 목록 |
| `steps/planPluginAdapters.ts`    | 플러그인 1개 → 생성 파일 + 진단 (MCP 변수 오류 포집)       |
| `steps/planRootAdapters.ts`      | 저장소 루트 → Codex 마켓플레이스 어댑터                    |
| `steps/applyFiles.ts`            | 계획 → 쓰기(sync) 또는 비교(check)                         |

## Conventions

- `planPluginAdapters.ts` · `planRootAdapters.ts`는 `stableJson`으로 내용을 문자열로 조립할 뿐 디스크를 건드리지 않는다 — 실제 쓰기는 `applyFiles.ts` 한 곳에서만 일어난다.
- `mkdirSync(dirname(...), { recursive: true })`는 sync 분기의 `writeFileSync` 직전에서만 호출한다 — check 분기는 `existsSync`/`readFileSync` 비교만 하고 디렉터리조차 만들지 않는다.
- `FileAction` 5종 고정 — `unchanged` 는 양쪽 모드 공통(비교가 먼저), `created`·`updated` 는 sync 전용, `stale`·`missing` 은 check 전용. 값을 늘릴 때는 `types/plan.ts` 유니온과 `cli/format/formatOutcomes.ts` 를 함께 갱신한다.
- 어댑터 빌드 실패는 던지지 않고 진단으로 흡수한다 — `planPluginAdapters`는 에러를 catch 해 `mcp-variable-args` 진단으로 바꾸고 빈 `files`를 반환한다.

## Boundaries

### Always do

- 내용이 디스크와 동일하면 쓰지 않는다 (unchanged — mtime 불변, 결정성 확인 가능).
- check 모드는 어떤 쓰기도 하지 않는다.

### Ask first

- 어댑터 파일 경로 집합 변경 — 플레이북·DETAIL 과 동시 갱신.

### Never do

- Claude 소비 파일 경로로의 쓰기 — 대상 경로는 어댑터 경로 상수로 한정.

## Dependencies

- `adapters/` (buildCodexPluginManifest · buildAgyMcpConfig · buildAgyHooks · buildCodexHooks · buildCodexSkills · buildCodexMarketplace), `facts/` (readPluginFacts · readMarketplaceFacts), `lint/` (lintHookEvents · lintHookMatchers).
- `constants/adapterPaths.ts` · `constants/claudeArtifacts.ts`, `utils/stableJson.ts`, `types/` (AdapterPlan · GeneratedFile · FileOutcome).
- Node `fs` (existsSync · mkdirSync · readFileSync · writeFileSync · readdirSync) · `path` (join · dirname) — 디스크에 직접 접근하는 유일한 모듈.

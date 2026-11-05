# src — Contract

## Requirements

- 데이터 흐름은 단방향이다. Claude 정본 → `facts/`(읽기) → `adapters/`(순수 변환) → `pipeline/` 계획 → 디스크 반영 순으로만 흐르고 역방향 참조를 두지 않는다.
- 정본 읽기는 facts가 소유하고 pipeline은 대상 탐색·비교·쓰기를 조율한다. 디스크 쓰기는 pipeline, 스트림 출력과 exit 코드는 `main.ts`가 독점한다. 변환·진단·인자 해석은 순수하게 유지해 입력 사실이 같을 때 주변 파일 상태가 결과를 바꾸지 않게 한다.
- JSON 방출은 `utils/stableJson`(2-space 들여쓰기 + 끝 개행) 단일 경로를 거친다. 같은 정본이면 재실행이 바이트 동일한 산출을 낸다.
- Claude 가 소비하는 파일은 읽기 전용이다. 쓰기 대상 경로는 `constants/adapterPaths.ts` 가 선언한 상수로만 만들어진다.
- Codex hook matcher 해석은 `constants/hosts.ts` 의 단일 capability 정책을 따른다. 같은 정책이 지원하지 않는 exact tool 제거, Pre read fallback, 그리고 lint 진단을 함께 결정한다.
- 자식 fractal 은 배럴(`index.ts`)로 소비하고, organ(`types/`·`constants/`·`utils/`)은 concrete 파일을 직접 import 한다.
- 런타임 의존은 Node ≥ 20 내장 모듈뿐이다. 빌드 산출물 없이 `tsx` 로 즉시 실행한다.
- 스펙은 대상 fractal 의 `__tests__/` 에 두고 organ 하위에 새로 만들지 않는다. 이 fractal 자신의 `__tests__/` 는 정본·어댑터 경로가 CI `paths` 필터에 모두 걸리는지를 고정한다.

## API Contracts

이 fractal 의 진입점은 실행 파일 `main.ts` 하나다. 패키지는 모듈 진입을 노출하지 않으므로 외부 표면은 CLI 계약뿐이며, 호출은 루트 스크립트 `plugin:adapters`·`plugin:adapters:check` 를 거친다.

```
node --import tsx tools/plugin-compiler/src/main.ts sync [--check] [pluginDir ...]
```

- 인자: 첫 인자가 `sync` 가 아니면(빈 목록 포함) 계획을 세우지 않고 usage 를 stderr 로 쓴 뒤 exit 1. `--check` 는 위치 무관 플래그이고 디렉터리 목록에서 빠진다. 나머지 인자는 절대 경로로 resolve 되며, 존재·매니페스트 검증은 여기서 하지 않고 `planPluginAdapters` 가 진단으로 보고한다.
- 대상 선택: `pluginDir` 이 없으면 저장소 루트에서 Claude plugin manifest를 가진 플러그인 디렉터리 전부(정렬)에 루트 어댑터 계획(`planRootAdapters` — 마켓플레이스 1건)을 더한다. 하나라도 주면 그 디렉터리만 계획하고 루트 어댑터는 제외한다.
- 저장소 루트는 `main.ts` 위치 기준 `../../..` 로 고정 해석한다.
- 스트림 분리: 진단(`✗`/`⚠`)은 stderr, 파일별 액션과 `✓ sync:` 요약은 stdout. 진단이 없으면 stderr 에 아무것도 쓰지 않는다. 액션 경로는 어느 OS 에서나 저장소 상대 forward-slash 한 형식이고 `unchanged` 는 줄로 출력하지 않는다.
- exit 코드: error 수준 진단이 하나라도 있으면 1. `--check` 실행에서 `stale`·`missing` 이 있으면 1. 그 밖에는 0 이며, `--check` 없는 실행의 차이는 쓰기로 해소되므로 종료 코드에 반영되지 않는다.
- 쓰기 실패: `applyFiles` 가 도중에 실패하면 `ApplyFilesError` 를 잡아 이미 반영된 outcome 을 stdout 으로 보고하고 `apply-io-error` 진단을 stderr 로 쓴 뒤 exit 1 한다. raw stacktrace 는 사용자에게 도달하지 않는다.
- 어댑터별 생성 규칙과 진단 코드 목록은 패키지 루트 `../DETAIL.md`가 소유한다. 여기서 되풀이하지 않는다.
- Explicit MCP adaptation shares one pure validator between builders and lint. Invalid opt-in content produces its typed diagnostic before any adapter file is planned.

## Acceptance Criteria

### AC-write-target-confinement — 쓰기 대상 한정

- 계획이 만드는 쓰기 경로가 `constants/adapterPaths.ts` 상수에서만 파생되고, Claude 소비 파일은 읽기에만 쓰인다.

### AC-ci-path-filter — CI 경로 필터 커버리지

- 정본 경로 상수와 어댑터 경로 상수가 모두 `.github/workflows/ci.yml` 의 `paths` 필터에 걸린다.

### AC-codex-matcher-capabilities — Codex matcher 기능 선언

- Claude 정본의 `Skill` matcher는 보존되지만 Codex 생성물에서는 제거되고 `codex-unsupported-tool-matcher` 경고가 같은 capability 선언에서 나온다.
- 한 그룹이 `Bash|Skill`을 선언하면 Codex에는 `Bash`만 남고, 지원하지 않는 도구만 있던 그룹이나 이벤트는 사라진다.
- Pre `Read` matcher의 `Bash` fallback과 관련 진단도 같은 capability 선언을 소비하며 정본 facts를 변경하지 않는다.

### AC-seiri-mcp-surface — Canonical seiri references

- The actual canonical seiri skill tree produces an in-memory Codex tree with every owned actionable MCP address adapted, relative workflow links intact and both manifest copies routed to that complete tree.
- Canonical source bytes and exact Claude hook matchers remain unchanged; the generated Pre/Post workflow matchers use the Codex callable address.

## Last Updated

CLI 실패 보고·단방향 처리 또는 보호된 수용 계약의 범위가 바뀔 때 갱신한다.

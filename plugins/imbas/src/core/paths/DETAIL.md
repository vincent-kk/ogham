# paths — Contract

## Requirements

- 경로 조립은 `cwd` 를 접두로 쓴다 — 절대 경로 반환은 호출자가 절대 `cwd` 를 넘긴다는 계약에 의존한다.
- `project_ref` 와 `run_id` 는 단일 안전 세그먼트여야 한다. 빈 값·`.`·`..`·백슬래시·NUL 은 경로로 조립되기 전에 throw 로 거부한다 — 이 값들은 이슈 트래커와 훅 stdin 에서 오므로 신뢰 경계다.
- 파일시스템을 건드리지 않는다. 디렉터리 생성·삭제는 호출자 몫이다.

## API Contracts

- `getImbasRoot(cwd)` — `<cwd>/.imbas`.
- `getProjectDir(cwd, projectKey)` — `<root>/<segment>`. GitHub `owner/repo` 는 `owner--repo` 로 매핑된다.
- `getCacheDir(cwd, projectKey)` · `getRunsDir(cwd, projectKey)` — 프로젝트 디렉터리 하위 `cache/` · `runs/`.
- `getRunDir(cwd, projectKey, runId)` — `<runs>/<runId>`. 부적격 `runId` 는 throw.
- 배럴은 위 다섯 함수만 노출한다. `projectDirName` 은 organ 내부 단위이며 공개 표면이 아니다.

## Acceptance Criteria

### AC-segment-guard — 세그먼트 거부

- `project_ref` 가 빈 값·`.`·`..`·백슬래시·NUL 을 담으면 throw 한다.
- `run_id` 가 슬래시를 담으면 throw 한다 — 하위 경로 주입이 막힌다.

### AC-github-ref-mapping — GitHub ref 매핑

- `owner/repo` 형태의 `project_ref` 가 `owner--repo` 단일 세그먼트로 매핑된다.

## Boundary Exemptions

### utils — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: `contextInjector` 훅은 esbuild 번들로 배송되고 17KB 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅이 세그먼트 매핑을 자체 구현하는 대신 같은 함수를 직접 쓰는 편이 `.imbas/` 레이아웃을 한 곳에 묶어 둔다.

## Last Updated

2026-07-30 — 세그먼트 거부 계약과 훅 직접 import 면책을 문서화했다.

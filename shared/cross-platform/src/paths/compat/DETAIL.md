# compat — Contract

## Requirements

- 명시적 플레이버 신호(드라이브 레터·UNC·POSIX absolute)가 있는 입력은 실행 호스트와 무관하게 `path.win32` 또는 `path.posix` 로 결정적으로 처리한다. 호출자의 `process.platform` 으로 그 의미를 덮어쓰지 않는다.
- 신호가 없는 상대 경로는 host CWD 보간이 필요하므로 native `path` 에 위임한다. 이 경우 결과 separator 는 호스트 의존이다.
- Windows-like 경로 비교는 separator 정규화 후 case-insensitive, POSIX-like 는 case-sensitive 로 한다.
- public 함수는 파일당 하나만 둔다. `apiFor.ts` 는 내부 helper 이며 배럴에 노출하지 않는다.

## API Contracts

- `portableResolve` · `portableRelative` · `portableJoin` · `portableBasename` · `portableDirname` — 호스트 독립 경로 연산.
- `pathForCompare` — 비교용 separator·case 정규화.
- `samePath` — 경로 동등성 비교.
- `isWindowsLikePath` · `isPosixLikePath` — 플레이버 판별.
- `operations/` organ — 목적별 portable 연산. 패키지는 이 중 `portableBasename`·`portableDirname`·`portableJoin`·`portableResolve`·`portableIsAbsolute`·`pathForCompare` 를 `./compat/*` 서브패스로 각각 노출한다.

## Acceptance Criteria

### AC-flavor-determinism — 플레이버 결정성

- 드라이브 레터·UNC·POSIX absolute 입력이 호스트와 무관하게 같은 결과를 낸다.

### AC-compare-case-rule — 비교 case 규칙

- Windows-like 비교는 case 를 무시하고 POSIX-like 비교는 구분한다.

## Boundary Exemptions

### `operations` — Lean single-purpose entry

- **Consumers**: `**/src/hostPaths/**`, `**/src/paths/operations/**`, `**/src/configScope/**`
- **Direct import**: `allowed`
- **Reason**: 이 패키지는 concrete 파일을 서브패스로 노출하는 lean 소비를 전제한다(`paths/normalize`·`paths/relative`). 같은 이유로 패키지 내부 소비자도 필요한 한 연산만 가져간다 — `compat` 배럴을 거치면 `paths/contained` 같은 단일 목적 진입점이 플레이버 판별·비교 함수 전체를 함께 싣게 된다. `configScope/layers` 는 훅 도달 그래프에 실려 크기 가드를 받으므로 같은 제약이 걸린다.

### `portableResolve.ts` — Lean single-purpose entry

- **Consumers**: `**/src/hostPaths/**`, `**/src/paths/operations/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `portableRelative.ts` — Lean single-purpose entry

- **Consumers**: `**/src/paths/operations/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. 이 파일은 `paths/relative` 서브패스로도 직접 노출된다.

## Last Updated

2026-07-30 — 플레이버 결정성·비교 규칙 계약과 lean 진입 면책을 문서화했다.

# hostRegistry

## Purpose

"어떤 호스트가 존재하고, 각자의 좌표는 무엇인가" 의 **단일 진실원**. 호스트 이름·마커값·상태 루트 env·기본 디렉터리·훅측 판별 신호를 **데이터 테이블**로 보유한다. 소비자는 호스트 정체성으로 분기하지 않고 테이블에 좌표를 묻는다 — 호스트 추가는 새 행이지 새 `if` 가 아니다.

## Structure

| File                       | Role                                                    |
| -------------------------- | ------------------------------------------------------- |
| `index.ts`                 | barrel                                                  |
| `types.ts`                 | `Host`·`KnownHost` (정본) · `HostDescriptor`            |
| `registry.ts`              | `HOSTS` 테이블 + `HOST_MARKER_ENV` — 순수 데이터        |
| `hostFromMarker.ts`        | 마커값만으로 판별 (MCP 측). 부재=claude, 미인식=unknown |
| `resolveHostDescriptor.ts` | 마커 + 훅 신호 양쪽 판별 (상태 경로 결정용)             |

## Conventions

- **내부 의존 0** — 이것이 존재 이유다. `paths` 와 `hostPaths` 가 함께 소비해야 하는데 `hostPaths → paths` 엣지가 이미 있어, leaf 가 아니면 사이클이 된다.
- `hookSignalEnv` 는 **전부 실측 기반**이다 — Codex=un-prefixed `PLUGIN_DATA`, Claude=`CLAUDE_` 접두만(따라서 신호 없음), agy=`ANTIGRAVITY_CONVERSATION_ID`(1.1.5 에서 agy 가 추가하는 유일한 변수). 추정으로 채우지 않는다.
- 상태 디렉터리가 미실측인 호스트는 claude 채널을 **명시적으로 차용**한다 (`CLAUDE_STATE_CHANNEL` 공유) — 분기 부재가 아니라 테이블 위의 결정으로 남긴다.
- 마커가 있으면 **훅 신호 패스를 억제**한다 — 마커는 진술, 훅 신호는 추론이라 둘이 결합해 아무도 지명하지 않은 호스트가 나오면 안 된다.
- `hookSignalEnv` 는 **신호이지 위치가 아니다** — 존재 여부만 읽고 값(호스트 관리 data dir)은 의도적으로 버린다. 근거는 `../paths/INTENT.md`.
- `unknown` 은 행이 아니라 **매칭 실패**다. 부재 신호는 `null` 명시가 아니라 **필드 생략**. 이 테이블은 훅 번들에 실리므로 행은 lean 하게 유지한다 (필드 1개 = 모든 훅 콜드스타트 비용).

## Boundaries

### Always do

- 호스트 이름 문자열·호스트별 env 이름은 **이 모듈 안에서만** 리터럴로 등장한다.
- 새 호스트는 `HOSTS` 에 행을 추가해 도입한다.

### Ask first

- 새 호스트 행 추가, 기존 행의 `stateRootDir` 변경 (사용자 상태 고아화 위험).
- `hookSignalEnv` 를 실측 없이 채우기.

### Never do

- 내부 모듈 import 추가 (leaf 불변식 파괴 → 사이클).
- 파일 I/O · `process` 직접 읽기 — env 는 인자로 받는다.

## Dependencies

- 내부: 없음 (leaf).
- 외부: 없음 (Node 내장조차 불필요 — 순수 데이터 + 순수 함수).

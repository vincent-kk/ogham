## Purpose

OS별 home/tmp/config/cache, 명시적 호스트 상태 루트, Windows/POSIX 경로
문자열 연산의 단일 진입점이다.

## Structure

| Path          | Role                        |
| ------------- | --------------------------- |
| `index.ts`    | package root 재노출용 배럴  |
| `paths.ts`    | 객체형 convenience facade   |
| `state/`      | host·cache 상태 경로 organ  |
| `operations/` | normalize·containment organ |
| `compat/`     | portable 경로 연산          |

## Conventions

- 외부 OS별 config/cache 위치는 `env-paths`에 위임한다.
- 호스트 좌표는 `hostRegistry`의 행을 읽고 여기서 중복 선언하지 않는다.
- `pluginCache`는 기존 런타임 호스트 판별을 유지하되, 새 호출자는 가능하면
  명시적 `hostStateRoot(host, env)`를 사용한다.
- containment는 절대 세그먼트와 모든 `..` 구성 요소를 입력 단계에서 거부한다.
- 외부 hook도 path 심볼을 `@ogham/cross-platform` 루트에서만 import한다.
- `sideEffects: false` tree-shaking 뒤 emitted byte cap과 `FORBIDDEN_PATTERNS`
  출력 검사로 hook 격리를 검증한다.
- 패키지 내부 sibling은 좌표 소유권을 유지하려고 concrete operation을 직접 쓴다.

## Boundaries

### Always do

- 사용자 상태 루트는 해당 호스트의 relocation env를 우선한다.
- 이식 가능한 경로 입력은 `compat/` 연산으로 처리한다.
- containment 결과는 루트의 descendant인지 다시 확인한다.
- package root의 이름 있는 path export와 소유 함수의 의미를 동일하게 유지한다.

### Ask first

- 호스트 기본 상태 디렉터리나 plugin cache 컨벤션 변경.
- `env-paths` 외 위치 결정 라이브러리 채택.

### Never do

- 호출 측에서 `os.homedir()`나 호스트 상태 경로를 하드코딩.
- 상대 프로젝트 루트 또는 root 밖 결과를 반환.

## Dependencies

- 내부: `hostRegistry`, `compat`.
- 외부: `env-paths`, Node `os`/`path`.

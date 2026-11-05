# compat — Contract

## Requirements

- 명시적 플레이버 신호(드라이브 레터·UNC·POSIX absolute)가 있는 입력은 실행 호스트와 무관하게 `path.win32` 또는 `path.posix` 로 결정적으로 처리한다. 호출자의 `process.platform` 으로 그 의미를 덮어쓰지 않는다.
- 신호가 없는 상대 경로는 host CWD 보간이 필요하므로 native `path` 에 위임한다. 이 경우 결과 separator 는 호스트 의존이다.
- Windows-like 경로 비교는 separator 정규화 후 case-insensitive, POSIX-like 는 case-sensitive 로 한다.
- public 함수는 파일당 하나만 둔다. `operations/apiFor.ts` 는 내부 helper 이며 배럴에 노출하지 않는다.

## API Contracts

외부 소비자는 패키지 루트를 사용한다. 내부 재사용을 허용하는 범위와 이유는 아래 Boundary Exemptions가 정한다. 구체적인 공개 심볼과 타입은 진입점에서 확인한다.

## Acceptance Criteria

### AC-root-output-isolation — 루트 공개 주소와 출력 격리

- 외부 import 주소는 `@ogham/cross-platform` 하나다.
- hook 번들은 `sideEffects: false` tree-shaking 뒤 emitted byte cap과
  `FORBIDDEN_PATTERNS` 출력 검사를 통과한다.

## Boundary Exemptions

### `operations` — 내부 portable 연산 소유권 유지

- **Consumers**: `**/src/hostPaths/**`, `**/src/paths/operations/**`, `**/src/configScope/**`
- **Direct import**: `allowed`
- **Reason**: `hostPaths`·`paths/operations`·`configScope` 는 같은 패키지
  안에서 portable 플레이버 판정을 재사용한다. 그 로직의 소유권을 이 fractal 에
  유지하고 패키지 구현이 자기 공개 루트를 역참조하지 않도록 concrete operation 을
  직접 가져온다. 외부 소비자는 패키지 루트만 사용하며, hook 격리는
  `sideEffects: false` tree-shaking 뒤 emitted output 가드로 검증한다.

## Last Updated

경로 플레이버·비교 규칙 또는 내부 재사용 예외의 범위가 바뀔 때 갱신한다.

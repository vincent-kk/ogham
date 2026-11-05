# src — Contract

## Requirements

- **볼트 접근은 읽기 전용이다.** 볼트 파일시스템에 쓰지 않고 maencof 의 mutation 핸들러를 호출하지 않는다.
- 레이어 필터는 설정된 레이어와 요청 레이어의 교집합으로 결정한다 — 요청이 설정 범위를 넓히지 못한다.
- `@ogham/maencof` 의 handler·타입을 공유하며 alias 가 `../maencof/src` 로 해석된다. 이 경계는 additive 로만 바꾼다 — maencof 배럴에서 심볼을 빼면 이 패키지가 깨진다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다(번들 크기 가드).
- `version.ts` 는 생성물이며 직접 수정하지 않는다.

## API Contracts

- 실행 표면은 생성 번들이며 소스 배럴은 라이브러리 심볼만 노출한다. MCP를 루트에서 재노출하면 서버의 생성 버전 참조가 루트로 돌아오는 순환이 된다.

## Acceptance Criteria

### AC-read-only-vault — 읽기 전용

- 볼트 경로에 대한 쓰기 호출이 0건이다.
- maencof 의 mutation 핸들러를 import 하지 않는다.

### AC-no-barrel-cycle — 배럴 순환 부재

- `src/index.ts` 가 `mcp/` 를 재노출하지 않는다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp/server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

소스 계층·생성 버전·공개 배럴 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.

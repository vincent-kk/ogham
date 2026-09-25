# src — Contract

## Requirements

- 규칙 본문은 하니스가 로드합니다. 훅은 명시적 작업 참여의 ACK와 관측된 검증·실패 변화만 전달하며 전역 상태 배너를 보내지 않습니다.
- 어떤 훅도 차단하지 않는다. 신호는 제안이고 판정은 모델이 한다.
- off/advisory는 신규 관측과 주입을 하지 않습니다. 신뢰되는 경계는 기존 참여만 무효화할 수 있으며 무주입 결과의 wire stdout은 비어 있습니다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다. esbuild 가 배럴의 재노출 그래프 전체를 번들에 끌어오고 `build:hooks` 의 크기 가드가 이를 빌드 실패로 막기 때문이다 — typecheck 는 이 비대를 잡지 못한다.
- 상태의 진실은 파일시스템이 소유한다. 규칙 배포 상태를 config 에 미러링하지 않는다.
- `version.ts` 는 자동 생성 파일이며 직접 수정하지 않는다.

## API Contracts

- 배포 진입점은 esbuild 산출물이다: MCP 서버(`bridge/mcp-server.cjs`, 원본 `mcp/serverEntry/`)와 훅 번들 6종(`bridge/*.mjs`).
- `src/index.ts` 는 named re-export 만 담는 공개 배럴이다.
- 배포 compile은 dist의 JavaScript와 선언 파일을 실제 생성하여 package exports를 충족합니다. 상위 typecheck용 noEmit 설정은 build에서 해제합니다.
- 게이트의 `CHECK` 는 실제 결과 조건을 검사하는 명령이고 `EXPECT` 는 조건 충족 시에만 관측되는 리터럴 성공 문자열이다. 결과 조건의 값은 저장소와 계획이 소유한다.
- 소유 상태는 넷이다: 개입 강도 다이얼(`core/infra/configLoader`), 호스트 규칙 배포 상태(`core/ruleDocs`), 세션 스코프 신호(`core/sessionSignals`), 작업 상태(`core/gates`).

## Acceptance Criteria

### AC-no-rule-injection — 규칙 본문 비주입

- 어떤 훅 출력에도 규칙 문서 본문이 실리지 않는다.
- 훅은 전역 스킬 선출이나 규칙 상태를 보고하지 않고 활성 작업의 ACK·증거·실패 변화만 제공합니다.

### AC-hook-non-blocking — 비차단

- 모든 훅이 차단 결정을 반환하지 않는다.
- `off`와 모든 no-op 경로의 entry stdout이 비어 있고 exit 0을 유지한다.

### AC-hook-bundle-size — 번들 크기 가드

- `build:hooks` 의 바이트 캡을 넘는 번들이 생기지 않는다.
- 호출 귀속·actor 원자 상태·원장 판정을 함께 수행하는 post-tool-use는 호스트별 약 19.5KiB 실측을 수용하는 20KiB 상한입니다. 나머지는 16KiB를 유지하며 금지 의존 검사도 유지합니다. 추가 이벤트 프로세스나 분리용 추상화 비용을 피하기 위한 명시적 예외입니다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## History

- 2026-09-05 — 게이트 타입의 EXPECT를 리터럴 성공 문자열로 한정했다. 결과 조건은 CHECK가 검사하여 저장소 정규식을 훅에서 실행하지 않는다.

## Last Updated

2026-09-26 — 명시적 조건부 참여와 비차단 호스트 계약을 반영했습니다.

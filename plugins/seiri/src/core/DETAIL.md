# core — Contract

## Requirements

- core 는 **진실을 소유하지 않는다.** 코드가 옳은지는 저장소(테스트·CI·CLAUDE.md)가 답하고, 여기는 맥락만 다룬다.
- 소유 상태는 넷이다: 개입 강도 다이얼, 호스트 규칙 배포 상태, actor 스코프 참여, 작업 상태.
- 각 상태의 진실은 그 상태를 담는 곳에 있다 — 규칙 배포는 파일시스템, 다이얼은 설정 파일, 세션 신호는 세션 파일, 작업 상태는 작업 원장이다. 사본을 만들지 않는다.
- 훅 도달 코드는 이 계층의 배럴이 아니라 concrete 파일을 직접 import 한다(번들 크기 가드).

## API Contracts

다이얼·배포·actor 참여·작업 증거는 각각 소유 저장소를 가지며 서로의 상태를 미러링하지 않는다. 공개 함수 목록은 진입점에서 확인한다.

## Acceptance Criteria

### AC-core-no-truth-ownership — 진실 비소유

- core 안에 코드 품질 판정 로직이 없다.
- 규칙 배포 상태가 config 파일에 미러링되지 않는다.

### AC-core-atomic-writes — 원자적 쓰기

- 상태 파일 쓰기가 `writeAtomically` 를 거친다.
- `.seiri/` 생성이 `ensureSeiriDir` 를 거쳐 `.gitignore` 를 동반한다.

## Boundary Exemptions

### utils — Bundle-guarded consumers reach concrete files

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 통과할 수 없다 — esbuild 가 배럴이 재노출하는 그래프 전체를 끌어오고 `build:hooks` 의 바이트 캡이 이를 빌드 실패로 막는다. 검증 파일은 검사 대상 단위에 직접 닿아야 하며, 테스트 하나 때문에 공개 표면을 넓히지 않는다.

## Last Updated

상태 소유권과 공통 경계 계약의 내용과 근거가 바뀔 때 갱신한다.

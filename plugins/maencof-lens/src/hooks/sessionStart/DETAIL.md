# sessionStart — Contract

## Requirements

- 세션 시작에 등록된 볼트와 사용 가능한 스킬을 한 번 알린다. 볼트 내용을 주입하지 않는다 — 무엇을 쓸 수 있는지만 말한다.
- **세션을 차단하지 않는다.** 설정 부재·볼트 미준비·환경 탐지 실패 어느 경우에도 정상 종료한다.
- 배럴을 거치지 않고 concrete 파일을 직접 import 한다(번들 크기 가드).
- 읽기 전용이다 — 볼트와 설정에 쓰지 않는다.

## API Contracts

- SessionStart 처리 — 환경 자가진단 → 설정 감지 → 볼트 상태 → 가이드 또는 advisory 조립.
- `probe/` — **spawn 없는** 환경 진단(organ). `process.versions`·`env` 만 보고 외부 프로세스를 띄우지 않는다.

## Acceptance Criteria

### AC-session-never-blocked — 비차단

- 설정이 없거나 볼트가 준비되지 않아도 세션이 진행된다.
- 환경 탐지 실패가 주입을 막지 않는다.

### AC-vault-content-not-injected — 볼트 내용 비주입

- 주입 문자열에 볼트 문서 본문이 없다.

### AC-probe-environment — 환경 탐지

- 탐지 결과가 주입 내용(준비 상태·경로 표기)에 반영된다.

## Last Updated

2026-07-30 — SessionStart 주입 계약을 문서화했다.

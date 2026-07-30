# commandGate — Contract

## Requirements

- R 스크립트는 실행 전 정적으로 검사한다 — 금지 호출 목록(프로세스 기동·네트워크·파일시스템 탈출)에 걸리면 실행 자체를 만들지 않는다.
- 점 표기로 우회한 이름(`shell.exec` 등)도 같은 금지 대상으로 판정한다.
- 발견된 금지 호출은 첫 건에서 멈추지 않고 서로 다른 항목을 모두 보고한다.
- 설치 명령은 화이트리스트에 있는 것만 해석한다.
- 통계 타당성은 판단하지 않는다 — 실행 안전만 본다.

## API Contracts

- `validateRScript(scriptCode: string): RScriptValidation` — `FORBIDDEN_R_CALLS` word-boundary 정적 검사 결과. 위반이 있으면 발견된 호출 전체를 `blockedCalls` 로 담는다.
- `validateCommand(command: string): boolean` — 명령 베이스가 승인된 설치 바이너리인지 판정한다.
- `resolveInstaller(manager: string): InstallerCommand` — 패키지 매니저 이름을 `INSTALLER_COMMANDS` 의 고정 인자 명령으로 매핑한다. 임의 인자는 주입할 수 없다.

## Acceptance Criteria

### AC-forbidden-call-block — 금지 호출 차단

- 통계 계산만 하는 스크립트는 통과한다.
- 프로세스를 띄우는 호출은 차단한다.
- 점이 섞인 이름(`shell.exec`)도 차단한다.
- 서로 다른 금지 호출이 여러 개면 모두 보고한다.

## Last Updated

2026-07-30 — 정적 게이트 계약을 문서화했다.

## Purpose

명령어·스크립트 게이트 모듈. 실행될 R 코드를 정적 스캔해 금지 호출(프로세스 스폰·삭제·동적 설치·원격 source·네트워크 클러스터·함수 리플렉션 조회)을 **best-effort** 차단하고, setup 설치 명령을 승인된 패키지 매니저 호출로만 제한한다. 정적 게이트는 임의 파일 쓰기·dual-use URL 리더를 완전 봉쇄하지 못하며(OS 격리 미채택 — 잔여 위험 수용; 시크릿 env 노출은 buildRunEnv allowlist가 차단), cwd·env 격리로 blast radius 를 축소한다. 실행 안전 전용 — 통계 정책은 평가하지 않는다.

## Structure

| File                             | Role                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `operations/validateRScript.ts`  | 금지 R 호출 정적 스캔(`<call>(` word-boundary 매칭)        |
| `operations/resolveInstaller.ts` | 패키지 매니저 → 승인된 R 설치 명령(winget/choco/brew) 매핑 |
| `operations/validateCommand.ts`  | 명령 베이스가 승인 설치 바이너리인지 화이트리스트 확인     |
| `index.ts`                       | barrel                                                     |

## Conventions

- 금지 호출 목록은 `FORBIDDEN_R_CALLS` 단일 출처
- 설치 명령은 `INSTALLER_COMMANDS` 의 고정 인자만 — 임의 인자 주입 불가
- 매칭은 정규식 word-boundary + 이스케이프 (`install.packages` 등 점 포함)

## Boundaries

### Always do

- 금지 호출 발견 시 `blockedCalls` 로 모두 보고
- 설치 명령은 승인 매핑에서만 생성

### Ask first

- 금지 호출 목록 변경
- 새 패키지 매니저 추가

### Never do

- 통계 가정·기법 적합성 평가 (assert_analysis_plan 소관)
- 임의 셸 명령 생성·실행

## Dependencies

- `../../constants/defaults`, `../../constants/messages`

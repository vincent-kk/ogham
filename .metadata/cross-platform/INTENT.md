## Purpose

`@ogham/cross-platform` 도입을 통한 Windows-Unix 호환성 작업의 단일 진실 소스. 6개 플러그인 패키지의 spawn/PATH/EOL/경로/타임아웃 결함을 한 곳에서 분석·계획·추적.

## Structure

| File                                  | Role                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `PLAN.md`                             | 인벤토리 → 카테고리 → 시스템 설계 → PR 분할 → 합격 기준          |
| `bug-windows-cogair-checkexec.md`     | cogair `checkExecutable` 1차 진단 (재현 절차 포함)               |
| `bug-windows-cogair-comprehensive.md` | cogair Windows 종합 (provider 감지 / 디스패치 / 타임아웃 3 증상) |
| `bug-windows-maencof-hook.md`         | maencof SessionStart 페르소나 미주입 (hook silent failure)       |

## Conventions

- 결정 변경은 `PLAN.md` Part 8 직접 수정.
- 신규 버그 리포트는 `bug-windows-<pkg>-<topic>.md` 컨벤션으로 추가.
- 영향 받는 패키지 INTENT.md Purpose 라인에서 본 디렉토리를 link.

## Boundaries

### Always do

- PR 작업 전 `PLAN.md` Part 5 (PR 분할표) 확인.
- 결정 변경 시 `PLAN.md` 와 본 INTENT 모두 갱신.

### Ask first

- 새 카테고리 (C9+) 추가 또는 기존 카테고리 폐기.
- PR 분할표의 순서 / 의존 변경.

### Never do

- 본 디렉토리 외부에 cross-platform 관련 ad-hoc 문서 생성.
- 결정 사항을 코드 주석에 inline 으로 분산 기록.

## Dependencies

- 의존 패키지: cogair, filid, maencof, maencof-lens, imbas, atlassian.
- 신설 워크스페이스: `shared/cross-platform/` (PR-A 부터).

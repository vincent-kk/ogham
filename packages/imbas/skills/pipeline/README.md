# pipeline

imbas 전체 파이프라인을 단일 명령으로 끝까지 실행하는 오케스트레이션 스킬.

## 개요

validate → split → manifest-stories → devplan → manifest-devplan 전체 흐름을
하나의 `/imbas:pipeline` 명령으로 자동 실행한다.
각 단계 사이에 품질 게이트(auto-approval)를 두어, 통과 시 자동 진행하고 실패 시 구조화된 블로커 리포트를 출력한다.

## 두 가지 모드

| 모드 | 입력 | 실행 단계 |
|------|------|-----------|
| **Mode A: Document Pipeline** | 문서 경로 또는 Confluence URL | validate → split → manifest-stories → devplan → manifest-devplan |
| **Mode B: Devplan Pipeline** | Jira Story 키 (PROJ-42,PROJ-43) | devplan → manifest-devplan |

## 사용법

```
/imbas:pipeline <source-or-stories> [options]

--project      : Jira 프로젝트 키 (config 오버라이드)
--supplements  : 보충 자료 경로
--parent       : 부모 Epic 키 / "new" / "none"
--stop-at      : 특정 단계 후 중지 (validate|split|manifest-stories|devplan)
--dry-run      : 미리보기만 (Jira 쓰기 없음)
```

## 품질 게이트

| 게이트 | 자동 통과 조건 | 중지 조건 |
|--------|---------------|-----------|
| **GATE 1** (Validate) | PASS 또는 PASS_WITH_WARNINGS | BLOCKED (blocking_issues > 0) |
| **GATE 2** (Split) | 이스케이프 없음, 매니페스트 유효, 모든 검증 통과 | 이스케이프 코드, 검증 실패 |
| **GATE 3** (Devplan) | 매니페스트 유효, needs_review 없음 | 매니페스트 오류, needs_review |
| **GATE 4** (Execution) | 비블로킹 (이미 생성된 항목은 되돌릴 수 없음) | Phase 2.5 실패는 블로킹 |

## 리포트 종류

- **Stopped Report**: 게이트 실패 시 — 사유, 상세, 경고, 재개 옵션
- **Complete Report**: 전체 성공 시 — 결과 테이블, 생성된 이슈, 노트
- **Dry-Run Report**: `--dry-run` 시 — 실행 미리보기
- **Progress Report**: `--stop-at` 시 — 완료 단계, 재개 명령

## 사용 에이전트

| 에이전트 | 모델 | 단계 | 역할 |
|----------|------|------|------|
| `imbas-analyst` | sonnet | Phase 1 | 문서 검증 |
| `imbas-planner` | sonnet | Phase 2 | Story 분할 |
| `imbas-analyst` | sonnet | Phase 2 | 역추론 검증 |
| `imbas-engineer` | opus | Phase 3 | 개발 계획 생성 |

## 참고 파일

- `references/workflow.md` — 전체 워크플로우 상세 (Phase 0~3.5)
- `references/auto-approval-gates.md` — 게이트 자동 승인 조건
- `references/blocker-report.md` — 리포트 형식
- `references/errors.md` — 에러 처리 및 복구
- `references/tools.md` — 사용 도구 및 에이전트 상세

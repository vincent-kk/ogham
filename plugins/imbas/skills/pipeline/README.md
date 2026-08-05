# pipeline

imbas 파이프라인 전체(refine → estimate → split)를 한 명령으로 자동 실행한다.

## 개요

기획 문서 하나를 입력받아 재구조화·검증(refine), manday 추산(estimate), 이슈 분할·생성(split)을 자동 승인 게이트와 함께 연속 실행한다. 게이트가 하나라도 실패하면 즉시 구조화된 blocker 리포트와 재개 명령을 남기고 멈춘다.

## 사용법

```
/imbas:pipeline <source> [--project KEY] [--supplements PATHS] [--parent KEY|new|none]
                [--skip-estimate] [--stop-at refine|estimate] [--dry-run] [--strict-drift]
```

- `--skip-estimate` — 추산 단계를 건너뛴다 (state에 skipped 기록)
- `--stop-at` — refine 또는 estimate까지만 실행 (생성 없는 기획·견적 모드)
- `--dry-run` — 분할·매니페스트 저장까지 수행하고 생성은 미리보기로 종료
- `--strict-drift` — 생성 전 drift 발견 시 자동 해소 대신 중단

## 게이트

| 게이트 | 판정                                                       |
| ------ | ---------------------------------------------------------- |
| GATE 1 | refine 결과 PASS/PASS_WITH_WARNINGS → 진행, BLOCKED → 중단 |
| GATE 2 | estimation 매니페스트 무결성 검증 통과 → 진행              |
| GATE 3 | 전 Story 검증 필드 PASS + 매니페스트 유효 → 생성 자동 승인 |
| GATE 4 | 전 항목 생성 성공 → 완료 리포트, 실패 → 재시도 안내 중단   |

## 참고 파일

- `references/workflow.md` — Phase 0–3 오케스트레이션
- `references/auto-approval-gates.md` — 게이트 기준
- `references/blocker-report.md` — 중단/완료 리포트 템플릿
- `references/tools.md` — 도구·에이전트 표
- `references/errors.md` — 에러와 재개 안내

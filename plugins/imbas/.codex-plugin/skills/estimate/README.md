# estimate

imbas 파이프라인 Phase 2(선택). 재구조화된 기획서를 3뷰로 분해해 manday와 개발 일정을 산출한다.

## 개요

`refined.md`만을 입력으로 — 코드베이스는 읽지 않는다 — 페이지/기능/모듈 3개 관점에서 제품을 분해하고, 교차 대조(reconciliation)로 단일 WBS를 만든 뒤, 단위별 복잡도(S/M/L/XL)와 3점 추정(PERT)으로 manday를 계산한다. 의존성 기반으로 팀 규모만큼의 병렬 트랙에 배치해 주 단위 일정과 마일스톤까지 산출한다. 무거운 분석 전체는 `estimator` 서브에이전트에 격리된다.

## 사용법

```
/imbas:estimate [--run <run-id>] [--team-size <N>] [--buffer <ratio>]
```

계수 기본값은 `config.estimation`(user/project 계층)이 결정하며, CLI 오버라이드는 해당 런에만 적용되고 `config_used`에 기록된다.

## 원칙

1. **코드 미접근** — 추정 근거는 기획서 문장과 계수뿐
2. **가정 전부 명시** — 문서가 답하지 않은 것은 `assumptions`에 기록
3. **불확실성 표기** — 단일 숫자가 아닌 신뢰 구간(E ± 2σ)
4. **재현 가능** — 같은 입력이면 같은 구조의 WBS

## 출력

- `estimation.json` — 스키마 검증된 추산 매니페스트 (`manifest_save`)
- `estimation-report.md` — 요약·WBS 표·gantt·가정·리스크·single-view 확인 목록

split이 `estimation.json`을 읽어 Story별 `estimate_manday`를 병기한다.

## 참고 파일

- `references/method.md` — 3뷰 분해·reconciliation·PERT·일정 배치 규칙
- `references/workflow.md` — 워크플로우 상세
- `references/output-schema.md` — estimation.json 계약
- `references/errors.md` — 에러 처리

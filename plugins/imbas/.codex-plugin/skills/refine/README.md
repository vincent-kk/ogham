# refine

imbas 파이프라인 Phase 1. 기획 문서를 표준 섹션 구조로 재구조화하고 모순, 괴리, 누락, 논리적 불가능성을 검증한다.

## 개요

기획 문서(로컬 마크다운 또는 Confluence 페이지)를 `analyst` 에이전트가 5가지 관점에서 검증하고, 통과 시 표준 섹션 구조의 `refined.md`로 재편한다. `refined.md`가 이후 단계(estimate, split)의 정본 입력이 되며, 검증 결과가 파이프라인 진입을 게이트한다. 원본은 수정하지 않는다.

## 사용법

```
/imbas:refine <source> [--project <KEY>] [--supplements <path,...>]

<source>       : 기획 문서 경로 (로컬 md/txt) 또는 Confluence URL
--project      : 프로젝트 키 (config 오버라이드)
--supplements  : 보충 자료 경로 (쉼표 구분)
```

## 5가지 검증 유형

| 유형                            | 설명                                     |
| ------------------------------- | ---------------------------------------- |
| **모순 (Contradictions)**       | 문서 내 상충되는 요구사항                |
| **괴리 (Divergences)**          | 목표와 세부사항 간 불일치                |
| **누락 (Omissions)**            | 언급되었으나 정의되지 않은 항목          |
| **불가능성 (Infeasibilities)**  | 기술적/논리적으로 실현 불가능한 요구사항 |
| **테스트 가능성 (Testability)** | 측정 가능한 수용 기준이 없는 요구사항    |

각 이슈는 **BLOCKING** 또는 **WARNING**으로 분류된다.

## 재구조화 표준 섹션

`refined.md`는 배경 / 목표 / 범위 / 유저 플로우 / 기능 명세 / 정책 / 인수 기준 / 비범위 8개 섹션으로 재편된다. 요구사항의 의미는 보존하고 재배치·중복 제거·제목화만 수행하며, 불명확한 항목은 `> [unclear]` 마커로 원문을 인용해 남긴다.

## 결과 판정

| 결과                   | 조건                           | 다음 단계                            |
| ---------------------- | ------------------------------ | ------------------------------------ |
| **PASS**               | BLOCKING 0건, WARNING 0건      | estimate(선택) 또는 split 진행 가능  |
| **PASS_WITH_WARNINGS** | BLOCKING 0건, WARNING 1건 이상 | estimate/split 진행 가능 (경고 표시) |
| **BLOCKED**            | BLOCKING 1건 이상              | 진행 불가 (refined.md 미생성)        |

## 출력

- `refined.md` → `.imbas/<KEY>/runs/<run-id>/refined.md`
- `validation-report.md` → `.imbas/<KEY>/runs/<run-id>/validation-report.md`

## 참고 파일

- `references/workflow.md` — 워크플로우 상세
- `references/state-transitions.md` — 상태 전이
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세

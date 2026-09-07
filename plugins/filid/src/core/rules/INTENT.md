# rules -- 규칙 엔진 모듈

## Purpose

15개 내장 FCA-AI 규칙의 정의·평가와 INTENT/DETAIL 문서 계약 검증, 노드 단위 구조 검증을 소유한다.

## Structure

| 모듈                | 역할                                       |
| ------------------- | ------------------------------------------ |
| `ruleEngine`        | 15개 내장 규칙 로딩, 평가, 오버라이드 적용 |
| `fractalValidator`  | 구조 유효성 검증, 의존성 검증              |
| `documentValidator` | INTENT.md/DETAIL.md 유효성 검증            |

## Conventions

- 규칙 roster는 정확히 15개다. 새 규칙은 단일 로더에 명시적으로 등록하고 ID는 canonical built-in 집합에서 가져온다.
- 규칙 하나의 판정은 관심 증거별 단일 check가 담당한다.
- thrown check와 unsupported·indeterminate 증거는 PASS가 아니라 finding으로 변환한다. 확실성을 통과로 바꾸지 않는 것이 이 모듈의 핵심 계약이다.
- severity override와 면제는 각각 하나의 중앙 단계에서만 적용한다.

## Boundaries

### Always do

- 새 규칙은 `ruleEngine/evaluation/loadBuiltinRules.ts`에 등록
- 형제 fractal은 entry point로만 소비

### Ask first

- 내장 규칙 임계값 변경
- 규칙 roster 증감 또는 규칙 ID 변경

### Never do

- 규칙 평가에서 파일 수정
- indeterminate·unsupported를 PASS로 승격

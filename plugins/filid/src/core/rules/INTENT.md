# rules -- 규칙 엔진 모듈

## Purpose

15개 내장 FCA-AI 규칙 정의, 평가와 INTENT/DETAIL 문서 유효성 검증을 수행한다.

## Structure

| 모듈                | 역할                                       |
| ------------------- | ------------------------------------------ |
| `ruleEngine`        | 15개 내장 규칙 로딩, 평가, 오버라이드 적용 |
| `fractalValidator`  | 구조 유효성 검증, 의존성 검증              |
| `documentValidator` | INTENT.md/DETAIL.md 유효성 검증            |

## Boundaries

### Always do

- 새 규칙은 `ruleEngine/evaluation/loadBuiltinRules.ts`에 등록

### Ask first

- 내장 규칙 임계값 변경

### Never do

- 규칙 평가에서 파일 수정

## Dependencies

- `../tree/`, `../../types/`

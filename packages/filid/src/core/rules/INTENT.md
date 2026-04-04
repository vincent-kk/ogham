# rules -- 규칙 엔진 모듈

## Purpose

8개 내장 FCA-AI 규칙 정의, 평가, 문서 유효성 검증, 드리프트 감지를 수행한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `rule-engine` | 내장 규칙 로딩, 평가, 오버라이드 적용 |
| `fractal-validator` | 구조 유효성 검증, 의존성 검증 |
| `document-validator` | INTENT.md/DETAIL.md 유효성 검증 |
| `drift-detector` | 규칙 위반 기반 드리프트 감지 및 동기화 계획 생성 |

## Boundaries

### Always do
- 새 규칙은 `rule-engine.ts`의 `loadBuiltinRules`에 등록

### Ask first
- 내장 규칙 임계값 변경

### Never do
- 규칙 평가에서 파일 수정

## Dependencies
- `../tree/`, `../utils/`, `../../types/`

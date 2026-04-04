# compress -- 컨텍스트 압축 모듈

## Purpose

에이전트 컨텍스트 윈도우 최적화를 위한 문서 압축 기능을 제공한다. 가역 압축과 손실 요약 두 가지 전략을 지원한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `reversible-compactor` | 가역 압축 (복원 가능한 참조 기반 압축) |
| `lossy-summarizer` | 손실 요약 (도구 호출 히스토리 요약) |

## Boundaries

### Always do
- 압축 함수는 순수 함수로 유지

### Ask first
- 새로운 압축 전략 추가

### Never do
- 외부 모듈 직접 import

## Dependencies
- `../types/`

# context-injector

## Purpose
UserPromptSubmit hook. 프롬프트에 imbas 컨텍스트 정보 주입.

## Boundaries
### Always do
- constants에서 파일명/경로 참조
### Ask first
- 주입 컨텍스트 항목 변경
### Never do
- 순환 의존성 도입

# context-injector

## Purpose

UserPromptSubmit 훅. 사용자 프롬프트에 지식 컨텍스트 주입.

## Boundaries

### Always do

- cache-manager에서 캐시 읽기
- turn-context-builder로 컨텍스트 구성

### Ask first

- 주입 포맷 변경

### Never do

- 사용자 프롬프트 원문 수정

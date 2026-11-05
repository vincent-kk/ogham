## Purpose

외부 API 어댑터 계층. 현재는 NCBI E-utilities 어댑터(`eutils/`) 단일 프랙탈. mcp 도구가 이 배럴로 어댑터를 사용한다.

## Conventions

- 어댑터는 `core/httpClient`만으로 네트워크 수행. 응답 파서는 순수 함수로 분리·export.
- 단일 호스트 범위(eutils + PMC utils)만 다룬다.

## Boundaries

### Always do

- 새 외부 API는 별도 어댑터 프랙탈로 추가(한 API=한 어댑터).

### Ask first

- 비NCBI 소스 어댑터 추가(형제 plugin 범위와 충돌 여부).

### Never do

- core/types/constants 외 상위 레이어 import.

# src — Atlassian 소스 경계

## Purpose

Atlassian 플러그인의 소스 루트다. MCP 도구와 공통 인프라, 포맷 변환, Jira 도메인 레시피 경계를 소유한다.

## Conventions

- 모든 exports는 barrel `index.ts`를 통해 노출
- Zod 스키마는 types 계층 organ에만 정의
- camelCase 파일명, ESM `.js` 확장자 import

## Boundaries

### Always do

- 새 공개 모듈은 배럴 `index.ts`를 통해 노출
- 검증에는 types 계층의 Zod 스키마 사용

### Ask first

- 새 fractal 추가
- 외부 의존성 추가

### Never do

- types 계층 밖에 Zod 스키마 정의
- 요청·설정·자격증명을 모듈 전역에 저장하지 않는다. 배포 중 불변인 설정 HTML의 지연 캐시만 허용해 반복 디스크 읽기를 피한다.
- MCP 도구 응답에 자격증명 노출

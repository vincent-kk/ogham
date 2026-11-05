

## Purpose

로컬 설정 서버가 서빙하는 독립 브라우저 자산의 정본을 소유한다. 서버 동작은 이 계층에서 구현하지 않는다.

## Conventions

- 순수 정적 파일 (HTML/CSS/JS) — 서버 코드는 `src/mcp/tools/projectSetup/openSettings/` 에만 위치
- 빌드가 페이지별 단일 HTML 로 인라인 번들해 `public/` 에 넣는다 — 커밋되는 생성물이라 손편집하지 않는다
- 페이지는 TypeScript 소스를 import 하지 않는 독립 스크립트

## Boundaries

### Always do

- 새 페이지 추가 시 `settings/` 와 동일한 골격 (마크업 파일 + 스크립트 디렉터리 + 스타일 디렉터리) 준수

### Ask first

- 새 페이지 디렉토리 추가 (서버 라우트·빌드 스크립트 동반 확장)

### Never do

- 페이지에서 npm import 또는 빌드 스텝 의존 코드 작성
- 서버 측 로직을 pages 하위에 배치

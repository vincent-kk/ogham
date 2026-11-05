## Purpose

MCP 서버가 로컬 HTTP 로 서빙하는 브라우저 페이지의 프런트엔드 소스 루트. 현재 `settings/` (설정 페이지) 단일 페이지를 보유한다.

## Structure

빈 배럴은 정적 자산의 경계만 표시한다. 소비자는 TypeScript 심볼 대신 빌드된 HTML을 읽는다.

## Conventions

- 순수 정적 파일 (HTML/CSS/JS) — 서버 코드는 openSettings 도구가 소유
- 공식 페이지 빌드로 단일 HTML을 생성한다. 별도 자산 라우트 없이 서빙하기 위한 구조다.
- 페이지는 TypeScript 소스를 import 하지 않는 독립 스크립트

## Boundaries

### Always do

- 새 페이지도 마크업·독립 스크립트·스타일을 인라인하는 구조를 준수

### Ask first

- 새 페이지 디렉토리 추가 (서버 라우트·빌드 스크립트 동반 확장)

### Never do

- 페이지에서 npm import 또는 빌드 스텝 의존 코드 작성
- 서버 측 로직을 pages 하위에 배치

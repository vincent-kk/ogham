## Purpose

MCP 서버가 로컬 HTTP 로 서빙하는 브라우저 페이지의 프런트엔드 소스 루트.
현재 `settings/` (설정 페이지) 단일 페이지를 보유한다.

## Structure

| Path        | Role                                                      |
| ----------- | --------------------------------------------------------- |
| `settings/` | `.imbas/config.json` 편집 폼 (`open_settings`)            |
| `index.ts`  | barrel (`export {}` — 정적 자산 모음, 런타임 export 없음) |

## Conventions

- 순수 정적 파일 (HTML/CSS/JS) — 서버 코드는 `src/mcp/tools/openSettings/` 에만 위치
- 빌드 시 `scripts/build-settings-html.mjs` 가 페이지별 단일 HTML 로 인라인 번들 (`public/`)
- 페이지는 TypeScript 소스를 import 하지 않는 독립 스크립트

## Boundaries

### Always do

- 새 페이지 추가 시 `settings/` 와 동일한 구조 (`index.html` + `scripts/` + `styles/`) 준수

### Ask first

- 새 페이지 디렉토리 추가 (서버 라우트·빌드 스크립트 동반 확장)

### Never do

- 페이지에서 npm import 또는 빌드 스텝 의존 코드 작성
- 서버 측 로직을 pages 하위에 배치

## Dependencies

없음 (순수 정적 파일)

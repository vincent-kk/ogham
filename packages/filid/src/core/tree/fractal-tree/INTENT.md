# fractal-tree -- 디렉토리 스캔과 트리 조립

## Purpose

프로젝트 루트를 재귀 스캔해 `FractalTree`(노드 맵·루트·총 노드 수·최대 깊이)를 조립하고, 트리 탐색 유틸(`findNode`, `getAncestors`, `getDescendants`, `getFractalsUnderOrgans`)을 제공한다. filid 모든 분석 파이프라인의 입력 트리를 이 모듈이 생성한다.

## Structure

- `tree-builder/` organ — 순수 트리 조작: `build-fractal-tree`, `find-node`, `get-ancestors`, `get-descendants`, `get-fractals-under-organs`
- `scanner/` organ — 파일시스템 I/O와 프레임워크 감지: `scan-project`, `should-exclude`, `detect-frameworks`, `discover-directories`, `collect-node-metadata`, `correct-node-types`
- `fractal-tree.ts` — slim facade (두 organ의 re-export)
- `index.ts` — 배럴 export (facade 위임)

## Conventions

- `tree-builder/`는 순수 함수만 (파일시스템 호출 금지)
- 파일시스템 접근은 반드시 `scanner/`로 캡슐화
- `NodeEntry`는 빌드 단계의 input DTO, `FractalNode`는 트리 노드 타입
- `scanProject`는 프로젝트 루트 절대 경로를 받아 모든 경로를 절대 경로로 저장
- 재분류(`correct-node-types`)는 스캔 직후 한 번만 실행

## Boundaries

### Always do

- 새 탐색 함수 추가 시 `tree-builder/` 파일로 분리 후 facade에 re-export
- 스캔 옵션 확장 시 `ScanOptions` 타입과 동기화
- 스캐너 파일 추가 시 `scanner/` organ에 배치 (I/O 분리 원칙)

### Ask first

- 제외 규칙(`should-exclude`) 기본값 변경
- 프레임워크 감지 우선순위 변경

### Never do

- `tree-builder/`에 파일시스템 호출 추가 (모든 I/O는 `scanner/`)
- `rules/`, `analysis/` 등 상위 계층 import
- 트리 mutation을 외부 소비자에게 노출 (읽기 전용)

## Dependencies

- `../../../types/fractal.js` (`FractalTree`, `FractalNode`, `NodeEntry`, `ScanOptions`)
- `../../../constants/scan-defaults.js`, `../../../constants/organ-names.js`
- `../organ-classifier/` (classifyNode)
- `node:fs`, `node:path`, `fast-glob`

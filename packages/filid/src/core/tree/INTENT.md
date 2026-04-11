# tree -- 프랙탈 트리 구축과 분류

## Purpose

파일시스템에서 디렉토리 계층을 스캔해 `FractalTree`를 구축하고, 각 노드를 `fractal` / `organ` / `pure-function` / `hybrid`로 분류하며, 임의 파일에서 상위 경계(`INTENT.md` 체인)를 역추적한다. filid의 모든 분석·규칙 평가가 이 트리를 입력으로 한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `fractal-tree` | 디렉토리 스캔 + 트리 조립. `tree-builder/` (트리 구성)과 `scanner/` (파일시스템 I/O)의 두 sub-organ을 포함 |
| `organ-classifier` | 7단계 우선순위 분류 (`INTENT.md` → `DETAIL.md` → 인프라 패턴 → 알려진 organ 이름 → `index` 파일 → leaf 여부 → 부작용 여부) |
| `boundary-detector` | `package.json`을 경계로 하여 파일 → 루트까지 조상 체인 수집, `INTENT.md`/`DETAIL.md` 유무 맵 반환 |

## Conventions

- 분류기 결정은 `ClassifyInput` 구조체 하나에 입력을 모두 담아 테스트하기 쉽게 유지
- `KNOWN_ORGAN_DIR_NAMES`는 `constants/organ-names.ts`에서만 관리 (레거시 상수 금지)
- 스캔은 `scanner/` 하위로 캡슐화, 알고리즘 코드는 `tree-builder/`에서만 다룸
- 경계 탐색은 `package.json` 존재 디렉토리를 "boundary"로 정의

## Boundaries

### Always do

- 분류 우선순위 변경 시 `__tests__/unit/core/tree/organ-classifier/` 테스트 즉시 갱신
- 새 탐색 함수 추가 시 `core/tree/fractal-tree/index.ts` 배럴에 등록

### Ask first

- `KNOWN_ORGAN_DIR_NAMES` 목록 수정 (FCA 규칙 문서와 동기화 필요)
- `classifyNode` 우선순위 순서 변경

### Never do

- 파일시스템 직접 mutate (읽기 전용)
- `mcp/`, `hooks/` 역방향 import

## Dependencies

- `../../types/fractal.js`, `../../constants/organ-names.js`, `node:fs`, `node:path`

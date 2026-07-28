# fractalTree — adapter-aware scan and tree assembly

## Purpose

Node 20 filesystem recursion과 StructureAdapter metadata로 `FractalTree`를 만들고 path 관계 탐색을 제공한다.

## Structure

- `treeBuilder/` organ — 순수 관계 조립과 path traversal
- `scanner/` organ — readdir recursion, adapter metadata와 bottom-up correction
- `fractalTree.ts` — public facade, `index.ts` — named barrel

## Conventions

- `treeBuilder/`는 순수하고 filesystem 접근은 `scanner/`에만 둔다.
- `NodeEntry`는 adapter evidence를 보존하고 `FractalNode`가 public tree를 표현한다.
- reclassification은 deepest-first로 한 번 수행한다.
- exclusion은 두 층이다: `ScanOptions.exclude` pattern과 git이 무시하는 경로.
  후자는 `lib/createIgnoreFilter`를 scan 시작에 한 번 만들어 directory와 peer
  file에 같은 기준으로 적용한다. git이 추적하는 파일은 무시 대상이 아니다.

## Boundaries

### Always do

- 새 탐색 함수는 `treeBuilder/`, I/O 함수는 `scanner/`에 배치
- scan option, adapter descriptor와 tree DTO를 함께 동기화
- parent/owner와 entry ownership은 portable path identity로 판정
- entry override의 이름 의미를 해석하지 않고 adapter ID별로 전달
- ignore filter는 `scanProject`에서 한 번 만들어 scanner 전체가 공유

### Ask first

- exclusion, symlink 또는 adapter resolution 정책 변경
- public tree relation field 변경

### Never do

- `treeBuilder/`에 filesystem I/O 추가
- 특정 entry filename/framework/extension 추측
- `.gitignore` 문법 직접 해석 또는 glob dependency 추가
- git 부재를 scan 실패로 취급 — ignore 없이 그대로 진행한다
- `rules/`, `analysis/` 상위 계층 import

## Dependencies

- `../../../types/`, scan/document constants, `../organClassifier/`,
  `../../../lib/` ignore filter, adapter contracts, Node filesystem/path

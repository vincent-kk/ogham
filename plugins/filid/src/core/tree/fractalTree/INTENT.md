# fractalTree — adapter-aware scan and tree assembly

## Purpose

Node 20 filesystem recursion과 StructureAdapter metadata로 `FractalTree`를 만들고 path 관계 탐색을 제공한다.

## Structure

- `treeBuilder/` organ — 순수 관계 조립과 path traversal
- `scanner/` organ — readdir recursion, adapter metadata와 bottom-up correction
- `index.ts` — named barrel, 이 fractal의 유일한 공개 표면

## Conventions

- 순수 관계 조립과 filesystem 접근을 분리해 tree relation 계산의 결정성을 유지한다.
- `NodeEntry`는 adapter evidence를 보존하고 `FractalNode`가 public tree를 표현한다.
- reclassification은 deepest-first로 한 번 수행한다.
- exclusion은 세 층이다: `ScanOptions.exclude` pattern, config가 공급하는 디렉토리 이름, git이 무시하는 경로. 앞의 둘은 한 matcher가 segment 단위로 판정하고, 마지막은 scan 시작에 한 번 만든 ignore filter를 directory와 peer file에 같은 기준으로 적용한다. git이 추적하는 파일은 무시 대상이 아니다.

## Boundaries

### Always do

- 새 탐색 함수는 순수 관계 조립 계층에, I/O 함수는 scanner 계층에 배치해 effect boundary를 유지
- scan option, adapter descriptor와 tree DTO를 함께 동기화
- parent/owner와 entry ownership은 portable path identity로 판정
- entry override의 이름 의미를 해석하지 않고 adapter ID별로 전달
- ignore filter는 `scanProject`에서 한 번 만들어 scanner 전체가 공유

### Ask first

- exclusion, symlink 또는 adapter resolution 정책 변경
- public tree relation field 변경

### Never do

- 순수 관계 조립 계층에 filesystem I/O 추가
- 특정 entry filename/framework/extension 추측
- `.gitignore` 문법 직접 해석 또는 glob dependency 추가
- git 부재를 scan 실패로 취급 — ignore 없이 그대로 진행한다
- 규칙 평가나 분석 계층을 역방향 import

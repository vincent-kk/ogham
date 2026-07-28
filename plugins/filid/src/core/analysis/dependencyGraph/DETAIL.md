# dependencyGraph contract

## Requirements

- source/target owner와 dependency evidence를 owner-level edge로 집계한다.
- 실제 directed edge에서 cycle을 계산하고 isolated owner도 nodePaths에 둔다.
- same-owner dependency는 evidence로 보존하지만 자기 cycle로 판정하지 않는다.
- owner의 subtree 안에서 그 owner가 소유한 organ 파일을 참조한 evidence도
  edge로 보존하지만 cycle adjacency에서는 제외한다. organ은 진입점을 갖지
  않으므로 이 참조는 부모를 향하는 의존이 아니라 owner 내부 참조다. 승격하면
  부모 배럴이 자식을 재수출하는 정상 FCA 형태가 순환으로 오판된다.
- 검증 파일이 만든 참조도 edge로 보존하지만 cycle adjacency에서는 제외한다.
  검증은 대상을 확인하는 행위이지 런타임 의존이 아니며, 한 테스트가 여러
  모듈을 읽는 정상 형태가 순환으로 오판된다.
- 분석 불가능한 dependency가 있으면 certainty를 indeterminate로 보존한다.
- Windows/POSIX path identity는 portable 비교로 판정하며 case/separator alias를
  중복 owner나 별도 cycle node로 만들지 않는다.
- cycle은 정렬된 strongly-connected component label이 아니라 첫 owner가
  마지막에 반복되는 실제 directed closed route다. 각 cyclic component는
  결정론적인 대표 route 하나를 반환한다.

## API Contracts

- `buildDependencyGraph(nodePaths, evidence, certainty, options?): DependencyGraph` —
  정렬된 edge, cycle과 certainty를 반환한다. `options.organPaths`를 주면 owner
  subtree 안의 owned-organ 참조를, `options.verificationPaths`를 주면 검증
  파일이 만든 참조를 cycle adjacency에서 제외한다.
- `resolveOwningOrganPath(organPaths, ownerPath, filePath): string | null` —
  `filePath`를 직접 담고 있으면서 `ownerPath` 안에 있는 가장 깊은 organ 경로.
  boundary rule이 organ 대상 여부와 면책 조회 키를 같은 규칙으로 얻는다.
- `detectCycles(graph): string[][]` — cyclic component마다 실제 edge로 연결되고
  시작 owner로 닫히는 안정된 대표 경로 배열을 반환한다.
- legacy `buildDAG`, `topologicalSort`, `getDirectDependencies`는 작업 8
  정리 전 characterization 호환만 유지한다.

## Acceptance Criteria

### AC-dag-cycle — 실제 dependency cycle

- A → B → A reference는 A/B cycle을 반환한다.
- A → C → B → A reference는 정렬된 A/B/C label이 아니라 A/C/B/A route를
  반환한다.
- containment 관계와 same-owner edge만으로 cycle을 만들지 않는다.
- Windows case/separator alias 사이 edge는 logical self-edge로 취급한다.
- 자식 fractal이 부모 소유 organ 파일을 참조하고 부모 배럴이 그 자식을
  재수출해도 cycle이 아니다. 같은 형태에서 자식이 부모 **진입점**을
  참조하면 실제 순환이므로 cycle로 남는다.

### AC-dag-evidence — 검증 가능한 edge

- 각 edge가 source file, raw specifier와 resolved path를 보존한다.
- 같은 owner pair의 여러 import는 한 edge의 정렬된 evidence로 집계된다.
- logical owner path alias는 최초 canonical input path 하나로 집계된다.

### AC-dag-certainty — 억지 PASS 금지

- unresolved internal dependency가 있으면 graph는 indeterminate다.

## Last Updated

2026-07-28 — owned-organ 참조를 cycle adjacency에서 제외하고 `resolveOwningOrganPath`를 공개했다.

# dependencyGraph contract

## Requirements

- source/target owner와 dependency evidence를 owner-level edge로 집계한다.
- 실제 directed edge에서 cycle을 계산하고 isolated owner도 nodePaths에 둔다.
- same-owner dependency는 evidence로 보존하지만 자기 cycle로 판정하지 않는다.
- owner의 subtree 안에서 그 owner가 소유한 organ 파일을 참조한 evidence도 edge로 보존하지만 cycle adjacency에서는 제외한다. organ은 진입점을 갖지 않으므로 이 참조는 부모를 향하는 의존이 아니라 owner 내부 참조다. 승격하면 부모 배럴이 자식을 재수출하는 정상 FCA 형태가 순환으로 오판된다.
- 검증 파일이 만든 참조도 edge로 보존하지만 cycle adjacency에서는 제외한다. 검증은 대상을 확인하는 행위이지 런타임 의존이 아니며, 한 테스트가 여러 모듈을 읽는 정상 형태가 순환으로 오판된다.
- 참조를 확정하지 못한 파일은 `unknownFiles`에 원인과 함께 귀속한다. 그 참조는 edge로 쓰지 않는다. `UnknownFile`은 `{ path, causes }`다. `path`는 `options.projectRoot` 기준 POSIX 상대 경로이고, `causes`는 진단 코드의 정렬된 고유 목록이며, 목록은 path 순이다. 원인별 규칙:
  - `uncertain-local-dependency`: adapter가 `certainty: 'indeterminate'`로 표시한 참조의 source. verification 파일도 포함한다. 그 참조가 실제 import라면 edge 증거가 없어 이동 계획의 수정 목록에서 빠지기 때문이다.
  - `unresolved-local-dependency`: 풀리지 않은 production 참조의 source. indeterminate이면서 풀리지 않은 참조는 두 원인을 모두 받는다 — 수집기가 그 참조에 `unresolved-local-dependency` 진단을 내므로, 파일에 나온 진단 코드는 언제나 그 파일의 원인에 들어 있다.
  - 소유 fractal이 없는 참조는 **`unknownFiles`에 들어가지 않는다**. 노드가 없으므로 간선도 순환도 만들 수 없고, 경계를 만드는 것은 사용자 동의 사항이어서 그 파일 때문에 그래프가 미확정이 되지 않는다. 대신 `findUnownedReferences`가 source 파일과 소유자 없는 대상을 함께 빠짐없이 돌려주고, 진단은 `projectSnapshot`이 만든다.
  - verification 파일의 미해소·owner 부재 참조는 DAG 대상이 아니므로 귀속하지 않는다.
  - `options.unknownFiles`: 수집기가 참조 밖에서 찾은 항목(읽기 실패, adapter ownership 진단, 따라가지 않은 symlink)을 그대로 합친다.
- 스칼라 `certainty`는 표시용 파생값이다. 시작 certainty가 `unsupported`면 `unsupported`다. 아니면 `unknownFiles`가 있거나 시작 certainty가 `indeterminate`면 `indeterminate`이고, 그 밖에는 `exact`다. 스냅숏 수집기는 파일에 귀속하지 못하는 `indeterminate`를 넘기지 않는다. 시작값 `indeterminate`는 호출자가 귀속 없이 넘긴 불확실성을 지우지 않기 위해 남겨 둔 것이다.
- 관련성 거름망(`partitionUnknownFiles`)은 `unknownFiles`를 대상 단위(파일·디렉터리 경로)에 관련된 것과 무관한 것으로 나눈다. 규칙은 넷이다.
  - (a) 대상 단위 안의 파일은 관련이다.
  - (b) 파일 텍스트에 대상 이름이 **경로 토큰**으로 나오면 관련이다. 대상 이름은 대상의 종류(`RelevanceTarget.kind`)로 정한다.
    - `file`: stem(마지막 확장자를 뗀 basename)만이다.
    - `module-index`: 부모 디렉터리 이름만이다. 그 부모 디렉터리 서브트리 안의 파일은 텍스트와 무관하게 관련이다. 부모가 프로젝트 루트(`.`)이면 모든 파일이 관련이다. index 파일은 디렉터리 이름으로 import되고(`'../a'`, `'../a/index'`), 이름을 담지 않는 철자(`'.'`, `'./index'`, `'..'`)는 그 서브트리 안에서만 나오기 때문이다. `index` 같은 stem은 흔해서 이름으로 쓰면 bare substring 수준으로 넓어진다.
    - `directory`: 그 디렉터리 이름이다. 서브트리 안의 파일은 (a)로 관련이다.
  - 어느 파일이 `module-index`인지는 호출자가 adapter가 보고한 module entry(`FractalNode.entryPoints`의 `kind: 'module'`)로 정한다. core는 entry 파일 이름을 모른다.
  - (c) 호출자가 지정한 추가 경로(restructure의 요구 소비자)는 관련이다.
  - 원인에 `symlink-not-followed`가 있거나 텍스트를 읽지 못한 파일은 관련이다.
- 경로 토큰(`containsPathToken`)은 대소문자를 무시한다. 앞 문자가 `/`·`'`·`"`·`` ` ``·`.` 중 하나이고 뒤 문자가 식별자 문자(`[A-Za-z0-9_$]`)가 아니거나 텍스트 끝이다. 빈 이름은 어느 텍스트에서도 토큰이 아니다. 파일 텍스트는 문자열 존재 확인에만 쓰고 해석하지 않는다.
- **거름망은 증명이 아니다.** 대상 이름을 담지 않는 참조(경로 alias가 다른 이름으로 가리키는 import, star re-export를 거친 사용)를 놓친다. 놓친 파일의 나가는 참조에 달린 결론 — 그 파일을 지나는 순환, 그 파일이 소비자인 경계 위반 — 은 알려진 간선 위에서만 판정된다. 예: fractal A의 X가 alias로 B를 import(간선 A→B가 보이지 않음)하고 B→C가 알려져 있을 때, 계획이 u를 B에서 A로 옮기고 C가 u를 import하면 순환 A→B→C→A가 생기지만 보이지 않는다. 그래서 무관으로 나뉜 파일이 있으면 결과가 그 한계를 싣는다(restructure DETAIL).
- Windows/POSIX path identity는 portable 비교로 판정하며 case/separator alias를 중복 owner나 별도 cycle node로 만들지 않는다.
- cycle은 정렬된 strongly-connected component label이 아니라 첫 owner가 마지막에 반복되는 실제 directed closed route다. 각 cyclic component는 결정론적인 대표 route 하나를 반환한다.
- owner·organ 후보 정렬은 조회 함수가 아니라 **호출자**가 소유한다. 조회는 참조 하나마다 수만 번 일어나고 후보 목록은 그 사이 바뀌지 않으므로, 조회마다 목록을 복사·정렬하면 비용이 후보 수와 참조 수의 곱으로 커진다. 정렬 결과는 같으므로 반환 graph는 달라지지 않는다.

## API Contracts

- `buildDependencyGraph(nodePaths, evidence, certainty, options): DependencyGraph` — 정렬된 edge, cycle, `unknownFiles`와 파생 certainty를 반환한다. `options.projectRoot`는 `unknownFiles` 경로의 기준이다. `options.unknownFiles`는 수집기가 찾은 항목이다. `options.organPaths`를 주면 owner subtree 안의 owned-organ 참조를, `options.verificationPaths`를 주면 검증 파일이 만든 참조를 cycle adjacency에서 제외한다.
- `partitionUnknownFiles(unknownFiles, targets, readText, extraRelevantPaths?): { relevant, other }` — 관련성 거름망. `targets`(`{ path, kind }`)와 `extraRelevantPaths`는 프로젝트 상대 경로다. `readText`는 파일 텍스트를 돌려주거나, 읽을 수 없으면 `null`을 돌려준다. 순서는 입력 순서를 지킨다. 경로 토큰 판정(`containsPathToken`)은 내부 파일이고 공개하지 않는다.
- `classifyRelevanceTarget(tree, absolutePath, isDirectory): 'file' | 'module-index' | 'directory'` — 대상 종류. 파일이 그 디렉터리 노드의 `kind: 'module'` entry point이면 `module-index`다. restructure와 review가 대상을 만들 때 쓴다.
- `resolveOwningOrganPath(organPathsDeepestFirst, ownerPath, filePath): string | null` — `filePath`를 직접 담고 있으면서 `ownerPath` 안에 있는 가장 깊은 organ 경로. boundary rule이 organ 대상 여부와 면책 조회 키를 같은 규칙으로 얻는다. 첫 인자는 `sortPathsDeepestFirst`로 정렬해 넘긴다 — 정렬되지 않은 목록을 주면 가장 깊은 organ 대신 먼저 만난 organ을 반환한다.
- `sortPathsDeepestFirst(paths): string[]` — 후보를 길이 내림차순으로 한 번 정렬한다. owner·organ 조회의 전제를 만드는 유일한 지점이다.
- `detectCycles(graph): string[][]` — cyclic component마다 실제 edge로 연결되고 시작 owner로 닫히는 안정된 대표 경로 배열을 반환한다.
- `findUnownedReferences(nodePaths, references, options?): UnownedReference[]` — `buildDependencyGraph`와 같은 순서·면제로 owner 없는 참조를 `{ reference, unownedPath }`로 돌려준다. 판정만 하고, 진단은 `projectSnapshot`이 만든다.
- legacy `buildDAG`, `topologicalSort`, `getDirectDependencies`는 작업 8 정리 전 characterization 호환만 유지한다.

## Acceptance Criteria

### AC-dag-cycle — 실제 dependency cycle

- A → B → A reference는 A/B cycle을 반환한다.
- A → C → B → A reference는 정렬된 A/B/C label이 아니라 A/C/B/A route를 반환한다.
- containment 관계와 same-owner edge만으로 cycle을 만들지 않는다.
- Windows case/separator alias 사이 edge는 logical self-edge로 취급한다.
- 자식 fractal이 부모 소유 organ 파일을 참조하고 부모 배럴이 그 자식을 재수출해도 cycle이 아니다. 같은 형태에서 자식이 부모 **진입점**을 참조하면 실제 순환이므로 cycle로 남는다.

### AC-dag-evidence — 검증 가능한 edge

- 각 edge가 source file, raw specifier와 resolved path를 보존한다.
- 같은 owner pair의 여러 import는 한 edge의 정렬된 evidence로 집계된다.
- logical owner path alias는 최초 canonical input path 하나로 집계된다.

### AC-dag-unowned — owner 없는 참조의 판정

- `findUnownedReferences`는 indeterminate·unresolved 참조를 owner 판정 전에 건너뛰고, 검증 파일이 만든 참조는 면제한다.
- source owner가 없으면 source를, source owner는 있으나 target owner가 없으면 target을 `unownedPath`로 돌려준다.
- 두 owner가 모두 있는 참조는 결과에 없다.

### AC-dag-certainty — 모르는 것은 원인 파일에 귀속한다

- unresolved production dependency 또는 production 참조의 source/target owner 누락이 있으면 그 source가 `unknownFiles`에 들어가고 graph는 indeterminate다.
- adapter가 indeterminate로 표시한 참조는 production이든 verification이든 edge가 되지 않는다. 그 source가 `unknownFiles`에 들어간다.
- verification 참조만 미해소이거나 owner를 찾지 못하는 경우 `unknownFiles`는 비고 exact DAG를 유지한다. 해석 가능한 verification edge evidence는 보존한다.
- 같은 owner pair에 verification과 production 참조가 함께 있으면 production 참조가 만드는 순환을 감추지 않는다.
- 입력 certainty가 indeterminate/unsupported이면 verification 제외로 exact가 되지 않는다.
- 한 파일의 여러 원인은 그 파일 항목 하나의 `causes`로 합친다.

### AC-dag-relevance — 관련성 거름망

- `index`는 `reindex`·`indexOf` 안에서 토큰이 아니고, `'./index'`·`/index.ts`·`'./INDEX'`에서는 토큰이다.
- 대상 안의 파일, 대상 이름이 토큰으로 나오는 파일, 지정한 추가 경로, symlink 항목(텍스트가 비어 있어도), 읽지 못한 파일은 관련이다. 그 밖의 파일은 무관이다.
- module index 대상은 부모 디렉터리 이름으로만 판정하고 그 서브트리 안은 관련이다. 일반 파일 대상은 stem으로만 판정한다.
- 빈 이름은 즉시 false다.

### AC-dag-lookup-cost — 조회는 후보 수에 곱해지지 않는다

- 같은 경로를 여러 참조가 가리켜도 owner 해석은 경로마다 한 번만 계산한다.
- 후보 정렬은 graph 구성 1회당 1회다.
- 이 최적화 전후의 edge, cycle과 certainty는 동일하다.

## Last Updated

2026-09-20

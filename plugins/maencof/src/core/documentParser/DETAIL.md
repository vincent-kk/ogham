# documentParser — Contract

## Requirements

- 파싱 중 파일을 수정하지 않는다. 읽기 전용 변환이다.
- YAML 처리는 `yamlParser` 를 재사용하고 여기서 다시 만들지 않는다. 배럴이 `parseScalarValue`·`parseYamlFrontmatter` 를 재노출하는 것은 호출자가 두 모듈을 따로 알지 않아도 되게 하려는 것이다.
- frontmatter 는 `FrontmatterSchema` 로 검증한다. 검증 실패는 노드 구축 실패로 전달되고 예외로 터지지 않는다.
- 노드 구축은 경로 게이트를 통과해야 한다: 정규화된 상대 경로의 첫 세그먼트가 레이어 디렉토리(`LAYER_DIR`)가 아니면 — vault 서고(99_Archive)·루트 문서·상향 탈출·절대경로 — `success: false` 로 거부한다. frontmatter 검증만 필요한 소비자(read/update/move/delete)는 `allowNonLayerPath: true` 로 옵트아웃한다. 게이트 판정의 정본은 `types/layer.ts` 의 `isLayerDirPath` 다.
- 링크는 wikilink 와 markdown link 를 모두 인식한다 — 볼트 문서가 두 표기를 섞어 쓴다.

## API Contracts

- `extractFrontmatter(source)` — frontmatter 블록과 본문 분리.
- `extractLinks(source)` — `MarkdownLink[]`. wikilink·markdown link 모두.
- `parseDocument(source)` · `parseDocumentFromFile(path)` — `ParsedDocument`. 후자만 파일을 읽는다.
- `buildKnowledgeNode(doc, options?)` — `NodeBuildResult`. `options.allowNonLayerPath: true` 는 경로 게이트를 우회한다(그래프 비삽입 검증 전용). 제목 추출은 내부 private.
- `inferSubLayerFromPath(path)` — 경로에서 L3 sublayer 추론.
- `parseScalarValue` · `parseYamlFrontmatter` — `yamlParser` 재노출.

## Acceptance Criteria

### AC-read-only-parse — 읽기 전용

- 파싱 경로에서 파일 쓰기 호출이 0건이다.

### AC-both-link-forms — 두 링크 표기

- wikilink 와 markdown link 가 같은 결과 형태로 추출된다.

### AC-frontmatter-extraction — frontmatter 분리

- frontmatter 블록과 본문이 분리되어 반환된다.
- frontmatter 가 없거나 닫히지 않은 문서에서 throw 없이 본문 전체를 본문으로 돌려준다.

### AC-layer-path-gate — 노드 경로 게이트

- 유효 frontmatter 라도 정규화된 첫 세그먼트가 레이어 디렉토리가 아니면 — vault 서고(99_Archive) 하위, vault 루트 문서, 상향 탈출 traversal 경로 — `buildKnowledgeNode` 가 `success: false` 를 반환한다.
- `allowNonLayerPath: true` 옵션은 같은 문서를 `success: true` 로 구축한다 (그래프 비삽입 검증 전용).

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 이 배럴은 `yamlParser` 까지 재노출하므로 특히 그렇다. 훅이 frontmatter 해석을 자체 구현하면 스키마 검증이 두 곳으로 갈라진다.

## Last Updated

2026-07-30 — 읽기 전용·yamlParser 재사용 계약과 훅 직접 import 면책을 문서화했다.

## Purpose

`mesh-lookup` 도구. 자연어 용어를 MeSH 어휘(Descriptor·entry term·scopeNote)로 매핑한다. agent의 검색식 생성·explosion 판단 재료. `db=mesh` ESearch→ESummary.

## Structure

| 파일                       | 역할                                             |
| -------------------------- | ------------------------------------------------ |
| `meshLookup.ts`            | `runMeshLookup` — 용어별 매핑 수집(메인)         |
| `operations/lookupTerm.ts` | `lookupTerm`·`parseMeshSummary` — 단일 용어 매핑 |

## Conventions

- ESearch는 어댑터, ESummary(db=mesh)는 mesh 전용 파싱이라 httpClient 직접 호출.
- ⚠️ MeSH ESummary 필드명은 @live 스모크로 검증(방어적 파싱).

## Boundaries

### Always do

- 매칭 실패는 `matched: NONE`으로 표현(throw 금지).

### Ask first

- mesh 매핑 필드 가정 변경(live 검증 후), treeNumbers/SCR 확장.

### Never do

- 상위 레이어 import. 인라인 db/엔드포인트 문자열.

## Dependencies

- `../../../adapters/eutils` (esearch) · `../../../core/{sourceResolver,httpClient}`
- `../shared` (ToolContext) · `../../../types/{tool,enums}`

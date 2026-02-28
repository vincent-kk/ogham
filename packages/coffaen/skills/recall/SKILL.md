---
name: recall
user_invocable: true
description: 지식 검색/회상 — 자연어 쿼리로 지식 그래프를 탐색하여 관련 문서를 반환
version: 1.0.0
complexity: simple
plugin: coffaen
---

# recall — 지식 검색/회상

자연어 쿼리를 받아 coffaen 지식 그래프를 탐색하고, 확산 활성화(SA) 알고리즘으로
관련 문서를 찾아 컨텍스트를 조립하여 반환합니다.

## 언제 사용하는가

- 과거에 기록한 지식을 검색할 때
- 특정 주제와 연관된 문서를 찾을 때
- 기억 공간에서 컨텍스트를 불러올 때
- `/coffaen:explore`의 단일 쿼리 경량 버전이 필요할 때

## 전제 조건

- coffaen 인덱스가 빌드되어 있어야 합니다 (`.coffaen/index.json` 존재)
- 인덱스가 없으면: "인덱스가 없습니다. `/coffaen:build`를 먼저 실행해주세요." 안내

## 워크플로우

### Step 1 — 쿼리 파싱

사용자 입력에서 핵심 키워드와 의도를 추출합니다.

- 자연어 쿼리 → 검색 키워드 목록
- 모드 감지: `--summary` (요약 모드, 기본) / `--detail` (상세 모드)
- Layer 필터 감지: `--layer=1` ~ `--layer=4`

### Step 2 — kg_search 호출

`kg_search` MCP 도구를 호출하여 시드 노드를 찾습니다.

```
kg_search(seed: [키워드1, 키워드2, ...], max_results=10, layer_filter?)
```

결과가 없으면: "관련 문서를 찾지 못했습니다. 다른 키워드로 시도해보세요." 안내

### Step 3 — 이웃 탐색 (kg_navigate)

시드 노드에서 인/아웃바운드 링크를 탐색합니다.

```
kg_navigate(path: 선택된_노드_경로, include_inbound=true, include_outbound=true, include_hierarchy=true)
```

### Step 4 — 컨텍스트 조립 (kg_context)

상위 활성화 노드의 컨텍스트를 조립합니다.

```
kg_context(query: 검색_쿼리_문자열, token_budget=2000)
```

### Step 5 — 결과 포맷팅

**요약 모드 (기본)**:
```
## 검색 결과: "{쿼리}"

관련 문서 {N}개를 찾았습니다.

1. **{제목}** (Layer {N}, 관련도 {score}%)
   {1-2줄 요약}
   경로: {path}

2. ...

💡 더 자세히 보려면: `/coffaen:recall {쿼리} --detail`
```

**상세 모드 (`--detail`)**:
```
## 검색 결과: "{쿼리}"

### {제목}
- **경로**: {path}
- **Layer**: {layer_name}
- **태그**: {tags}
- **관련도**: {score}%
- **연결 문서**: {linked_docs}

{문서 주요 내용 발췌}

---
```

## MCP 도구

| 도구 | 목적 |
|------|------|
| `kg_search` | 키워드 기반 시드 노드 탐색 |
| `kg_navigate` | 이웃 노드 조회 (인바운드/아웃바운드/계층 링크 탐색) |
| `kg_context` | 노드 컨텍스트 조립 |

## 옵션

```
/coffaen:recall <쿼리> [옵션]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--summary` | 기본 | 요약 모드 (제목 + 1-2줄 요약) |
| `--detail` | — | 상세 모드 (전체 내용 발췌) |
| `--layer=N` | 전체 | 특정 Layer만 검색 (1-4) |
| `--limit=N` | 10 | 최대 결과 수 |

## 사용 예시

```
/coffaen:recall 리액트 상태관리 패턴
/coffaen:recall 프로젝트 목표 --detail
/coffaen:recall 일정 --layer=4
/coffaen:recall 핵심 가치 --layer=1 --detail
```

## 오류 처리

- **인덱스 없음**: `/coffaen:build` 실행 안내
- **결과 없음**: 유사 키워드 제안 + `/coffaen:explore` 대화형 탐색 안내
- **인덱스 stale**: stale 경고 표시 후 계속 진행

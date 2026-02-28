---
name: explore
user_invocable: true
description: SA 기반 대화형 지식 그래프 탐색 — 시드에서 확산하며 숨겨진 연결을 발견한다
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3]
orchestrator: explore 스킬
plugin: coffaen
---

# explore — 대화형 지식 탐색

확산 활성화(Spreading Activation) 기반으로 지식 그래프를 대화형으로 탐색한다.
시드 노드에서 에너지가 확산되며 의외의 연결을 발견할 수 있다.

## When to Use This Skill

- 특정 주제와 관련된 모든 지식을 탐색하고 싶을 때
- 지식 간 숨겨진 연결을 발견하고 싶을 때
- "이것과 관련된 것은 무엇인가?" 형태의 발산적 탐색
- `/coffaen:recall`보다 깊은 탐색이 필요할 때

## 전제 조건

- coffaen 인덱스가 빌드되어 있어야 합니다 (`.coffaen/kg-graph.json` 존재)
- 인덱스가 없으면: "인덱스가 없습니다. `/coffaen:build`를 먼저 실행해주세요." 안내
- `kg_status`로 인덱스 상태를 먼저 확인한다

## 워크플로우

### Step 1 — 탐색 시작점 결정

사용자 입력에서 시드를 결정한다:

- 파일 경로 직접 지정 (`.md` 포함 또는 `/` 포함) → 해당 노드가 시드
- 키워드 → Frontmatter 태그/제목 매칭으로 시드 결정
- 미지정 → 사용자에게 탐색할 주제 입력 요청

Layer 필터(`--layer`)가 지정된 경우 해당 Layer 문서만 시드 후보로 허용.

### Step 2 — 인덱스 상태 확인

```
kg_status()
```

- `rebuildRecommended: true` → 탐색 전 경고: "인덱스가 stale합니다. 결과가 부정확할 수 있습니다. `/coffaen:rebuild`를 권장합니다."
- 계속 진행할지 사용자에게 확인

### Step 3 — SA 기반 확산 탐색

`kg_search` MCP 도구로 SA를 실행한다:

```
kg_search(
  seed: [시드 경로 또는 키워드],
  max_results: 10,
  decay: 0.7,
  threshold: 0.1,
  max_hops: --hops 값 (기본 5),
  layer_filter: --layer 값 (기본 없음)
)
```

결과가 0개이면: "시드 노드를 찾지 못했습니다. 다른 키워드를 시도해보세요." 안내 후 재입력 요청.

### Step 4 — 결과 표시 (Layer별 그룹화)

탐색 결과를 Layer별로 그룹화하여 표시:

```
## 탐색 결과: "{시드}"

### Layer 1 — Core Identity
1. **{제목}** (관련도 {score}%)
   경로: {path}

### Layer 2 — Derived
2. **{제목}** (관련도 {score}%)
   경로: {path}
...

💡 더 자세히 보려면 번호를 입력하세요. 탐색을 끝내려면 'q'를 입력하세요.
```

### Step 5 — 이웃 노드 조회 (선택적 심층 탐색)

사용자가 특정 번호를 선택하면 `kg_navigate`로 이웃을 조회한다:

```
kg_navigate(
  path: 선택된 노드 경로,
  include_inbound: true,
  include_outbound: true,
  include_hierarchy: true
)
```

인바운드/아웃바운드/부모/자식/형제를 표시하고 재탐색 여부를 확인한다.

### Step 6 — 대화형 확장 (최대 3회)

사용자가 이웃 노드를 새 시드로 선택하면 Step 3부터 재실행한다.
최대 3회 반복 후: "탐색 깊이 한계에 도달했습니다."

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | 인덱스 상태 확인 (stale 여부) |
| `kg_search` | SA 기반 관련 문서 검색 |
| `kg_navigate` | 특정 노드의 이웃 조회 (인/아웃 링크, 계층) |
| `kg_context` | 토큰 최적화 컨텍스트 블록 조립 |
| `coffaen_read` | 선택된 문서 전문 읽기 |

## Options

> 옵션은 LLM이 자연어로 해석한다. 엄격한 CLI 파싱이 아님.

```
/coffaen:explore [seed] [--hops <1-10>] [--layer <1-4>] [--detail]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `seed` | 없음 (입력 요청) | 탐색 시작점 (경로 또는 키워드) |
| `--hops` | 5 | 최대 홉 수 (1-10) |
| `--layer` | 전체 | Layer 필터 (1-4, 복수 가능) |
| `--detail` | false | 결과에 문서 본문 발췌 포함 |

## 사용 예시

```
/coffaen:explore 리액트
/coffaen:explore 01_Core/identity.md --hops 3
/coffaen:explore 머신러닝 --layer 3
/coffaen:explore 프로젝트 목표 --detail
```

## 오류 처리

- **인덱스 없음**: `/coffaen:build` 실행 안내
- **시드 미발견**: 유사 키워드 제안 후 재입력 요청
- **결과 없음**: 홉 수 증가(`--hops 10`) 또는 다른 키워드 제안
- **인덱스 stale**: 경고 표시 후 계속 진행 (사용자 선택)

## Quick Reference

```
# 키워드로 탐색
/coffaen:explore 머신러닝

# 특정 문서에서 탐색
/coffaen:explore 01_Core/identity.md

# Layer 필터 + 깊은 탐색
/coffaen:explore AI --layer 2 --hops 8

# 상세 본문 포함
/coffaen:explore 가치관 --detail
```

---
name: ingest
user_invocable: true
description: 외부 데이터소스 → coffaen 문서 변환 생성 (GitHub issues, Slack 등 → L3/L4)
version: 1.0.0
complexity: medium
context_layers: [3, 4]
orchestrator: ingest 스킬
plugin: coffaen
---

# ingest — 외부 지식 수집

외부 데이터소스(GitHub issues, Slack 메시지, 웹 페이지 등)에서 내용을 가져와
coffaen 문서(Layer 3/4)로 변환하여 저장한다.

## When to Use This Skill

- GitHub issue나 PR을 지식 저장소에 기록하고 싶을 때
- 외부 참조 자료를 Layer 3으로 저장하고 싶을 때
- 임시 작업 메모를 Layer 4에 빠르게 기록하고 싶을 때
- "수집", "가져오기", "ingest", "외부 데이터 저장"

## 워크플로우

### Step 1 — 소스 파싱

입력에서 데이터소스 유형과 내용을 파악:
- URL → 웹 페이지 fetch
- GitHub URL → issues/PR 내용 추출
- 텍스트 직접 입력 → 그대로 사용

### Step 2 — Layer 결정

| 소스 유형 | 기본 Layer | 이유 |
|----------|-----------|------|
| 외부 참조 (URL, 문서) | Layer 3 | 외부 출처 |
| 임시 작업 메모 | Layer 4 | 휘발성 |
| GitHub issue (진행 중) | Layer 4 | 시간적 근접성 |
| 완료된 issue/PR | Layer 3 | 참조용 |

### Step 3 — Frontmatter 자동 생성

```yaml
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [자동 추출된 태그]
layer: 3 또는 4
source: {원본 URL}
```

태그는 내용에서 핵심 키워드를 자동 추출한다.

### Step 4 — coffaen_create 호출

```
coffaen_create({
  layer: 3 또는 4,
  tags: [자동 추출된 태그들],
  content: {변환된 마크다운},
  title: {제목},
  filename: "날짜-제목" (Layer 4 임시 메모 시),
  source: {원본 URL} (Layer 3 외부 참조 시),
  expires: "YYYY-MM-DD" (Layer 4 만료 항목 시)
})
```

### Step 5 — 연결 제안

생성된 문서와 연관된 기존 문서를 `kg_search`로 탐색하여
링크 추가를 제안한다.

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `coffaen_create` | 문서 생성 |
| `kg_search` | 연관 문서 탐색 |
| `coffaen_update` | 링크 추가 |

## Options

```
/coffaen:ingest [source] [--layer <3|4>] [--tags <태그>] [--path <경로>]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `source` | 필수 | URL 또는 텍스트 |
| `--layer` | 자동 결정 | 저장 Layer 지정 |
| `--tags` | 자동 추출 | 추가 태그 |
| `--path` | 자동 생성 | 저장 경로 지정 |

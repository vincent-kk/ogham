---
created: 2026-02-28
updated: 2026-02-28
tags: [frontmatter, yaml, schema, metadata]
layer: design-area-1
---

# Frontmatter 스키마 정의

## 목적

모든 coffaen 기억 문서가 동일한 메타데이터 구조를 갖도록 스키마를 정의하여,
MCP 도구가 태그 기반 검색·중복 감지·전이 조건 판단을 일관되게 수행할 수 있게 한다.

관련 문서: [원자적 문서 정책](./03-atomic-document-policy.md) | [기억 라이프사이클](./06-memory-lifecycle.md) | [충돌 해소](./07-conflict-resolution.md)

---

## 1. 필수 필드

| 필드 | 타입 | 형식 | 설명 |
|------|------|------|------|
| `created` | string | YYYY-MM-DD | 최초 생성일. 변경 금지 |
| `updated` | string | YYYY-MM-DD | 마지막 수정일. Update 시 MCP 도구가 자동 갱신 |
| `tags` | string[] | 배열 | 중복 감지·검색 기반. 최소 1개 필수 |
| `layer` | number \| string | 1, 2, 3, 4 | 문서의 Layer 속성. 디렉토리 위치와 일치해야 함 |

**검증 규칙**: Create/Update 시 MCP 도구가 4개 필수 필드 존재 여부를 검사.
누락 시 작성 중단 및 오류 반환.

---

## 2. 선택 필드

| 필드 | 타입 | 기본값 | 용도 |
|------|------|--------|------|
| `title` | string | — | 문서 제목 (h1 헤딩과 별도로 메타데이터 검색용) |
| `source` | string | — | 외부 출처 URL 또는 레퍼런스 (Layer 3 문서용) |
| `expires` | string | — | 만료일 YYYY-MM-DD. Layer 4 휘발성 관리에 사용 |
| `confidence` | number | — | 내재화 신뢰도 0.0~1.0. Layer 3→2 전이 판단 기준 |
| `accessed_count` | number | 0 | 세션별 참조 횟수 누적값. 전이 조건 판단에 사용 |
| `schedule` | string | — | Lazy Scheduling 표현식. 세션 시작 시 점검 주기 |

---

## 3. Layer 속성과 디렉토리 정합성 규칙

| `layer` 값 | 올바른 디렉토리 | 불일치 시 처리 |
|-----------|--------------|--------------|
| `1` | `01_Core/` | MCP 도구가 경고, 저장은 허용 |
| `2` | `02_Derived/` | MCP 도구가 경고, 저장은 허용 |
| `3` | `03_External/` | MCP 도구가 경고, 저장은 허용 |
| `4` | `04_Action/` | MCP 도구가 경고, 저장은 허용 |

- 불일치는 **경고**로만 처리. 저장을 막지 않는다 (사용자 의도적 예외 허용).
- 반복 불일치 패턴은 `.coffaen-meta/broken-links.json`에 누적 기록.

---

## 4. 사용 패턴 예시 (Layer 3 외부 지식)

```yaml
---
created: 2026-02-28
updated: 2026-02-28
tags: [react, hooks, api-reference]
layer: 3
source: "외부 기술 블로그 아티클"
confidence: 0.3
accessed_count: 2
expires: 2026-06-30
---
```

Layer 4는 `expires` 필수, Layer 2는 `source`/`confidence` 생략, Layer 1은 선택 필드 최소화.

---

## 5. 메타데이터 검증 시점

| 시점 | 검증 내용 |
|------|----------|
| Create | 필수 필드 존재, `layer` 값 유효성, `tags` 배열 비어있지 않음 |
| Update | `updated` 날짜 자동 갱신, 필수 필드 누락 경고 |
| SessionStart | `expires` 경과 문서 탐지, `confidence` 전이 후보 탐지 |

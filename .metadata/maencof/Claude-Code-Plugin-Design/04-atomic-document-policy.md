---
created: 2026-02-28
updated: 2026-02-28
tags: [atomic-document, crud, 100-line-limit, progressive-autonomy]
layer: design-area-1
---

# 원자적 문서 CRUD 정책

## 목적

각 .md 파일이 단일 아이디어를 담는 원자적 단위가 되도록,
CRUD 연산마다 사전/사후 조건을 명시하고 자율 수준에 따른 승인 규칙을 정한다.

관련 문서: [5-Layer 지식 모델](./02-knowledge-layers.md) | [Frontmatter 스키마](./05-frontmatter-schema.md) | [충돌 해소](./14-conflict-resolution.md)

---

## 1. 원자성 제약

- 문서 예산: **100줄** (Frontmatter 포함) 또는 **본문 6,000 Unicode code points**. 초과 시 create/update/read가 최종 파일 기준 `document_size_exceeded`를 반환하며 저장 자체를 차단하거나 내용을 자르지 않는다. CRLF/LF는 동등하고 마지막 개행은 별도 줄로 세지 않는다.
- 규칙: **1 문서 = 1 아이디어** — 문서 자체가 청크(chunk) 역할
- 한 문서에 두 개 이상의 독립 개념이 존재하면 분할 대상
- 과대 문서는 중복·폐기된 주장을 먼저 통합하고 독립 주제별로 분할한다. 각 문서가 자체 문맥과 출처 위치를 가진 의미 단위 청크가 된다.

---

## 2. CRUD 연산별 조건

### Create
| 단계 | 내용 |
|------|------|
| 사전 조건 | 중복 감지 통과 ([충돌 해소](./14-conflict-resolution.md)) |
| 자동 처리 | Frontmatter 생성, Layer 결정 (디렉토리 위치 기반) |
| 사후 처리 | backlink-index.json 갱신, 관련 문서 링크 제안 |

### Read
- 기본: 요청 문서 반환
- 확산 활성화: SA 엔진으로 연결 문서 함께 제공 ([확산 활성화](./10-spreading-activation.md))

### Update
- Frontmatter `updated` 자동 갱신, 링크 유효성 검사 트리거
- 100줄 초과 감지 시 분할 제안

### Delete
- backlink-index.json에서 인바운드 링크 확인
- 인바운드 링크 존재 시 참조 문서 목록과 함께 경고

---

## 3. 100줄 초과 시 분할 정책

```
감지 (MCP 도구: 최종 줄/본문 문자 수 검사) → 재작성·의미 단위 분할 제안
  → 사용자 확인 (Level ≤1) 또는 자동 (Level 2-3)
  → 새 문서 생성·read 검증 → 원본을 자식 링크가 있는 개요로 교체 → 참조 대상·anchor 확인
```

---

## 4. Progressive Autonomy Level별 CRUD 승인

재시도는 동일한 의미의 기존 자식을 재사용한다. 분할 실패 시 완전한 원본을 유지하며, 독립 자식에 동일 cluster_key를 일괄 부여하지 않는다. 표·코드·인용은 이해에 필요한 설명 및 원문 링크·위치와 함께 유지한다. 일반 문서 수정은 덧붙인 정정문 대신 기존 문단을 재작성하며 로그·전사 기록만 목적에 맞게 append한다.

| 연산 | Level 0 | Level 1 | Level 2 | Level 3 |
|------|---------|---------|---------|---------|
| Create | 승인 | 자율 | 자율 | 자율 |
| Read | 자율 | 자율 | 자율 | 자율 |
| Update | 승인 | 자율 | 자율 | 자율 |
| Delete | 승인 | 승인 | 제안 후 확인 | 제안 후 확인 |
| 자동 분할 | 승인 | 승인 | 자율 | 자율 |

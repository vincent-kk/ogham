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

관련 문서: [4-Layer 지식 모델](./02-knowledge-layers.md) | [Frontmatter 스키마](./05-frontmatter-schema.md) | [충돌 해소](./14-conflict-resolution.md)

---

## 1. 원자성 제약

- 모든 .md 파일: **≤100줄** (Frontmatter 포함)
- 규칙: **1 문서 = 1 아이디어** — 문서 자체가 청크(chunk) 역할
- 한 문서에 두 개 이상의 독립 개념이 존재하면 분할 대상
- "문서 = 청크" 등식 근거: 100줄 이하 원자적 문서이므로 별도 분할 불필요 ([설계 결정](./25-design-decisions.md) 결정 1 참고)

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
감지 (MCP 도구: 줄 수 검사) → 분할 기준 제안 (h2/h3 경계)
  → 사용자 확인 (Level ≤1) 또는 자동 (Level 2-3)
  → 새 문서 생성 + 원본에 링크 삽입 → backlink 갱신
```

---

## 4. Progressive Autonomy Level별 CRUD 승인

| 연산 | Level 0 | Level 1 | Level 2 | Level 3 |
|------|---------|---------|---------|---------|
| Create | 승인 | 자율 | 자율 | 자율 |
| Read | 자율 | 자율 | 자율 | 자율 |
| Update | 승인 | 자율 | 자율 | 자율 |
| Delete | 승인 | 승인 | 제안 후 확인 | 제안 후 확인 |
| 자동 분할 | 승인 | 승인 | 자율 | 자율 |

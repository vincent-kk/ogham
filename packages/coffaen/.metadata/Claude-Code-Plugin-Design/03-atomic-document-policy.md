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

관련 문서: [지식 트리 구조](./02-knowledge-tree-structure.md) | [Frontmatter 스키마](./05-frontmatter-schema.md) | [충돌 해소](./07-conflict-resolution.md)

---

## 1. 원자성 제약

- 모든 .md 파일: **≤100줄** (Frontmatter 포함)
- 규칙: **1 문서 = 1 아이디어**
- 한 문서에 두 개 이상의 독립 개념이 존재하면 분할 대상

---

## 2. CRUD 연산별 사전/사후 조건

### Create

| 단계 | 내용 |
|------|------|
| 사전 조건 | 중복 감지 통과 ([충돌 해소](./07-conflict-resolution.md) 참고) |
| 자동 처리 | Frontmatter 생성 (`created`, `updated`, `tags`, `layer`) |
| Layer 결정 | 파일 저장 디렉토리 위치로 자동 판단 |
| 사후 처리 | backlink-index.json 갱신, 관련 문서 링크 제안 |

### Read

| 단계 | 내용 |
|------|------|
| 기본 동작 | 요청 문서 반환 |
| 확산 활성화 | BFS 2-hop 범위 내 연결 문서 함께 제공 |
| 런타임 제약 | Hook 타임아웃 내 완료 불가 시 1-hop으로 fallback |
| `accessed_count` | 세션별 참조 횟수 누적 (Frontmatter 갱신) |

### Update

| 단계 | 내용 |
|------|------|
| 사전 조건 | 기존 문서 존재 확인 |
| 자동 처리 | Frontmatter `updated` 필드 갱신 |
| 사후 처리 | 링크 유효성 검사 트리거, backlink-index.json 재구축 |
| 100줄 초과 감지 | MCP 도구가 분할 제안 → 사용자 확인 후 실행 |

### Delete

| 단계 | 내용 |
|------|------|
| 사전 조건 | backlink-index.json에서 인바운드 링크 존재 여부 확인 |
| 경고 조건 | 인바운드 링크가 1개 이상이면 참조 문서 목록과 함께 경고 |
| 사후 처리 | 참조 문서의 해당 링크 정리 제안, backlink-index.json 갱신 |

---

## 3. 100줄 초과 시 분할 정책

```
감지 (MCP 도구: 파일 저장 시 줄 수 검사)
  → 분할 기준 제안 (h2/h3 섹션 경계 기반)
  → 사용자 확인 (Autonomy Level ≤ 1) 또는 자동 진행 (Level 2-3)
  → 새 문서 생성 + 원본에 새 문서로 링크 삽입
  → backlink-index.json 갱신
```

---

## 4. Progressive Autonomy Level별 CRUD 승인

| 연산 | Level 0 | Level 1 | Level 2 | Level 3 |
|------|---------|---------|---------|---------|
| Create | 승인 필요 | 자율 | 자율 | 자율 |
| Read | 자율 | 자율 | 자율 | 자율 |
| Update | 승인 필요 | 자율 | 자율 | 자율 |
| Delete | 승인 필요 | 승인 필요 | 제안 후 확인 | 제안 후 확인 |
| 자동 분할 | 승인 필요 | 승인 필요 | 자율 | 자율 |

- **Level 0**: 읽기 외 모든 쓰기에 명시적 승인 필요
- **Level 1**: 파괴적 연산(Delete)만 승인
- **Level 2-3**: 파괴적 작업도 제안 후 확인으로 완화

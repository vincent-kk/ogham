---
created: 2026-02-28
updated: 2026-02-28
tags: [memory, lifecycle, transition, internalization]
layer: design-area-2
---

# 기억 라이프사이클 + 전이 조건

## 목적

단기·중기·장기 기억의 정의와, 각 Layer 간 전이를 언제·어떻게 실행하는지를 명시한다.
런타임 제약([00-runtime-constraints.md](./00-runtime-constraints.md))에 따라
자동 실시간 전이 대신 SessionStart Hook 지연 전이를 기본으로 채택한다.

관련 문서: [지식 트리 구조](./02-knowledge-tree-structure.md) | [Frontmatter 스키마](./05-frontmatter-schema.md)

---

## 1. 기억 유형 정의

| 유형 | Layer | 지속 범위 | 특성 |
|------|-------|----------|------|
| **단기 기억** | Layer 4 | 세션 내 | 작업 컨텍스트, 진행 중 결정. 세션 종료 시 아카이브 또는 삭제 |
| **중기 기억** | Layer 3 | 세션 간 | 외부 지식 임시 보관. 아직 내재화되지 않음. `confidence`로 추적 |
| **장기 기억** | Layer 1-2 | 영구 | 내재화 완료. 사용자의 가치관·기술·경험. 의도적 삭제 외 유지 |

---

## 2. 전이 조건 테이블

| 전이 | 조건 | 트리거 | Level 0-1 승인 | Level 2-3 승인 |
|------|------|--------|---------------|---------------|
| L4 → L3 | 세션 종료 + 사용자 보존 결정 | SessionEnd Hook | 명시적 승인 | 제안 후 확인 |
| L3 → L2 | `confidence` ≥ 0.7 **AND** `accessed_count` ≥ 5 | SessionStart 지연 전이 | 명시적 승인 | 자동 전이 |
| L3 → 삭제 | `expires` 경과 **AND** `accessed_count` = 0 | SessionStart 정리 | 명시적 승인 | 제안 후 확인 |
| L4 → 삭제 | 30일 경과 **AND** 미참조 | SessionStart 정리 | 자동 | 자동 |

---

## 3. SessionStart Hook 지연 전이 메커니즘

세션이 시작될 때 다음 순서로 실행된다.

```
1. .coffaen-meta/transition-queue.json 읽기
2. Layer 3 파일 스캔 → confidence/accessed_count/expires 조건 평가
3. Layer 4 파일 스캔 → 30일 초과 + 미참조 문서 탐지
4. 전이 후보 목록 생성 및 transition-queue.json 갱신

5a. [Level 0-1] 전이 후보 목록을 사용자에게 제시, 승인 후 실행
5b. [Level 2-3] L3→L2 자동 전이 실행, 파괴적 삭제만 확인

6. 전이 불가 시 fallback: /coffaen:organize 수동 스킬 호출 안내
```

Hook 타임아웃(3-5초) 내 완료 불가 시: 목록 생성만 수행하고 실행은 다음 단계로 연기.

---

## 4. 습득(Internalization) 프로세스 — Layer 3 → Layer 2 승격

```
판단 조건: Frontmatter confidence ≥ 0.7 AND accessed_count ≥ 5
  ↓
승격 대상 문서 확인 (사용자 또는 자동)
  ↓
대상 Layer 2 디렉토리 결정 (태그 기반 분류 제안)
  ↓
파일 이동: 03_External/ → 02_Derived/{category}/
  ↓
Frontmatter 갱신: layer 3→2, updated 날짜, confidence/source 필드 정리
  ↓
인바운드 링크 재작성 (backlink-index.json 기반)
  ↓
backlink-index.json 재구축
```

**롤백**: 파일 이동 전 원본 경로를 기록. 실패 시 원복 가능.

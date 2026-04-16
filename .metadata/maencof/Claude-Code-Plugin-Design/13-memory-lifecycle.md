---
created: 2026-02-28
updated: 2026-04-16
tags: [memory, lifecycle, transition, internalization, session-recap]
layer: design-area-3
---

# 기억 라이프사이클 + 전이 조건

## 목적

단기·중기·장기 기억의 정의와, 각 Layer 간 전이를 언제·어떻게 실행하는지를 명시한다.

관련 문서: [5-Layer 지식 모델](./02-knowledge-layers.md) | [Frontmatter 스키마](./05-frontmatter-schema.md) | [크래시 복구](./15-crash-recovery.md)

---

## 1. 기억 유형 정의

| 유형 | Layer | 지속 범위 | 특성 |
|------|-------|----------|------|
| 단기 기억 | Layer 4 | 세션 내 | 작업 컨텍스트. 세션 종료 시 아카이브 또는 삭제 |
| 중기 기억 | Layer 3A/B/C | 세션 간 | 외부 지식 임시 보관. `confidence`로 추적. 서브레이어별 관리 |
| 장기 기억 | Layer 1-2 | 영구 | 내재화 완료. 의도적 삭제 외 유지 |

---

## 2. 전이 조건 테이블

| 전이 | 조건 | 트리거 | Level 0-1 | Level 2-3 |
|------|------|--------|-----------|-----------|
| L4→L3A/B/C | 세션 종료 + 보존 결정 + 대상 서브레이어 선택 | SessionEnd | 명시적 승인 | 제안 후 확인 |
| L3A→L2 | confidence ≥ 0.7 AND accessed_count ≥ 5 | SessionStart 지연 전이 | 명시적 승인 | 자동 전이 |
| L3B→L2 | confidence ≥ 0.7 AND accessed_count ≥ 5 | SessionStart 지연 전이 | 명시적 승인 | 자동 전이 |
| L3C→L2 | confidence ≥ 0.7 AND accessed_count ≥ 5 | SessionStart 지연 전이 | 명시적 승인 | 자동 전이 |
| L3A/B/C→삭제 | expires 경과 AND accessed_count = 0 | SessionStart 정리 | 명시적 승인 | 제안 후 확인 |
| L4→삭제 | 30일 경과 AND 미참조 | SessionStart 정리 | 자동 | 자동 |
| L5-Buffer→L3A/B/C | 사용자 분류 또는 시스템 분류 제안 | organize 스킬 | 명시적 승인 | 제안 후 확인 |
| L5-Buffer→L2 | 직접 내재화 (이미 처리된 지식) | organize 스킬 | 명시적 승인 | 자동 전이 |
| L5-Buffer→삭제 | 30일 경과 AND 미참조 | SessionStart | 명시적 승인 | 제안 후 확인 |
| L3A/B/C→L5-Boundary | 노드가 교차 레이어 커넥터로 지정 | organize 스킬 | 명시적 승인 | 자동 |

---

## 3. SessionStart Hook 지연 전이

```
1. .maencof-meta/transition-queue.json 읽기
2. Layer 3 스캔 → confidence/accessed_count/expires 조건 평가
3. Layer 4 스캔 → 30일 초과 + 미참조 문서 탐지
4. 전이 후보 목록 생성
5a. [Level 0-1] 사용자에게 제시, 승인 후 실행
5b. [Level 2-3] L3→L2 자동, 파괴적 삭제만 확인
6. fallback: /maencof:maencof-organize 수동 스킬 안내
```

Hook 타임아웃 내 불가 시: 목록 생성만 수행, 실행은 연기.

---

## 4. 습득 프로세스 — Layer 3A/B/C → Layer 2

```
confidence ≥ 0.7 AND accessed_count ≥ 5
  → 대상 Layer 2 디렉토리 결정 (태그 기반)
  → 파일 이동: 03_External/{relational|structural|topical}/ → 02_Derived/{category}/
  → Frontmatter 갱신: layer 3→2, sub_layer 필드 제거
  → backlink-index.json 재구축
```

롤백: WAL 기반 복구 ([크래시 복구](./15-crash-recovery.md) 참조).

---

## 5. Session Recap — 비전이 경로

SessionEnd 훅은 세션 내 다음 4요소를 집계해 `[maencof] Session Recap` 메시지로 노출한다:

| 요소 | 원천 | 설명 |
|------|------|------|
| 수렴 요건 | refine Phase 4 통과 항목 | 확정된 스펙 수 |
| 합의 전제 | refine Phase 2.5.a surfacing 후 유지된 전제 | 검증된 가정 |
| 잠정 원리 | think 산출 중 `category=principle`로 캡처된 후보 | 장기 보존 후보 원칙 |
| 미해결 긴장 | `category=refuted_premise` 중 재검토 표시된 전제 | Phase 2.5.b 기각 전제 |

이 recap 자체는 **전이(Layer 간 이동)가 아니며, 지식 트리에 자동 영속화되지 않는다**. 이유:
- 4요소는 세션 중 `.maencof-meta/pending-insights/`에 임시 적재됨
- 사용자가 명시적으로 영속화를 선언해야 Layer 이동이 발생함

### 명시 영속화 경로

| 요소 | 영속화 경로 | 결과 Layer |
|------|-----------|-----------|
| principle | `capture_insight(category=principle)` | L2-Derived |
| 운영 메모 | `dailynote_writer` | L5-Buffer |
| refuted_premise | (기본 폐기) | — |
| ephemeral_candidate | (기본 폐기) | — |

`refuted_premise`와 `ephemeral_candidate`는 `InsightCategoryFilter` 기본 정책에서 거부된다.
사용자가 `/maencof:maencof-insight --category refuted --accept`로 필터를 연 경우에만 L5-Buffer에 기록된다.

### 제어 스위치

- `.maencof-meta/dialogue-config.json::session_recap.enabled=false` → recap 메시지 미노출
- `env: MAENCOF_DISABLE_DIALOGUE`는 **meta-skill 주입에만** 영향하며 recap에는 영향 없음 (독립 축)

### 관련 구분

- `maencof-reflect` 스킬은 **볼트 관점 저지먼트 리포터**이며 session recap과 **직교**.
  reflect는 볼트 전체를 대상으로 판정 리포트를 생성하고, session recap은 현재 세션 내 pending 상태를 요약한다.

관련: [16 §5 대화 규율 통합 뷰](./16-plugin-architecture.md) | [17 §3 capture_insight](./17-mcp-tools.md) | [18 §7 비호출 Meta-skill](./18-skills.md)

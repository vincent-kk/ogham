---
created: 2026-03-18
updated: 2026-03-18
tags: [NPDP, session-summary, PL-agenda, design-philosophy, filid, ogham]
layer: 4
title: NPDP 핵심 고민 전체 종합 (2026-03-16~17 세션)
expires: 2026-04-17
---
# NPDP 핵심 고민 전체 종합 (2026-03-16~17 세션)

## 개요

2026-03-16~17 세션에서 Vincent의 NPDP 핵심 고민 8개를 Q&A 형식으로 구체화 완료.
이전 아젠다 4개([[04_Action/npdp-agenda-01-decomposition-flow]] ~ [[04_Action/npdp-agenda-04-review-verification]])를 포괄하고 대체한다.

## 전체 지도

### A. 코드 영역 (5대 과제)
| # | 주제 | 상태 | 핵심 결론 |
|---|------|------|----------|
| **A5** | 설계 사상과 소울 유지 | ✅ | 3대 원칙(S1/S2/S3), 비용함수=f(오류확률), 사전(ogham)/사후(filid) 분담 → [[04_Action/npdp-a5-development-soul]] |
| **A1** | 대량 코드 인지범위 제어 | ✅ | Zero Peer File Rule, God Fractal 진단, LCA 테스트 커버리지 (이슈 #14,#15,#16) |
| **A2** | 코드 무결성 검증 | ✅ | 7축 프레임워크(ISO 25010+CISQ+DORA), AI 핵심 위험 3축(유지보수성/신뢰성/보안), 상용 도구 활용 |
| **A3** | 맥락부패 방지 | ✅ | Lost in the Middle 대응, INTENT.md 크기 제한+inject. POC 완료, 실전 검증 필요 |
| **A4** | 테스트 검증 데이터 관리 | ✅ | 참 값 라이프사이클, 스펙-테스트 양방향 매핑(INTENT/DETAIL 기반), 히스토리 아카이브 |

### B. 기획 관리 영역 (3대 과제 → 2개로 통합)
| # | 주제 | 상태 | 핵심 결론 |
|---|------|------|----------|
| **B1** | 기획 분해 바운더리 & 게이트 | ✅ | 추상화↑=인간승인, ↓=AI자율. pruning은 시각적 도표→빠른 합의. 스펙 변경은 문서화→승인 |
| **B2+B3** | UX/시각처리 & 반응형 | ✅ | UI 생산(디자인 해석/생성)+UI 인식(CV E2E). ogham 외부 — CLI 또는 n8n 워크플로우 |

---

## 핵심 원칙 (전 영역 관통)

### 1. 비용 함수
cost = f(수정으로 인한 오류 발생 확률), NOT f(코드량).
LLM이 코드의 단위 가치를 떨어뜨렸으므로 코드를 다시 쓰는 건 싸다. 수정 과정에서 오류가 유입될 확률이 진짜 비용.

### 2. 사전/사후 분담 원칙
- 오류 전파 범위 큰 것 → 사전 방지 (ogham): S1 프랙탈 경계, S2 any 방출
- 오류 확률 낮은 것 → 사후 검증 (filid, PR 경계): S3 winglet 대체, 네이밍/포맷
- 코드(A 영역)와 기획(B 영역) 모두에 동일하게 적용

### 3. 인간 인지범위 최적화
인간은 세부를 보지 않고 경계와 구조를 본다.
- 코드: index.ts 경계, 아키텍처 도표
- 기획: 분해 결과의 시각적 도표
- PR: 핵심 3~5개 인간용 요약

### 4. 판단 제거 → 규칙화
모호한 판단이 필요한 규칙은 실패한다.
- "파일이 복잡하면 디렉토리로" (❌ 판단 필요) → "파일 금지" (✅ 기계적 강제)
- "any를 적게 써라" (❌) → "any 방출 금지" (✅ 린트로 강제)

---

## A5 상세: Vincent's Development Soul

→ [[04_Action/npdp-a5-development-soul]] 참조.

근본 원리: **낭비 없는 정밀함** (인지적·타입·연산 낭비 모두 거부)

3대 원칙:
- **S1 프랙탈 봉인**: 모든 단위는 프랙탈, 외부는 index.ts export만, 제로 피어 파일 규칙, LCA 규칙
- **S2 강타입 구체화**: any 봉인(contain), 방출(emit) 절대 금지, TS 추론 한계 현실 타협
- **S3 단위성능 우선**: 구조적 우아함보다 실행 효율, @winglet/common-utils 고속 라이브러리

인지범위 이중 구조:
- LLM용 → 프랙탈 구조 (FCA, INTENT.md + DETAIL.md)
- 인간용 → index.ts 경계, LCA 규칙, ~100줄

---

## 관련 문서
- [[04_Action/npdp-a5-development-soul]]
- [[03_External/structural/filid-plugin]]
- [[03_External/structural/fca-ai-architecture]]
- [[03_External/topical/aac-npdp-framework]]
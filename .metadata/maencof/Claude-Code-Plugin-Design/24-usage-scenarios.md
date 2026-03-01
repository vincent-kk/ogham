---
created: 2026-02-28
updated: 2026-02-28
tags: [usage-scenarios, ai-agent, human, token-optimization]
layer: design-area-6
---

# 사용 시나리오 — AI(A1-A4) + 인간(H1-H3)

## 개요

AI 에이전트(Primary)와 인간(Secondary) 두 사용 대상의 시나리오를 정의한다.
두 경로 모두 동일한 core/ 알고리즘과 .maencof/ 인덱스를 사용한다.

관련 문서: [검색 엔진 개요](./07-search-engine-overview.md) | [MCP 도구 명세](./17-mcp-tools.md) | [스킬 명세](./18-skills.md)

---

## 1. AI 에이전트 시나리오

### A1: 맥락 기반 관련 문서 탐색
Hook이 프롬프트에서 키워드 추출 → 인덱스 매칭 → system-reminder 주입
→ 에이전트가 kg_search/kg_context 호출 → 토큰 예산 내 컨텍스트 수신.
**토큰 절약**: 수백 문서 대신 관련 10개 경로+요약. 절약률 90%+.

### A2: 역방향 링크 추적
kg_navigate로 특정 문서의 인바운드 링크 + Layer 정보 + SA 점수 조회.
"이 가치관이 어떤 행동에 영향을 미치는가" 분석.

### A3: 전역 질문 처리 (Phase 2+)
kg_community로 사전 탐지 커뮤니티 요약 조회.
개별 문서 읽기 없이 "핵심 주제" 답변 가능.

### A4: 토큰 예산 관리
kg_context의 token_budget 파라미터로 엄격한 예산 제어.
활성화 점수 내림차순 → 예산 내 최대 노드 메타데이터 + 상위 3개 전문 포함 권장.

---

## 2. 인간 시나리오

### H1: 명시적 검색
`/maencof:explore "키워드"` → SA 실행 → 마크다운 테이블 결과.

### H2: 네비게이션 맵
`/maencof:explore /path/to/doc.md` → 연결 맵 (인/아웃 링크, PageRank, WP 유사도).

### H3: 인덱스 건강도 진단
`/maencof:diagnose` → 고아 문서, 깨진 링크, 순환 참조 보고서 + 권장 조치.

---

## 3. 흐름 요약

```
AI 경로:  Hook(자동 주입) → MCP(kg_*) → 토큰 최적화 JSON
인간 경로: Skill(명시 호출) → MCP(내부) → 마크다운 포맷
```

차이점: 트리거(자동 vs 명시)와 출력(JSON vs 마크다운)뿐.

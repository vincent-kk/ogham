> **[통합 완료 안내]** 이 문서 세트의 내용은 [Claude-Code-Plugin-Design](../../Claude-Code-Plugin-Design/INDEX.md) 통합 설계 문서(문서 07~12, 24~26)에 병합되었습니다. 최신 설계는 통합 문서를 참조하십시오. (2026-02-28)

# Markdown Knowledge Graph Search Engine -- 고수준 아키텍처 설계문서

## 개요

디렉토리 구조(Tree)와 링크 그래프(Graph)로 구성된 마크다운 파일 저장소에서 특정 맥락을 검색하거나 추론하는 도구의 아키텍처 설계문서이다. 메타데이터를 사전 생성하고 관리하여 컨텍스트 윈도우와 토큰을 절약하는 것이 핵심 목적이다.

## 이론적 기반

본 설계문서는 [Markdown Graph Knowledge Discovery Algorithm](../Markdown-Graph-Knowledge-Discovery-Algorithm/INDEX.md) 연구 보고서와 [트리-그래프 하이브리드 지식 아키텍처 연구 제안서](../../Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/INDEX.md)를 기반으로 한다. 연구 보고서의 알고리즘(지식 그래프 전환, 확산 활성화 모델, 하이브리드 검색)을 실용적 도구로 전환하는 것이 목표이다.

## 설계 원칙

1. **자족적 아키텍처**: LLM API, 벡터 DB, 임베딩 모델 없이도 핵심 기능이 동작해야 한다
2. **단계적 독립 가치**: 각 Phase가 독립적으로 릴리즈 가능한 완결된 가치를 제공해야 한다
3. **AI 에이전트 우선**: Primary persona는 AI 에이전트이며, 인간 인터페이스는 포맷팅 레이어로 파생한다
4. **인덱스는 파생물**: `.maencof/` 전체를 삭제해도 정보 손실이 없어야 한다. 원본 마크다운이 항상 진실의 원천이다
5. **알고리즘 우선순위 큐**: 연구 보고서의 알고리즘을 난이도/의존성/가치 기준으로 우선순위를 매기고 점진적으로 실현한다

## 목차

- [00. 목적과 핵심 개념](./00-purpose-and-concepts.md) -- 문제 정의, 핵심 개념, 비범위 선언
- [01. 시스템 구성요소](./01-system-components.md) -- 7개 핵심 모듈의 책임, 인터페이스, 의존 관계
- [02. 데이터 흐름](./02-data-flow.md) -- 오프라인/온라인 파이프라인, 증분 갱신 전략
- [03. 메타데이터 전략](./03-metadata-strategy.md) -- 3단계 전략 비교(구조/의미/전체 지식 그래프)와 권장 경로
- [04. 구현 형태](./04-implementation-form.md) -- MCP/Hook/Skill/CLI 비교와 하이브리드 조합
- [05. 핵심 설계 결정](./05-design-decisions.md) -- 6개 핵심 결정, 트레이드오프, 알고리즘 우선순위 큐
- [06. 사용 시나리오](./06-usage-scenarios.md) -- AI 에이전트용, 인간용 시나리오
- [07. 한계와 제약](./07-constraints-and-limitations.md) -- 기술적 한계, Pre-mortem 실패 시나리오

## 범위

**포함**: 목적, 구성요소, 데이터 흐름, 메타데이터 전략, 구현 형태 비교, 핵심 설계 결정, 사용 시나리오, 한계

**미포함**: 구현 디테일, API 스펙, 데이터 스키마 상세 정의, 성능 요구사항 수치, 테스트 전략

## 대상 환경

- **패키지**: `@ogham/maencof` (Claude Code 플러그인)
- **런타임**: TypeScript, Node.js >=20, ESM
- **대상 저장소**: 100줄 이하 원자적 마크다운, 디렉토리 트리 + 상대 경로 링크, YAML Frontmatter

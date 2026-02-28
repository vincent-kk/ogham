## **3\. 초기 맥락 구축을 위한 대규모 프랙탈 순회 및 조립 전략**

새로운 레거시 시스템이나 방대한 크기의 저장소에 AI 에이전트 시스템이 최초로 투입될 때, 전통적인 텍스트 검색 도구처럼 파일 시스템의 루트 디렉토리부터 하향식으로 모든 코드를 스캔하는 것은 치명적인 오류를 낳는다.1 이러한 접근은 에이전트의 컨텍스트 윈도우를 의미 없는 유틸리티 코드나 외부 라이브러리로 가득 채워, 장기 추론 능력의 붕괴를 초래하기 때문이다.15 따라서 FCA-AI는 추상 구문 트리(AST) 파싱과 의존성 그래프에 기반한 다중 에이전트 순회 전략을 채택하여 맥락 문서를 상향식으로 조립한다.16

### **3.1. 위상 정렬을 통한 의존성 최우선(Dependencies First) 순회**

초기화 프로세스의 핵심은 논리적 의존성 구조를 파악하는 데 있다. 시스템 내비게이터(Navigator) 에이전트는 소스 코드 전체를 대상으로 Tree-sitter와 같은 구문 분석 도구를 활용하여 추상 구문 트리(AST)를 추출하고, 클래스 상속 및 함수 호출 관계를 추적하여 거대한 방향성 비순환 그래프(Dependency DAG)를 구축한다.16

문서 생성 및 순회는 이 그래프를 바탕으로 위상 정렬(Topological Sorting)을 수행하여 '의존성 최우선(Dependencies First)' 원칙을 엄격하게 따른다.16 이는 외부 의존성이 전혀 없는 최하단의 부속품(Leaf Node)이나 독립된 순수 프랙탈에서부터 시작하여, 상위 호출자 방향인 루트(Root)를 향해 상향식(Bottom-up)으로 올라가며 맥락 문서를 생성함을 의미한다.1 특정 상위 프랙탈의 CLAUDE.md와 SPEC.md를 작성할 시점이 되면 하위 모듈들의 기능이 이미 요약 및 문서화되어 있으므로, 문서 작성 에이전트는 무한한 배경 지식 탐색의 늪에 빠지지 않고 자신이 담당하는 현재 노드의 비즈니스 로직에만 집중할 수 있게 된다.16

### **3.2. 기업 아키텍처 연동 및 모델 컨텍스트 프로토콜(MCP) 주입**

초기 맥락은 소스 코드에만 한정되지 않는다. 기업 환경에서는 Jira, Confluence, 슬랙 논의 내역 등 코드 외부에 흩어진 지식을 통합해야만 완벽한 의도 추론이 가능하다.18 이른바 NxM 통합 문제(다수의 모델과 다수의 데이터 소스 간의 연결 난제)를 해결하기 위해, 에이전트 시스템은 '모델 컨텍스트 프로토콜(MCP, Model Context Protocol)' 서버를 활용한다.1

순회 과정 중 지식 그래프 구축을 담당하는 Context Manager 에이전트는 MCP 클라이언트로서 사내 다양한 MCP 서버(문서 서버, 지식 그래프 서버 등)에 접근한다.20 에이전트는 특정 프랙탈의 도메인 경계를 식별할 때 MCP를 통해 레거시 제품 요구사항 문서(PRD)나 API 계약 문서를 쿼리하여 가져오고, 이를 정제된 지식으로 압축하여 최초의 SPEC.md에 주입한다.18 이 거대한 병렬 순회가 끝나면 시스템은 파편화된 코드의 집합이 아니라, 프랙탈 단위로 의도와 명세가 완벽하게 결합된 전사적 지식 그래프(AI Context Skyscraper)를 보유하게 된다.22

#### 참고 자료

1. FCA-AI 아키텍처 심층 리서치 및 해결 방안
15. Prometheus: Towards Long-Horizon Codebase Navigation for Repository-Level Problem Solving \- arXiv, 2월 21, 2026에 액세스, [https://arxiv.org/html/2507.19942v2](https://arxiv.org/html/2507.19942v2)
16. DocAgent: A Multi-Agent System for Automated Code Documentation Generation \- arXiv, 2월 21, 2026에 액세스, [https://arxiv.org/html/2504.08725v1](https://arxiv.org/html/2504.08725v1)
18. The Model Context Protocol: The Architecture of Agentic Intelligence | by Greg Robison, 2월 21, 2026에 액세스, [https://gregrobison.medium.com/the-model-context-protocol-the-architecture-of-agentic-intelligence-cfc0e4613c1e](https://gregrobison.medium.com/the-model-context-protocol-the-architecture-of-agentic-intelligence-cfc0e4613c1e)
20. Advancing Multi-Agent Systems Through Model Context Protocol: Architecture, Implementation, and Applications \- arXiv.org, 2월 21, 2026에 액세스, [https://arxiv.org/html/2504.21030v1](https://arxiv.org/html/2504.21030v1)
22. A guidebook to mastering the architecture of context \- STAC Research, 2월 21, 2026에 액세스, [https://stacresearch.com/news/the-ai-context-skyscraper/](https://stacresearch.com/news/the-ai-context-skyscraper/)

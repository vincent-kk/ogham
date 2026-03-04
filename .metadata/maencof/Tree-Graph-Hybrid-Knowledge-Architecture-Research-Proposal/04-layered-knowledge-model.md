## **4\. 지식의 층위 모델 (Layered Knowledge Model)**

트리와 그래프 원리를 적용하여 한 개인을 표상하는 지식을 5개의 층위로 구분한다. 아키텍처 버전 2.0.0에서는 Layer 3의 3차원 방향성 분할과 Layer 5의 이중 역할 재정의를 도입하여, 외부 지식의 인지적 병목을 구조적으로 해소하고 맥락 메타데이터의 역할을 정밀화하였다.

### **Layer 1: 핵심 자아 (Core Identity)**

* **트리 구조:** 최상위 단일 디렉토리(/01\_Core). 폴더의 깊이를 두지 않고 원자적 파일(values.md, boundaries.md 등)을 평면적으로 배치.
* **그래프 특성:** 네트워크의 **'중심 노드(Hub)'**. 다른 모든 레이어의 문서들로부터 가장 많은 인바운드 링크(Inbound Links)를 받는 뿌리 역할을 한다.

### **Layer 2: 내재화 및 파생된 자아 (Derived & Internalized Self)**

* **트리 구조:** 지식, 기술, 경험, 인간관계, 페르소나 등을 분류하기 위해 **다중 겹 디렉토리(Nested Directories)** 활용 (예: /02\_Derived/skills/programming/).
* **그래프 특성:** Layer 1(핵심 자아)의 링크를 상속받아 구체화되며, 각 노드들끼리 가장 복잡하고 촘촘한 상호 연결(Cross-linking)을 형성한다.

### **Layer 3: 비내재화/외부 지식 (External/Reference Knowledge) — 3차원 방향성 분할**

기존의 단일 계층 Layer 3는 아키텍처 버전 2.0.0에서 사용자의 '외부'를 정의하는 **방향성(Directionality)**에 따라 세 가지 서브레이어로 확장 분할된다. 이 분할의 이론적 근거는 인지 신경과학의 Who/What/Where 시스템, 브론펜브레너의 생태학적 체계 이론, 나하피엣과 고샬의 사회 자본 이론에 기반한다. 상세한 논증은 [§7 Layer 3 방향성 확장 모델](./07-l3-directional-expansion.md)을 참조한다.

| 분류 차원 | Layer 3A (관계적/대인적) | Layer 3B (구조적/제도적) | Layer 3C (의미론적/주제적) |
| :---- | :---- | :---- | :---- |
| **핵심 대상** | 인물, 지인, 전문가, 멘토 | 회사, 커뮤니티, 프로젝트 팀 | 관심사, 학문, 기술, 문헌 |
| **이론적 기반** | 트랜스액티브 메모리(TMS) | Ba 이론 / SECI 모델 | 행위자-네트워크 이론(ANT) |
| **정보 성장 속도** | 점진적 | 단계적 | 기하급수적 |

#### **Layer 3A: 관계적/대인적 외부 (Relational & Interpersonal)**

* **트리 구조:** `/03_External/relational/` 디렉토리. 인물별 프로파일 파일을 배치한다.
* **그래프 특성:** **Pointer 노드 (Who knows what)**. "누가 무엇을 알고 있는지"에 대한 메타 기억을 담는 포인터 역할을 한다. Layer 3C의 주제 노드와 `REFERENCES` 엣지로 연결되어, 특정 지식의 출처 또는 전문가를 즉시 추적할 수 있다.
* **Frontmatter:** `layer: 3`, `sub_layer: relational`
* **SA 감쇠 인자:** 0.75

#### **Layer 3B: 구조적/제도적 외부 (Structural & Institutional)**

* **트리 구조:** `/03_External/structural/` 디렉토리. 조직/집단별 맥락 파일을 배치한다.
* **그래프 특성:** **Context 노드 (Where context is)**. 지식이 생성되고 통용되는 '장(Ba)'의 역할을 하며, 소속된 조직의 규범과 맥락을 캡슐화한다. Layer 3A(인물)와 `BELONGS_TO` 엣지로, Layer 3C(주제)와 `APPLIES_IN` 엣지로 연결된다.
* **Frontmatter:** `layer: 3`, `sub_layer: structural`
* **SA 감쇠 인자:** 0.80

#### **Layer 3C: 의미론적/주제적 외부 (Semantic & Topical)**

* **트리 구조:** `/03_External/topical/` 디렉토리. 관심사, 학문, 기술, 문헌 등 개념 단위의 노드를 배치한다.
* **그래프 특성:** **Leaf 노드 (What it is)**. 기존 Layer 3의 외곽 노드 역할을 계승하며, 데이터 증식이 가장 빠른 영역이다. 개인용 '의미론적 계층(Semantic Layer)'으로 작동하여, 3A(인물) 및 3B(조직)와 메타데이터 차원에서 교차 연결된다.
* **Frontmatter:** `layer: 3`, `sub_layer: topical`
* **SA 감쇠 인자:** 0.85

### **Layer 4: 행동 및 작업 기억 (Action & Working Context)**

* **트리 구조:** 스케줄, Todo, 루틴을 관리하는 **시간 기반 디렉토리**(예: /04\_Action/2026/02/).
* **그래프 특성:** 일시적으로 존재하며 특정 시점에만 다른 노드(Layer 1\~3)들과 강하게 연결되는 **'휘발성/활성 노드'**. 행동 노트 내의 링크를 통해 해당 행동의 근본적 이유(Layer 1)나 필요 기술(Layer 2)을 추적할 수 있다.

### **Layer 5: 맥락 메타데이터 (Context & Domain Metadata) — 이중 역할 재정의**

아키텍처 버전 2.0.0에서 Layer 5는 단순한 메타데이터 저장소를 넘어 **두 가지 독립된 역할**로 재정의된다. 기존의 `persons/`, `domains/` 디렉토리는 유지하되, Buffer와 Boundary라는 두 축이 추가된다. 상세한 논증은 [§8 Layer 5 Buffer/Boundary 재정의](./08-l5-redefinition.md)를 참조한다.

#### **L5-Buffer: 미분류 정보 임시 저장소**

* **트리 구조:** `/05_Context/buffer/` 디렉토리. 아직 범주화되지 않은 대화 조각, 임시 메모, 미분류 스크랩을 임시 보관한다.
* **그래프 특성:** **Temporary 노드**. 다른 레이어와의 연결이 미확정 상태이며, 사용자의 분류 또는 시스템의 내용 분석을 거쳐 L3A/B/C 또는 L2로 승격(Promote)되거나, 설정 가능한 만료 기간(기본 30일) 경과 후 삭제 후보로 전환된다.
* **Frontmatter:** `layer: 5`, `sub_layer: buffer`
* **SA 감쇠 인자:** 0.95

#### **L5-Boundary: 경계 객체 계층**

* **트리 구조:** `/05_Context/boundary/` 디렉토리. MOC(Map of Content), 프로젝트 대시보드 등 경계 객체(Boundary Objects)를 배치한다. 기존 `persons/`, `domains/` 디렉토리는 이 경계 객체의 특수한 인스턴스로 기능한다.
* **그래프 특성:** **Bridge 노드 (높은 fan-out)**. L3A/3B/3C 간의 교차 연결을 수행하는 핵심 허브 역할을 하며, `CROSS_LAYER` 엣지 타입을 통해 서로 다른 방향성의 외부 지식을 특정 실행 맥락 안에서 통합한다. 여러 레이어의 문서들로부터 인바운드 참조를 받는다.
* **Frontmatter:** `layer: 5`, `sub_layer: boundary`
* **SA 감쇠 인자:** 0.60

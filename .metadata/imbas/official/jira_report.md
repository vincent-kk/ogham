# **애자일 소프트웨어 개발 생태계의 표준 관습 및 Jira 티켓 계위의 심층 분석과 정립**

## **서론: 애자일 철학의 진화와 소프트웨어 개발 생태계의 분류 체계 도래**

소프트웨어 개발 생태계에서 2001년 발표된 애자일(Agile) 선언문은 프로젝트 관리, 팀 협업, 그리고 조직의 변화를 주도하는 다양한 프레임워크에 영감을 주며 산업 전반의 패러다임을 전환시켰다. 초기 애자일의 도입은 10명 내외의 소규모 개발 팀이 고객에게 가치를 빠르고 빈번하게 전달하며, 작업 프로세스 자체를 지속적으로 반복하고 개선하는 데 초점을 맞추었다. 이러한 철학을 실무에 적용하기 위해 스크럼(Scrum), 칸반(Kanban), 스크럼반(Scrumban), 익스트림 프로그래밍(XP)과 같은 다양한 팀 수준의 프레임워크가 등장하여 생태계의 표준으로 자리 잡았다. 특히 스크럼은 경험주의적 접근을 바탕으로 소규모 교차 기능 팀(Cross-functional team)이 '스프린트(Sprint)'라는 짧은 주기 내에 제품과 서비스를 제공하는 경량화된 프레임워크로서, 전체 애자일 팀의 66%가 사용할 만큼 압도적인 인기를 누리고 있다. 반면 칸반은 전체 팀이 칸반 보드를 소유하며 작업의 시각화, 진행 중인 작업(WIP, Work In Progress)의 제한, 흐름(Flow)의 관리에 집중함으로써 유연성을 극대화하는 방식을 취한다.  
그러나 디지털 트랜스포메이션의 가속화로 인해 수십, 수백 개의 팀이 협력해야 하는 엔터프라이즈 환경이 조성되면서, 소규모 팀 단위의 애자일 방법론만으로는 조직 전체의 전략적 정렬(Strategic Alignment)을 달성하기에 역부족이라는 사실이 명백해졌다. 이에 따라 조직의 거시적 비전을 일선 개발팀의 코드 단위까지 연결하기 위해 SAFe(Scaled Agile Framework), LeSS(Large Scale Scrum), DA(Disciplined Agile), Spotify 모델 등 확장형 애자일 프레임워크가 고안되었다. 이러한 프레임워크들은 전략, 포트폴리오, 프로그램, 그리고 팀 단위에 이르는 다층적인 구조를 제시하며 복잡성을 관리한다.  
이러한 애자일 생태계의 진화 속에서, 세계적으로 가장 널리 사용되는 이슈 추적 및 프로젝트 관리 플랫폼인 Jira(지라)는 조직의 작업을 정의하고, 분할하며, 추적하는 핵심 인프라로 기능하고 있다. Jira는 본질적으로 애자일의 작업 분할 철학을 소프트웨어 시스템으로 구현한 플랫폼이다. 하지만 생태계가 다원화됨에 따라 조직 내 각 부서가 사용하는 프레임워크와 용어가 혼재하게 되었고, 특히 확장형 애자일 프레임워크(예: SAFe)에서 사용하는 용어와 Jira가 기본적으로 제공하는 계층 및 티켓 용어 간에 심각한 '의미론적 불일치(Semantic Dissonance)'가 발생하기 시작했다. 따라서 조직이 애자일의 이점을 극대화하기 위해서는 단순히 도구를 도입하는 것을 넘어, 애자일 생태계의 범용적인 관습을 종합하여 Jira 내에서 각 티켓(이슈)이 가지는 계위의 표준값을 엄밀히 정의하고 각 계위의 본질적 개념을 정립하는 과정이 필수적이다. 본 보고서는 Jira 생태계의 근간을 이루는 '이슈(Issue)'의 개념부터 미시적인 '부작업(Sub-task)', 중간 단계의 '스토리(Story)'와 '작업(Task)', 거시적인 '에픽(Epic)'과 '이니셔티브(Initiative)', 그리고 확장형 프레임워크의 '프로그램(Program)' 수준에 이르기까지 모든 계위의 표준값과 운영 관습을 심층적으로 분석한다.

## **기반 아키텍처: Jira에서 '이슈(Issue)'의 존재론적 의미**

Jira의 계위를 논하기에 앞서, 시스템의 가장 근본적인 정보 단위인 '이슈(Issue)'의 개념을 명확히 할 필요가 있다. 일상적인 언어에서 이슈는 주로 '문제'나 '논쟁거리'를 의미하지만, Jira의 데이터베이스 아키텍처 내에서 이슈는 시스템을 구성하는 가장 기초적인 원자 단위이자 '수행되어야 할 작업의 기본 단위(A unit of work)'를 지칭한다.  
Jira 환경에서 버그, 소프트웨어 기능 개발 요청, IT 헬프데스크의 지원 요청, 혹은 휴가 신청서에 이르기까지 시스템에 입력되는 모든 독립적인 객체는 본질적으로 하나의 '이슈'로 간주된다. 각 이슈는 해당 작업의 맥락을 정의하는 여러 구성 요소를 내포하고 있으며, 여기에는 제목, 설명, 우선순위, 담당자, 현재 상태 등이 포함된다. 또한, 사용자 정의 필드(Custom fields), 첨부 파일, 댓글 등을 통해 작업이 진행되는 모든 단계에서 필요한 상세 정보를 캡슐화하는 역할을 수행한다.  
애자일 관점에서 이슈 관리가 중요한 이유는 팀의 생산성과 가시성을 직접적으로 좌우하기 때문이다. 투명한 이슈 관리는 팀이 병목 현상을 식별하고 우선순위를 명확히 하며, 중요한 마감일을 놓칠 위험을 줄이는 데 핵심적인 역할을 한다. 따라서 Jira는 단순히 이슈를 평면적으로 나열하는 것을 넘어, 프로젝트의 전략적 목표부터 미세한 실행 단계까지를 논리적으로 연결하기 위해 이슈 간의 부모-자식 관계를 형성하는 '계위(Hierarchy)' 구조를 도입하였다. 이 계층 구조는 크게 Atlassian이 기본적으로 제공하는 3단계의 핵심 계층과, 고급 기능을 통해 확장할 수 있는 상위 계층으로 나뉘어 구성된다.

## **Jira의 코어 계위 모델: 기본 3단계 표준값 정립**

Atlassian이 정의하는 Jira의 기본 구조(Out-of-the-box)는 대부분의 소규모 및 중규모 애자일 팀의 관습을 충실히 반영하여 크게 3개의 핵심 레벨로 구성된다. 이 기본 계위는 복잡성을 최소화하면서도 일상적인 프로젝트 관리에 필요한 충분한 가시성을 제공하도록 설계되었다. 시스템 내부적으로 Jira는 각 계위에 숫자 레벨을 부여하여 구조의 위계를 관리한다. 기본적으로 Level 1은 대규모 작업(Epic), Level 0은 표준 작업 단위(Story, Task, Bug), Level \-1은 미시적 작업 단위(Sub-task)로 설정되어 있다.  
아래 표는 각 계위별 티켓의 목적뿐만 아니라, \*\*동일 계위(특히 Level 0\) 내에서도 구분되는 명확한 생성 주체(Creator)와 담당자(Assignee)\*\*를 요약한 핵심 표준값이다. 이 표를 기준으로 하위 계층에 대한 상세 개념을 정립한다.

| Jira 계위 레벨 | 티켓 유형 (Issue Type) | 핵심 개념 및 목적 | 주 생성 주체 (Creator) | 주 담당자 (Ownership) | 소요 타임박스 (Timebox) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Level 1** | **에픽 (Epic)** | 전략적 목표와 연결된 대규모 기능 덩어리로 하위 티켓을 캡슐화 | 프로덕트 매니저 (PM) / 오너 (PO) | 프로덕트 매니저 / 오너 | 수 주 \~ 수 개월 (통상 1분기 이내) |
| **Level 0** | **스토리 (Story)** | 사용자 관점의 비즈니스 가치 및 기능적 요구사항 명세 | PO, 비즈니스 분석가 (BA) | 애자일 팀 (교차 기능) | 단일 스프린트 이내 (1\~4주) |
| **Level 0** | **작업 (Task)** | 기술적 유지보수, 아키텍처 지원, 인프라 구축 등 개발자 중심의 행동 | 솔루션 아키텍트, 테크 리드, 개발자 | 소프트웨어 개발자 | 단일 스프린트 이내 (1\~4주) |
| **Level 0** | **버그 (Bug)** | 시스템 상의 결함, 오류, 기술적 오작동의 추적 및 해결 | QA, 테스트 엔지니어(SDET), 사용자 | 소프트웨어 개발자 | 단일 스프린트 이내 |
| **Level \-1** | **부작업 (Sub-task)** | 스토리 및 작업을 완수하기 위한 물리적, 원자적 실행 단계 (코드 작성 등) | 일선 소프트웨어 개발자 | 소프트웨어 개발자 | 수 시간 \~ 1일 이내 |

*Table 1: Jira 코어 계위 (기본 3단계) 티켓의 표준 속성 및 생성 주체 비교*

### **Level 1: 에픽 (Epic) \- 거시적 작업 단위와 가치 캡슐화**

Jira의 기본 계위 구조에서 최상단에 위치하는 Level 1은 전통적으로 '에픽(Epic)'이라는 명칭을 사용한다. 애자일 방법론에서 에픽은 단일 스프린트 내에 완료될 수 없는, 더 작고 관리 가능한 여러 개의 조각으로 분할되어야 하는 대규모 작업 덩어리(Large bodies of work)를 의미한다.  
에픽은 주로 제품의 주요 기능, 전략적 이니셔티브의 하위 테마, 또는 거대한 비즈니스 요구사항을 캡슐화하는 컨테이너의 역할을 수행한다. 예를 들어, 한 기업이 우주로 로켓을 발사하려는 원대한 목표를 가졌을 때, "1분기 런칭을 위한 스트리밍 서비스 개선"과 같은 목표가 하나의 에픽으로 정의될 수 있다. 이 단일 에픽 안에는 데스크톱 사용자를 위한 전체 화면 버튼 추가, 모바일 사용자를 위한 수직 라이브 피드 생성 등 다양한 하위 스토리들이 포함된다.  
에픽의 생명주기는 일반적인 티켓보다 훨씬 길게 설정된다. 애자일 팀은 통상적으로 한 분기(Quarter) 동안 약 2\~3개의 에픽을 완료하는 것을 목표로 삼으며, 에픽 자체는 여러 차례의 스프린트에 걸쳐 지속적으로 작업된다. 업무의 범위가 넓기 때문에 단일 개발자가 아닌 여러 교차 기능 팀원의 협업을 필요로 한다. 담당자(Ownership)와 생성(Creator) 관점에서 볼 때, 에픽은 일선 개발자가 아닌 비즈니스 요구사항을 총괄하는 프로덕트 매니저(PM)나 프로덕트 오너(PO)에 의해 배타적으로 소유되고 관리되는 것이 일반적인 관습이다. 고위 경영진이나 엔지니어링 책임자(Head of Engineering)와 같은 주요 이해관계자에게 진척 상황을 보고할 때, 개별 스토리 수준의 보고는 정보 과부하를 초래하므로, 에픽 수준에서 전략적 목표의 달성 여부를 논의하는 것이 애자일의 표준 소통 방식이다.

### **Level 0: 스토리, 작업, 버그 \- 실행의 핵심 모듈 (유형별 생성 주체 분리)**

Level 0은 애자일 개발팀이 일상적인 스프린트나 칸반 보드에서 다루는 실행의 핵심 계위이다. 에픽의 거대한 목표를 실제 수행 가능한 크기로 조각낸 것이며, 그 목적과 성격에 따라 스토리(Story), 작업(Task), 그리고 버그(Bug)라는 세 가지 주요 이슈 유형으로 세분화된다. 이 세 유형은 서로 동등한 위계인 Level 0에 위치하지만, \*\*어떤 목적으로 누가 생성하는가(Creator)\*\*에서 극명한 차이를 보이며, 이를 명확히 구분하는 것이 생태계의 핵심 관습이다.  
첫째, \*\*스토리(User Story)\*\*는 철저히 '최종 사용자(End-user)'의 관점에서 시스템의 요구사항을 기술한 티켓이다. 스토리는 기술적인 구현 방법보다는 사용자가 얻게 될 '비즈니스 가치'에 집중한다. 따라서 스토리를 생성하고 인수 조건(Acceptance Criteria)을 작성하는 주체는 주로 \*\*프로덕트 오너(PO)나 비즈니스 분석가(BA)\*\*이다. 이들은 비즈니스 요구사항을 바탕으로 스토리를 도출하여 백로그에 적재한다. 스토리는 단일 스프린트(일반적으로 1\~4주 이내)에 완료될 수 있는 크기로 작게 분할되어야 한다.  
둘째, \*\*작업(Task)\*\*은 스토리와 동일하게 하나의 이터레이션(스프린트) 내에 완료되도록 계획되는 업무 단위이지만, 최종 사용자의 직접적인 가치와는 거리가 먼 기술적, 관리적, 운영적 이행(Implementation)에 초점을 맞춘다. 데이터베이스 스키마 마이그레이션, 테스트 환경 구축, 성능 리팩토링, 혹은 기술 부채 해결과 같은 인프라 작업들이 여기에 속한다. 스토리가 비즈니스 인력에 의해 생성된다면, 작업(Task)은 스토리의 목표를 달성하기 위해 아키텍처를 설계하는 **솔루션 아키텍트, 테크 리드(Tech Lead), 혹은 시스템의 필요성을 인지한 소프트웨어 개발자**에 의해 생성되는 것이 명확한 구분의 핵심이다.  
셋째, **버그(Bug)** 또는 결함(Defect)은 소프트웨어의 구현 과정이나 실제 서비스 운영 환경에서 발견된 오류, 결함, 오작동을 명시하는 티켓이다. 버그 티켓의 주된 생성 주체는 코드를 작성한 개발자 본인이 아니라 품질을 검증하는 **QA 엔지니어, 테스트 자동화 담당자(SDET), 혹은 실제 오작동을 겪은 일반 사용자 및 지원팀**이 된다. 버그를 독립적인 Level 0 이슈로 승격시켜 관리하면 발생 이력과 수정 내역을 독립적으로 추적하고 품질 관리를 고도화할 수 있다.

### **Level \-1: 부작업 (Sub-task) \- 원자 단위의 실행 단계**

Jira 계위의 가장 아래 단계인 Level \-1은 부작업(Sub-task)으로 정의된다. 부작업은 Level 0에 위치한 스토리나 작업을 완료하기 위해 수행되어야 하는 가장 작고 구체적인 개별 행동이나 물리적인 단계(Actions or steps)를 나타낸다.  
부작업은 독립적으로 존재할 수 없는 종속적 객체이다. 반드시 부모 이슈(주로 Story나 Task)에 연결되어야 하며, 상위 티켓이 부여받은 비즈니스 가치나 기술적 목표를 달성하기 위한 수단으로 쓰인다. 부작업의 생성 주체는 기획자가 아니라 **해당 스토리를 할당받아 직접 코딩을 수행할 일선 소프트웨어 개발자**이다. 스프린트 계획 회의에서 개발자는 PO가 만든 스토리를 바탕으로 "유닛 테스트 코드 작성", "UI 마크업 코딩", "백엔드 API 연동" 등의 구체적인 부작업을 스스로 생성하고 자신에게 할당한다. 이러한 작업들은 철저히 시간 단위(Hours)로 추정되며, 약 4시간에서 최대 1일 이내에 소화할 수 있는 크기로 분할된다. 이 미시적 분할은 데일리 스크럼(Daily Scrum)에서 진척 상황을 투명하게 공유하고 병목 현상을 파악하는 데 필수적이다.

## **엔터프라이즈 환경에서의 계층 확장과 '이니셔티브(Initiative)'의 정립**

Jira가 제공하는 기본 3계층(Epic \-\> Story/Task \-\> Sub-task)은 단일 팀이나 단일 프로젝트 환경에서는 매우 효율적으로 작동한다. 그러나 기업이 성장하고 원격 근무가 확산되며, 전략 기획과 실행 관리를 밀접하게 결합하려는 경영진의 요구가 거세지면서 기본 계위 구조는 근본적인 한계에 직면하게 되었다. 다수의 부서와 수백 명의 개발자가 참여하는 전사적 목표를 단일 에픽 수준으로 관리하는 것은 사실상 불가능하며, 이에 따라 에픽을 묶어줄 더 높은 상위 계위의 필요성이 대두되었다.  
Atlassian은 이러한 엔터프라이즈의 요구를 수용하기 위해 Jira Premium 및 Enterprise 라이선스에 'Advanced Roadmaps (기존 명칭 Portfolio for Jira, 현재 Plans)' 기능을 통합하였다. 이 고급 기획 도구를 활용하면 조직은 Level 1(에픽) 위에 무한대에 가까운 커스텀 계층 레벨(Level 2 이상)을 생성하여 기업의 장기적인 비즈니스 포트폴리오를 모델링할 수 있다.  
이때 에픽의 부모 계위로서 가장 범용적으로 채택되는 표준 명칭이 바로 '이니셔티브(Initiative)'이다. 이니셔티브는 조직의 다수 팀과 여러 프로젝트가 공동으로 협력하여 달성해야 하는 최고 수준의 전략적 목적(High-level strategic objectives)이나 중장기 테마를 대변한다.  
하나의 이니셔티브는 수많은 에픽들의 집합체(Collections of epics)로 구성되며, 단일 팀의 역량을 훌쩍 뛰어넘는 거대한 공통 목표를 향해 조직을 정렬시킨다. 예를 들어, 에픽 단위가 "스트리밍 서비스의 라이브 피드 지연 시간 단축"이라면, 이를 포괄하는 이니셔티브는 "연내 스트리밍 서비스의 글로벌 인프라 비용 5% 절감 및 고객 만족도 10% 향상"과 같은 비즈니스 성과 중심의 목표가 된다. 이니셔티브의 실행 타임라인은 다수의 분기에서 길게는 수년(Odyssey, Legend 수준의 목표)에 걸쳐 전개되기도 한다.  
조직 내에서 이니셔티브 레벨을 셋업하고 관리하는 주체는 주로 고위 경영진(Senior leadership)이나 포트폴리오 관리자이다. 이들은 별도의 최상위 기획 프로젝트(Top-level planning project) 공간에서 이니셔티브 티켓을 생성하고 회사의 전략적 자금을 배분한다. 이후 개별 프로젝트 관리자나 일선 개발 부서의 리더들은 자신들의 Jira 프로젝트 내에 생성된 에픽들을 이 거대한 이니셔티브 티켓에 교차 프로젝트 링크(Cross-project link) 형태로 연결함으로써, 최상단부터 말단 서브태스크에 이르는 거대한 추적성(Traceability) 트리를 완성한다.  
시스템적으로 Advanced Roadmaps에서 이니셔티브와 같은 새로운 커스텀 계위를 셋업하는 과정은 다음과 같은 3단계 모범 사례를 따른다. 첫째, Jira 관리자가 설정에서 'Initiative'라는 이름의 새로운 표준 워크타입(Work type)을 생성한다. 둘째, 해당 워크타입을 조직의 워크타입 스키마(Work type scheme)에 드래그 앤 드롭으로 추가하여 기존 구조(에픽 위)에 자리 잡도록 한다. 셋째, 계획(Plan) 환경의 계층 구성(Hierarchy configuration) 메뉴로 이동하여 새로운 레벨을 생성하고 이를 앞서 만든 Jira 워크타입과 매핑한 후 저장한다. 이러한 구조화를 통해 경영진은 100여 개의 팀이 각기 다른 스프린트를 진행하고 있더라도, 하나의 로드맵 화면에서 전사 이니셔티브의 달성률을 실시간으로 롤업(Rolled-up)하여 모니터링할 수 있게 된다.

## **SAFe 도입에 따른 의미론적 불일치(Semantic Dissonance)와 '프로그램(Program)'의 이해**

앞서 논의한 Jira의 기본 구조와 이니셔티브 확장은 다소 유연한 조직에 적합하지만, 대규모 금융권이나 엔터프라이즈 소프트웨어 기업들이 앞다투어 채택하고 있는 SAFe(Scaled Agile Framework) 6.0 환경에서는 심각한 언어적, 구조적 충돌을 야기한다. SAFe는 포트폴리오(Portfolio), 대규모 솔루션(Large Solution), 프로그램(Program), 팀(Team)이라는 4개의 거대한 구성(Configurations)을 명시적으로 요구하는 가장 경직된(Rigid), 그러나 가장 널리 쓰이는 애자일 확장 프레임워크이다.  
문제의 핵심은 SAFe가 정의하는 티켓의 명칭과 크기가 Atlassian이 수십 년간 굳혀온 Jira의 명칭과 완벽하게 엇갈린다는 점에 있다. 이 간극을 이해하기 위해서는 SAFe의 핵심 계층인 '포트폴리오'와 '프로그램', 그리고 각 계층에서 생산되는 작업 항목의 본질을 분석해야 한다.

### **포트폴리오와 프로그램의 개념적 차이**

경영의 관점에서 포트폴리오(Portfolio)는 영구적이고 전략적인 기업의 비즈니스 유닛을 대표하며, 그 자체로 특정한 종료일이 존재하지 않는다. 포트폴리오 레벨에서는 기업의 자금을 어디에 투자할 것인가를 결정한다.  
반면, '프로그램(Program)'이라는 용어는 전통적인 프로젝트 관리에서 "단일 목적을 향해 통합적으로 관리되고 조정되는 다수 프로젝트의 집합"으로 정의된다. 예를 들어 "2025년까지 대기 오염을 50% 줄인다"는 명확하고 유한한 비전을 가진 프로그램 아래에 "버스 교체", "자전거 도로 확충"이라는 개별 프로젝트가 존재하는 것과 같다. 애자일 환경, 특히 SAFe 생태계 내에서 프로그램 레벨은 '애자일 릴리스 트레인(ART, Agile Release Train)'이라는 독특한 조직 형태로 치환된다.  
ART는 지속적으로 비즈니스 가치를 전달하기 위해 50명에서 125명에 이르는 다수의 애자일 팀이 공통의 백로그(Program Backlog)를 바탕으로 하나의 열차처럼 협력하는 거대한 장기 존속 팀(Long-lived team)이다. 포트폴리오가 '비즈니스의 방향'이라면, 프로그램(ART)은 그 방향을 실제로 구축하는 '실행 엔진'이다.

### **에픽(Epic)과 피처(Feature)의 역전 현상**

SAFe에서 정의하는 요구사항 계위의 최상단에는 '에픽(Epic)'이 존재한다. SAFe의 에픽은 솔루션 트레인이나 ART의 역량을 뛰어넘어 다수의 PI(Program Increment, 보통 8\~12주로 구성되는 프로그램 레벨의 타임박스)에 걸쳐 막대한 자본과 수 분기, 심지어 1년 이상의 시간이 소요되는 기업의 최대 이니셔티브를 의미한다. 즉, 앞서 설명한 Jira의 최상위 커스텀 레벨인 '이니셔티브'가 SAFe에서는 '에픽'으로 불린다.  
반대로, ART(프로그램 레벨)가 단일 PI 주기 내에 고객에게 가치를 전달하기 위해 정의하는 기능 단위를 SAFe에서는 '피처(Feature)'라고 명명한다. 하나의 피처는 다수의 팀 수준 티켓인 '스토리(Story)'로 분할된다. 정리하자면 SAFe의 계층은 \-\> \[Capability \[span\_109\](start\_span)\[span\_109\](end\_span)(선택)\] \-\> \[Feature\] \-\> \-\>의 형태를 띤다.  
그러나 앞서 고찰했듯 표준 Jira 시스템에서의 계위는 \[Jira Epic\] \-\> \-\>이다. SAFe를 도입한 기업이 Jira를 그대로 사용하게 될 경우, SAFe 지침서의 '피처(Feature)'를 시스템의 '에픽(Epic)'에 강제로 욱여넣거나, 반대로 시스템의 '에픽'을 SAFe의 거대 이니셔티브로 잘못 해석하여 일선 팀의 업무 크기가 통제 불능 상태로 비대해지는 치명적인 부작용이 발생한다. 과거 Jira는 내부 하드코딩 구조로 인해 에픽이라는 명칭을 피처로 변경하는 것조차 매우 까다로웠기 때문에, 수많은 엔터프라이즈 애자일 코치들이 도구와 프레임워크의 괴리로 인해 극심한 고통을 겪어야 했다.

### **해결책: Jira Align과 구조적 매핑의 모범 사례**

이러한 문제를 해결하고 수백, 수천 명의 인원이 SAFe 프레임워크에 맞춰 일관되게 행동할 수 있도록 Atlassian이 전면에 내세운 해법이 바로 엔터프라이즈급 플랫폼인 'Jira Align(지라 얼라인)'의 도입과 계위의 재편이다.  
Jira Align은 코어 Jira Software와는 구별되는 별도의 상위 계층 관리 플랫폼으로서, SAFe의 포트폴리오, 프로그램, 팀 조직 구조를 시스템에 완벽하게 반영한다. Jira Align을 활용하는 조직 생태계의 표준 관습은 철저한 '역할 분담'에 기반한다. 일선 애자일 개발팀은 기존과 동일하게 익숙한 코어 Jira 보드에서 단일 스프린트를 운영하며 스토리(Story)와 부작업(Sub-task/Task)의 처리에만 집중한다. 반면 프로덕트 매니저, 솔루션 아키텍트, 포트폴리오 관리자들은 Jira Align 플랫폼 내에서 프로그램 보드(Program boards)를 활용하여 분기별, 연간 로드맵을 기획하고 피처(Feature), 케이퍼빌리티(Capability), 에픽(Epic) 수준의 상위 항목을 관리한다. 두 시스템은 백그라운드에서 동기화되며, 코어 Jira의 스토리가 완료될 때마다 Jira Align의 피처 달성률이 갱신되는 구조를 띤다.  
만약 Jira Align과 같은 별도 솔루션을 도입하지 않고 Advanced Roadmaps(Jira Plans) 환경에서 SAFe 계위를 흉내 내야 한다면, 업계의 모범 사례는 다음과 같은 커스텀 매핑 전략을 따르는 것이다.

| 애자일 실행 단위 및 타임박스 | SAFe 6.0 명칭 (개념적 단위) | Jira 티켓 계위 (Advanced Roadmaps 적용 시 모범 매핑) |
| :---- | :---- | :---- |
| **포트폴리오 레벨** (다중 PI, 수 분기 \~ 수 년) | 포트폴리오 에픽 (Portfolio Epic) / 테마 (Theme) | **Level 3 이상:** Initiative, Theme 또는 Portfolio Epic으로 사용자 정의 |
| **대규모 솔루션 레벨** (단일 PI 이내, 8\~12주) | 케이퍼빌리티 (Capability) \- *선택적* | **Level 2:** Capability로 사용자 정의 (필요 시 구성) |
| **프로그램 (ART) 레벨** (단일 PI 이내, 8\~12주) | 피처 (Feature) | **Level 1:** Epic (Jira 기본 명칭 유지) 또는 최근 업데이트를 통해 Feature로 명칭 변경 |
| **애자일 팀 레벨** (단일 Sprint, 1\~4주 이내) | 사용자 스토리 (User Story) / 이네이블러 (Enabler) | **Level 0:** Story, Task, Bug (Jira 코어 이슈 타입 유지) |
| **원자 단위 실행** (시간 단위, 일 단위) | 작업 (Task) | **Level \-1:** Sub-task (Jira 기본 명칭 유지) |

*Table 2: SAFe 프레임워크와 Jira 시스템 계층 간의 구조적 매핑 및 타임박스 비교*  
이러한 명시적 매핑을 통해 조직은 "Jira의 전통적 에픽은 스토리의 묶음(Feature 급)이고, SAFe의 에픽은 솔루션 전체의 거대한 비전"이라는 인지적 간극을 시스템 설계 단계부터 해소하고 일관된 정보 방열판(Information Radiator)을 구축할 수 있다.

## **정보 아키텍처: 계위별 티켓의 서술 및 구조화 관습**

계층 구조가 올바르게 설계되었다면, 다음으로 확보되어야 할 것은 각 레벨 티켓의 정보 아키텍처(Information Architecture)이다. 티켓은 단순히 지시 사항을 적어둔 포스트잇이 아니다. 애자일 환경에서 티켓은 경영진의 비즈니스 언어를 일선 개발자의 기술 언어로 번역하는 '경계 객체(Boundary Object)'로서 기능한다. 따라서 각 계위의 티켓은 그 목적에 부합하는 고유한 구조와 필수 항목을 포함하여 작성되어야 한다. 프로덕트 매니저는 티켓을 한 번에 완벽하게 작성하려는 유혹에서 벗어나, 팀과의 지속적인 정제(Refinement) 회의를 통해 백본(Backbone) 상태의 티켓에 점진적으로 살을 붙여 나가는 템플릿 주도형 접근 방식을 취해야 한다.

### **거시적 계위(Initiative, Epic, Feature)의 티켓 템플릿**

Level 1 이상의 티켓은 "무엇을 왜 하는가(What and Why)?"에 대한 전략적 정당성을 부여하는 비즈니스 케이스의 성격을 강하게 띠어야 한다. 프로덕트 매니저는 개발팀이 티켓의 거시적 맥락을 완벽히 흡수할 수 있도록 다음과 같은 템플릿 관습을 채택한다.  
첫째, **동기와 비즈니스 임팩트(Motivation and Business Impact)** 섹션이다. 이 티켓이 생성된 기원, 개발을 촉발한 비즈니스적 트리거, 그리고 이 프로젝트가 창출할 가치를 스토리텔링 형식으로 서술한다. 둘째, \*\*가설 중심 개발 서술(Hypothesis Driven Development)\*\*을 도입한다. 애자일의 불확실성을 인정하며 "우리는 \[특정 역량이나 기능\]을 제공하면 \[특정 고객 행동 변화나 비즈니스 결과\]를 가져올 것이라 믿는다. 성공 여부는 \[구체적 지표\]의 변화로 측정될 것이다"라는 형태로 가설과 성공 기준을 명시한다. 셋째, **범위 내/외(In Scope / Not in Scope) 명시**이다. 스코프 크립(Scope creep, 요구사항이 끊임없이 팽창하는 현상)을 방지하기 위해 이 거대한 작업 덩어리에서 의도적으로 배제할 기능들을 명확히 나열한다. 넷째, 연관된 플랫폼이나 타 벤처에 미칠 영향을 서술하여 아키텍처 레벨의 충돌을 예방한다.  
\#\#\# 실행 계위(Story)의 티켓 템플릿 Level 0의 스토리 티켓은 개발자가 코드를 작성하고 QA가 검증을 수행하는 실질적인 명세서 역할을 하므로 고도의 정밀함이 요구된다. 가장 지배적인 관습은 \*\*사용자 스토리 구문(User Story Statement)\*\*을 티켓 최상단에 배치하는 것이다. "As a \[퍼소나\], I want to \[수행할 행동/기능\], so that \[얻게 되는 가치/목적\]"의 포맷은 개발자가 시스템 로직에 매몰되지 않고 사용자의 문제 해결에 집중하도록 강제한다.  
그러나 이 구문만으로는 개발의 완료 기준을 객관적으로 판가름할 수 없다. 따라서 스토리는 반드시 \*\*인수 조건(Acceptance Criteria, AC)\*\*을 수반해야 한다. 모범적인 애자일 팀은 BDD(Behavior-Driven Development) 철학에 기반한 Given (상황이 주어졌을 때) / When (사용자가 특정 행동을 하면) / Then (시스템은 이렇게 반응해야 한다) 구조를 통해 테스트 가능한 수준의 엄밀한 인수 조건을 작성한다. 부가적으로 사용자 상호작용 흐름을 묘사하는 피그마(Figma) 디자인 링크, 개발 시 주의해야 할 엣지 케이스 및 기술적 제약사항을 담은 개발자 노트, 그리고 품질 테스트를 위한 QA 노트가 템플릿에 포함되어야 한다.

## **자원 할당과 예측 가능성: 추정(Estimation) 및 우선순위 산정 메커니즘**

애자일 프레임워크의 성공은 티켓의 계위를 구조화하는 데 그치지 않고, 그 계위 내의 작업들이 가진 크기를 어떻게 추정(Estimation)하고 자원을 배치할 것인지에 대한 정교한 메커니즘을 요구한다. 과거 폭포수(Waterfall) 모델에서의 시간 예측은 개발자의 극심한 스트레스를 유발하고, 필연적으로 실패하는 '절대적 시간의 함정'에 빠졌다. 반면, 애자일 생태계는 '상대적 추정'과 '지연 비용(Cost of Delay)'이라는 두 가지 강력한 무기를 관습화하여 우선순위를 산정한다. 애자일 추정은 단순히 소요 비용을 예측하는 것을 넘어, 팀 단위의 토론을 촉발하고 작업의 범위를 상호 교정하여 '집단 지성에 의한 지식(Knowledge)을 구매하는 행위'로 간주된다.

### **스토리 포인트(Story Points)를 통한 상대적 크기 추정**

애자일 생태계에서 Level 1의 에픽과 Level 0의 스토리 크기를 산정할 때 가장 지배적으로 사용되는 척도는 절대 시간(시간이나 일)이 아닌 '스토리 포인트(Story Points)'이다.  
스토리 포인트는 특정 작업을 완료하는 데 필요한 물리적 노력(Effort), 직면하게 될 기술적 복잡성(Complexity), 그리고 내재된 불확실성 및 리스크(Risk)를 모두 종합하여 추상적인 수치로 표현한 상대적 측정치이다. 사람의 두뇌는 절대적인 길이를 맞추는 데는 취약하지만, 두 물체를 비교하여 "이것이 저것보다 두 배 정도 크다"고 상대 평가하는 데는 매우 능숙하다는 인지 심리학적 배경에 기원한다.  
팀은 스크럼 계획 회의나 백로그 정제 회의에 모여 **플래닝 포커(Planning Poker)** 기법을 활용한다. 이들은 피보나치 수열(1, 2, 3, 5, 8, 13, 21...)이 적힌 카드를 사용하여 기준이 되는 중간 크기의 스토리를 정하고, 새로운 스토리가 그 기준에 비해 어느 정도 크기인지를 익명으로 동시에 제시한다. 이렇게 함으로써 경험이 부족한 주니어 개발자가 목소리 큰 시니어 개발자의 의견에 휩쓸리는 감정적 편향을 제거하고 합의에 이르게 된다. 수열 간의 간격이 커질수록(예: 8과 13의 차이) 불확실성이 크다는 것을 의미하므로, 팀은 지나치게 높은 스토리 포인트를 받은 티켓을 더 작은 여러 개의 스토리로 분해(Spike 또는 Splitting)해야 함을 직관적으로 깨닫게 된다.

### **시간 기반 추정(Absolute Estimation in Hours)의 전략적 배치**

스토리 포인트가 에픽과 스토리를 아우르는 중장기적 예측과 백로그 계획을 위한 척도라면, 절대 시간 추정은 단기적이고 즉각적인 실행을 통제하기 위해 제한적으로 사용된다.  
스프린트 계획 회의의 후반부에서, 개발자들은 이번 이터레이션에 할당된 5포인트짜리 스토리를 실행 가능한 Level \-1의 부작업(Sub-task) 단위로 조각낸다. 이때 부작업은 "데이터베이스 스키마 생성(3시간)", "API 로직 구현(5시간)"과 같이 철저히 시간 단위(Hours)로 추정된다. 이러한 이중 추정(스토리는 상대적 포인트로, 부작업은 절대적 시간으로) 방식은 장기적인 로드맵의 유연성을 보장하는 동시에, 팀원 개개인이 현재 스프린트 내에서 가용한 근무 시간(Capacity) 안에 자신이 맡은 조각들을 실제로 소화할 수 있는지를 즉각적으로 검증하는 강력한 안전장치가 된다.

### **WSJF (Weighted Shortest Job First)를 통한 과학적 우선순위 산정**

백로그에 무수히 쌓여 있는 에픽이나 피처 티켓들 중에서 "무엇을 가장 먼저 실행할 것인가?"를 결정하는 우선순위 산정은 조직의 성패를 가르는 핵심 행위이다. 이를 위해 SAFe 환경을 필두로 애자일 업계에서 가장 광범위하게 채택된 정량적 우선순위 산정 공식이 바로 **WSJF(가중치 적용 최단 작업 우선)** 기법이다.  
과거의 우선순위는 직급이 높은 경영진의 주관적 감(HiPPO 현상)이나 단순히 목소리 큰 고객의 요청에 의해 좌우되는 경향이 강했다. WSJF는 이러한 비합리성을 배제하고, 철저히 수학적이고 경제적인 관점에서 백로그를 정렬한다. WSJF의 기본 철학은 단순하다. "상대적으로 처리 비용(크기)은 작으면서도, 지연되었을 때 조직이 입는 경제적 타격(비용)이 가장 큰 작업을 가장 먼저 처리하라"는 것이다.

| 지표명 (구성 요소) | 개념 및 측정 방식 | 측정 단위 (예시) |
| :---- | :---- | :---- |
| **User/Business Value** (사용자 및 비즈니스 가치) | 이 티켓이 고객 만족도 제고나 매출 상승에 얼마나 크게 기여하는가를 평가하는 상대적 지표. | 피보나치 수열 (1\~21) |
| **Time Criticality** (시간 민감도) | 작업의 출시가 지연될 경우, 창출할 수 있는 비즈니스 가치가 얼마나 빠르게 하락하는지를 평가. 규제 준수나 특정 기념일 런칭 여부 등이 포함됨. | 피보나치 수열 (1\~21) |
| **Risk Reduction / Opportunity Enablement** (위험 감소 / 기회 창출) | 당장의 매출은 없더라도 기술적 부채를 해결하여 인프라 붕괴 위험을 줄이거나, 미래의 새로운 사업 기회를 열어주는 전략적 가치. | 피보나치 수열 (1\~21) |
| **Cost of Delay (CoD)** (지연 비용) | 위 3가지 지표(비즈니스 가치 \+ 시간 민감도 \+ 위험 감소)를 합산한 총합으로, 이 작업을 수행하지 않았을 때 매일 발생하는 상대적 손실의 크기. | 합산된 수치 |
| **Job Duration / Job Size** (작업 기간 및 크기) | 이 작업을 완료하는 데 드는 상대적 노력과 복잡성의 크기. 앞서 추정한 스토리 포인트 수치를 그대로 활용함. | 스토리 포인트 (피보나치 수열) |

*Table 3: WSJF 산정 공식을 위한 핵심 구성 요소 및 측정 방식*  
이러한 지표를 산출한 후, 조직은 지연 비용의 총합(CoD)을 작업의 크기(Job Duration)로 나눈다 (WSJF \= CoD \\div Job Duration). 이 공식에 따라 산출된 WSJF 점수가 가장 높은 피처나 에픽이 백로그의 최상단에 강제로 배치되어, 다음 PI(Program Increment)나 스프린트의 최우선 작업으로 선정된다. 이러한 체계는 의사결정의 투명성을 극대화하고 자원 낭비를 최소화하는 최고의 모범 관습이다.

## **업무 흐름의 동역학: 워크플로우(Workflow)와 상태 전환 관습**

Jira 환경에서 티켓의 계위와 내용이 아무리 완벽하게 정의되었다 하더라도, 티켓이 생성부터 배포까지 어떤 경로를 거쳐 이동하는지(State Transition)에 대한 명확한 규칙이 없다면 실무에서는 극심한 혼란이 발생한다. 스크럼과 칸반 팀 모두 티켓의 흐름(Flow)을 시각화하고 통제하기 위해 워크플로우를 최적화하는 데 심혈을 기울인다.  
Level 0 티켓(Story, Task, Bug)의 보편적인 상태 전환 라이프사이클은 다음과 같이 구성된다. 첫째, **백로그(Backlog)** 단계이다. 티켓이 최초로 생성되었으나 요구사항이 구체화되지 않아 아직 개발자가 작업을 시작할 준비가 되지 않은 상태를 의미한다. 이 단계에서는 PO와 고객 간의 질문과 답변이 오가며(Pending Questions) 내용이 보강된다. 둘째, **개발 준비 완료(Ready for Development / To Do)** 상태이다. 백로그 정제 회의를 통해 스토리 포인트 추정이 완료되고 인수 조건에 대한 팀원 전체의 동의가 이루어지면, 해당 스토리는 스프린트로 진입할 자격을 얻어 이 상태로 전환된다.  
셋째, **진행 중(In Progress)** 상태이다. 개발자가 할당된 티켓을 실제로 개발하기 시작하며, 관련 코드 브랜치가 생성되는 시점이다. 넷째, **코드 리뷰 및 품질 보증(Code Review / QA)** 상태로, 코딩 자체는 완료되었으나 프로덕션 배포 전 동료 개발자의 피어 리뷰(Pull Request 승인)를 대기하거나, QA 담당자가 인수 조건을 기반으로 시나리오를 테스트하는 검증 단계를 뜻한다. 마지막으로 **완료(Done / Acceptance)** 상태는 모든 인수 조건이 충족되어 사용자에게 릴리스될 준비가 끝났음을 선언하는 단계이다.  
이러한 상태 전환의 관습에서 두드러지는 차이는 프레임워크에 따라 워크플로우를 통제하는 철학이 다르다는 점이다. 스크럼은 타임박스(스프린트 주기)를 통해 2주 안에 약속한 모든 티켓을 '완료' 상태로 밀어내는 묶음 처리(Batch processing)에 집중한다. 반면 칸반 생태계에서는 특정한 릴리스 마일스톤에 얽매이지 않고 작업이 완료되는 즉시 배포한다. 대신 칸반 보드는 특정 상태(예: Code Review 열)에 머물 수 있는 티켓의 최대 개수를 엄격하게 제한하는 **WIP(Work In Progress) 제한 메커니즘**을 가동한다. 만약 QA 열의 WIP 제한이 3개인데 이미 3개의 티켓이 밀려 있다면, 개발자는 새로운 티켓을 'In Progress'로 당겨오기 전에 하던 코딩을 멈추고 밀려 있는 티켓의 QA 작업을 돕도록 강제된다. 이는 팀 전반의 병목을 시각적으로 드러내고 즉각적으로 해소하여 가치 전달의 속도(Lead Time)를 획기적으로 향상시키는 칸반의 핵심 관습이다.

## **결론 및 엔터프라이즈 환경을 위한 전략적 제언**

현대 소프트웨어 생태계에서 애자일은 단순한 개발 방법론을 넘어서 조직의 철학, 전략, 그리고 실행을 관통하는 거대한 운영 체계(OS)로 진화하였다. 이 방대한 체계 내에서 Jira 시스템의 티켓 계위 모델은 분절된 개개인의 업무와 거시적인 기업 전략을 유기적으로 묶어내는 데이터의 척추이자 중추 신경망 역할을 수행한다. 본 심층 보고서에서 분석한 바와 같이, 조직이 Jira 내 티켓 계층의 혼란을 불식시키고 애자일의 진정한 가치를 실현하기 위해서는 세 가지 핵심 관습을 뼈대로 삼아 내부 프로세스를 쇄신해야 한다.  
첫째, 시스템 내에 존재하는 가장 근본적인 **이슈의 계위를 철저히 분리하고 목적에 맞게 운영**해야 한다. 전략을 담아내는 그릇인 에픽(Level 1), 사용자의 가치를 직접적으로 전달하는 기능적 덩어리인 스토리(Level 0), 기술적 유지보수와 아키텍처 지원을 위한 작업(Task), 그리고 이를 실행 가능하게 잘게 쪼갠 시간 단위의 실행 조각인 부작업(Level \-1) 간의 엄격한 경계선이 준수되어야 한다. 이러한 계위 분리는 각 티켓이 담당하는 문맥을 보호하여 개발자가 길을 잃지 않도록 보장한다.  
둘째, 엔터프라이즈 확장에 대비한 \*\*상위 계층 구조(이니셔티브 레벨)의 셋업과 SAFe 등 프레임워크와의 의미론적 정렬(Semantic Alignment)\*\*이 필수적이다. 단일 에픽 수준을 넘어 기업의 장기 포트폴리오를 관리해야 하는 조직은 Advanced Roadmaps나 Jira Align과 같은 확장 도구를 도입하여 에픽 위에 이니셔티브, 포트폴리오 등 상위 계위를 설계해야 한다. 특히 SAFe를 채택한 조직이라면, 시스템상의 'Jira 에픽'이 SAFe의 거대한 '엔터프라이즈 에픽'을 담아낼 수 없다는 인지적 간극을 조기에 인식하고, 피처(Feature)와 케이퍼빌리티(Capability) 단위를 명시적으로 계층 매핑하여 보고 체계의 붕괴를 예방해야 한다.  
마지막으로, 철저히 **규율화된 정보 아키텍처와 과학적 추정(Estimation) 관습의 내재화**를 이룩해야 한다. 비즈니스 가치와 가설 중심 서술로 무장된 거시적 템플릿과, Given/When/Then 형식의 날카로운 인수 조건을 품은 스토리 템플릿을 정착시켜야 한다. 또한 목소리가 큰 자의 직관에 의존하는 낡은 방식에서 탈피하여, 스토리 포인트 기반의 집단 지성 추정과 지연 비용(CoD)을 산출하는 WSJF 모델을 결합함으로써 "가장 적은 비용으로 가장 치명적인 위험을 줄이는" 가치 창출 티켓을 백로그 최상단으로 끌어올리는 시스템적 체질 개선이 병행되어야 한다.  
결론적으로, 이상적이고 고도화된 애자일 생태계는 단지 복잡하고 다층적인 티켓의 계위를 무작정 쌓아 올리는 곳이 아니다. 최고 경영자의 추상적인 비전(Initiative)이 전술적 경로(Epic)를 거쳐, 구체적인 사용자 가치(Story)와 미시적인 실행 단계(Sub-task)로 군더더기 없이 투명하고 유동적으로 흘러내리도록 조직의 혈관을 뚫어내는 여정이다. 본 보고서에서 확립된 Jira 티켓의 표준값과 애자일 관습의 정립은, 조직이 디지털 복잡성을 극복하고 끊임없이 변화하는 시장에서 압도적인 민첩성과 예측 가능성을 확보하기 위한 가장 강력한 전략적 자산이 될 것이다.

#### **참고 자료**

1\. Agile Frameworks: A Complete Overview \- Parabol, https://www.parabol.co/resources/agile-frameworks-guide/ 2\. Agile vs. Scrum vs. Scaled Agile (SAFe®): Understanding the differences \- PM-Partners, https://www.pm-partners.com.au/insights/agile-vs-scrum-vs-scaled-agile-safe-understanding-the-differences/ 3\. Kanban vs. scrum: Which agile are you? \- Atlassian, https://www.atlassian.com/agile/kanban/kanban-vs-scrum 4\. 6 Scaled Agile Frameworks \- Which One Is Right For You? \- Nimblework, https://www.nimblework.com/blog/scaled-agile-frameworks/ 5\. Compare Advanced Roadmaps and Jira Align | Atlassian, https://www.atlassian.com/software/jira/agile-at-scale/portfolio-and-align 6\. Jira Align vs. Jira Plans: The Difference \- Praecipio Consulting, https://www.praecipio.com/resources/articles/jira-align-vs-advanced-roadmaps-the-difference 7\. Jira Align organizational structure, https://help.jiraalign.com/hc/en-us/articles/115000152674-Jira-Align-organizational-structure 8\. Jira Issue Types: A Complete Guide for 2026 \- Atlassian Community, https://community.atlassian.com/forums/App-Central-articles/Jira-Issue-Types-A-Complete-Guide-for-2026/ba-p/2928042 9\. Creating a Scaled Agile Hierarchy within Jira \- Forty8Fifty Labs, https://www.forty8fiftylabs.com/tech-tip/creating-a-scaled-agile-hierarchy-within-jira/ 10\. Why is JIRA issue hierarchy different from Scaled Agile Framework hierarchy? \- Atlassian Community, https://community.atlassian.com/forums/Jira-questions/Why-is-JIRA-issue-hierarchy-different-from-Scaled-Agile/qaq-p/1890768 11\. Understanding Jira Hierarchy: Complete Guide in 2025 \- Atlassian Community, https://community.atlassian.com/forums/App-Central-articles/Understanding-Jira-Hierarchy-Complete-Guide-in-2025/ba-p/2947722 12\. Master Jira Ticket Management: Tips & Best Practices \- Miro, https://miro.com/agile/jira-ticket-management/ 13\. Configure the work type hierarchy \- Atlassian Support, https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy/ 14\. Configure custom hierarchy levels in your plan | Jira Cloud ..., https://support.atlassian.com/jira-software-cloud/docs/configure-custom-hierarchy-levels-in-advanced-roadmaps/ 15\. Configuring initiatives and other hierarchy levels | Atlassian Support, https://confluence.atlassian.com/spaces/AdvancedRoadmapsServer0329/pages/1021218664/Configuring+initiatives+and+other+hierarchy+levels 16\. Epics, Stories, and Initiatives | Atlassian, https://www.atlassian.com/agile/project-management/epics-stories-themes 17\. User Story Hierarchy in Scrum and SAFe \- Agile Consulting | Applied Frameworks, https://agile.appliedframeworks.com/applied-frameworks-agile-blog/user-story-hierarchy-in-scrum-and-safe 18\. Scaled Agile Framework 6.0 Essential process template \- IBM, https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/workflow-management/7.1.0?topic=templates-safe-60-essential-process-template 19\. Best practices for Agile product management \- Azure Boards | Microsoft Learn, https://learn.microsoft.com/en-us/azure/devops/boards/best-practices-agile-project-management?view=azure-devops 20\. LTS Knowledge Base \- Lehigh Confluence \- Atlassian, https://lehigh.atlassian.net/wiki/spaces/LKB/pages/68517908/Projects+initiatives+epics+stories+tasks+and+subtasks 21\. Scaled Agile Framework 6.0 Full process template \- IBM, https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/workflow-management/7.1.0?topic=templates-safe-60-full-process-template 22\. Configuring initiatives and other hierarchy levels \- Atlassian Documentation, https://confluence.atlassian.com/jiraportfoliocloud/configuring-hierarchy-levels-828785179.html 23\. How to create a new hierarchy level in Portfolio for Jira \- Atlassian Documentation, https://confluence.atlassian.com/jiraportfoliocloud/how-to-create-a-new-hierarchy-level-in-portfolio-for-jira-941618926.html?\_ga=2.176291938.650515943.1559576603-419643296.1557171255 24\. Scaled Agile Framework (SAFe) Values & Principles \- Atlassian, https://www.atlassian.com/agile/agile-at-scale/what-is-safe 25\. Program vs. Portfolio vs. Project in BigPicture \- Atlassian Community, https://community.atlassian.com/forums/App-Central-articles/Program-vs-Portfolio-vs-Project-in-BigPicture/ba-p/2013396 26\. The SAFe Hierarchy and Levels, Explained in Depth \- Enov8, https://www.enov8.com/blog/the-hierarchy-of-safe-scaled-agile-framework-explained/ 27\. Jira Hierarchy best practice \- Atlassian Community, https://community.atlassian.com/forums/Agile-discussions/Jira-Hierarchy-best-practice/td-p/2069535 28\. Advanced Roadmaps for Jira & Jira Align | Atlassian, https://www.atlassian.com/dam/jcr:d0b98946-fb77-403d-a823-785376a41079/Advanced-Roadmaps-vs-Jira-Align.pdf 29\. How to set up hierarchy with Epic → Story/Feature → Task → Sub-task in Jira Cloud?, https://community.atlassian.com/forums/Jira-questions/How-to-set-up-hierarchy-with-Epic-Story-Feature-Task-Sub-task-in/qaq-p/3091938 30\. Basics \- Work Item Hierarchy \- The Effective Scrum Master, https://www.effectivescrummaster.com/basics-work-item-hierarchy/ 31\. How to write a great product development ticket: 10 must-have sections to follow, https://heilyhindrea.medium.com/10-must-have-sections-in-your-product-development-tickets-let-your-ticket-template-guide-your-46d61b4e7974 32\. Scaling agile with Atlassian and SAFe®, https://www.atlassian.com/dam/jcr:cf828dac-e960-47f4-a692-10c77106899b/Scaling%20agile%20with%20Atlassian%20and%20SAFe%20white%20paper.pdf 33\. Anatomy of a Good Software Ticket & Workflow \- Daniel Starling, https://daniel-starling.com/blog/2018/05/05/anatomy-of-a-software-ticket/ 34\. What are story points in Agile and how do you estimate them? | Atlassian, https://www.atlassian.com/agile/project-management/estimation 35\. Agile Estimating: How Teams Estimate with Story Points \- Mountain Goat Software, https://www.mountaingoatsoftware.com/agile/agile-estimation-estimating-with-story-points 36\. 5 Agile Estimation Tips To Help With Backlog Prioritization, https://www.easyagile.com/blog/agile-estimation
# @ogham/maencof

마크다운 기반 Knowledge Graph로 개인 지식 공간을 관리하는 Claude Code 플러그인입니다.

AI 에이전트는 세션이 끝나면 사용자를 잊습니다. 메모는 여러 도구에 흩어지고, 통찰은 사라지며, 매 대화는 제로에서 시작됩니다. maencof은 이 문제를 **5-Layer 지식 모델**, **Spreading Activation 검색**, **기억 라이프사이클 관리**로 해결합니다 — 모두 직접 소유하는 마크다운 파일 위에서 동작합니다.

---

## 설치

### Marketplace를 통한 설치 (권장)

```bash
# 1. Marketplace에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install maencof
```

설치 후 별도 설정 없이 모든 컴포넌트(Skills, MCP, Agents, Hooks)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
# 모노레포 루트에서
yarn install

# 플러그인 빌드
cd packages/maencof
yarn build          # TypeScript 컴파일 + 번들링

# Claude Code에서 플러그인 로드
claude --plugin-dir ./packages/maencof
```

빌드하면 두 가지 산출물이 생성됩니다:

- `bridge/mcp-server.cjs` — MCP 서버 (지식 도구 10개)
- `bridge/*.mjs` — Hook 스크립트 4개 (자동 지식 보호)

---

## 사용법

maencof 스킬은 **LLM 프롬프트**이지, CLI 명령어가 아닙니다. Claude Code 안에서 자연어로 대화하듯 호출합니다. `--fix` 같은 플래그도 LLM이 해석하는 힌트이므로, 자연어로 써도 동일하게 동작합니다.

### 초기 설정

```
/maencof:setup
/maencof:setup --step 3
```

6단계 온보딩 위저드: Vault 경로 선택 → Core Identity 인터뷰 → Layer 디렉토리 생성 → 초기 인덱스 빌드 → 규칙 활성화 → 완료 요약.

### 지식 기록

```
/maencof:remember
/maencof:remember React Server Components 핵심 개념 정리
```

자동 Layer 추천, 태그 추출, frontmatter 생성, 중복 검사를 거쳐 새 문서를 만듭니다.

### 지식 검색

```
/maencof:recall React 상태관리 관련 자료 찾아줘
/maencof:explore
```

- **`recall`** — Knowledge Graph 전체를 대상으로 Spreading Activation 검색. 가중치 링크를 따라 관련 노드를 활성화합니다.
- **`explore`** — 인터랙티브 그래프 탐색 (최대 3라운드). 연결 관계를 시각적으로 탐색합니다.

### 지식 정리

```
/maencof:organize
/maencof:organize --dry-run
/maencof:reflect
```

- **`organize`** — memory-organizer 에이전트가 문서 이동을 추천 → 확인 → 실행합니다.
- **`reflect`** — 변경 없이 분석만 수행합니다. judge 모듈로 지식 건강도를 평가합니다.

### 건강 점검

```
/maencof:diagnose
/maencof:doctor
/maencof:doctor --fix
```

- **`diagnose`** — 가벼운 상태 확인 (인덱스 신선도, 기본 통계).
- **`doctor`** — 6개 진단 + 자동 수정: 고아 문서, 오래된 항목, 깨진 링크, Layer 위반, 중복, frontmatter 문제.

### 인덱스 관리

```
/maencof:build
/maencof:rebuild
```

- **`build`** — 인덱스 상태에 따라 full/incremental 모드를 자동 선택합니다.
- **`rebuild`** — 전체 인덱스를 처음부터 강제 재빌드합니다.

### 외부 데이터 수집

```
/maencof:ingest https://example.com/article
/maencof:connect github
/maencof:mcp-setup
```

- **`ingest`** — URL, GitHub issue, 텍스트를 지식 문서로 변환합니다.
- **`connect`** — 외부 데이터 소스를 등록합니다 (GitHub, Jira, Slack, Notion).
- **`mcp-setup`** — 외부 MCP 서버를 설치합니다.

### 플러그인 관리

```
/maencof:manage
```

스킬/에이전트 활성화 상태, 사용 리포트 조회, 기능 토글을 수행합니다.

---

## 5-Layer 지식 모델

maencof은 지식을 5개 Layer로 구분하며, 각 Layer는 Spreading Activation(SA) 감쇠율이 다릅니다:

| Layer | 이름               | 디렉토리       | SA Decay | 용도                             |
| ----- | ------------------ | -------------- | -------- | -------------------------------- |
| L1    | Core Identity Hub  | `01_Core/`     | 0.5      | 핵심 정체성 — 보호됨, 거의 불변  |
| L2    | Derived Knowledge  | `02_Derived/`  | 0.7      | 내재화된 통찰과 기술             |
| L3    | External Reference | `03_External/` | 0.8      | 북마크, 인용, 외부 자료          |
| L4    | Action Memory      | `04_Action/`   | 0.9      | 휘발성 작업 노트, 세션 컨텍스트  |
| L5    | Context            | `05_Context/`  | 0.95     | 맥락 메타데이터, 도메인 컨텍스트 |

**감쇠율이 낮을수록 더 강하게 지속됩니다.** L1 문서는 검색 시 강하게 활성화되고 오래 유지됩니다. L4 문서는 강화되지 않으면 빠르게 사라집니다.

**링크 방향 규칙:** 링크는 기본적으로 하향(L1→L2→L3→L4)합니다. 상향 링크(예: L3→L1)는 명시적 사유가 필요하며, `organize` 실행 시 플래그됩니다.

---

## 자동으로 동작하는 것들

플러그인이 활성화되면 아래 Hook들이 **사용자 개입 없이** 자동 실행됩니다:

| 언제                   | 무엇을                       | 왜                               |
| ---------------------- | ---------------------------- | -------------------------------- |
| 세션 시작 시           | Vault 컨텍스트 + 인덱스 로드 | 첫 턴부터 에이전트가 지식을 인지 |
| 파일을 Write/Edit할 때 | Layer 보호 검사              | L1 문서의 무단 수정 방지         |
| maencof 도구 사용 후   | 인덱스 무효화                | Knowledge Graph 동기화 유지      |
| 세션 종료 시           | 세션 정리 + 영속화           | 휘발성 상태 저장, 만료 항목 정리 |

차단이 발생하면 이유와 함께 메시지가 표시되므로 별도 대응은 필요 없습니다.

---

## 전체 스킬 목록

| 스킬                 | 분류   | 설명                                       |
| -------------------- | ------ | ------------------------------------------ |
| `/maencof:setup`     | 설정   | 6단계 온보딩 위저드                        |
| `/maencof:remember`  | 핵심   | 새 지식 기록 (자동 Layer, 태그, 중복 검사) |
| `/maencof:recall`    | 핵심   | Spreading Activation 검색                  |
| `/maencof:explore`   | 핵심   | 인터랙티브 그래프 탐색 (최대 3라운드)      |
| `/maencof:organize`  | 핵심   | 에이전트 기반 문서 재구성                  |
| `/maencof:reflect`   | 핵심   | 읽기 전용 지식 건강도 분석                 |
| `/maencof:build`     | 인덱스 | 인덱스 빌드 (자동 full/incremental)        |
| `/maencof:rebuild`   | 인덱스 | 강제 전체 재인덱스                         |
| `/maencof:diagnose`  | 건강   | 가벼운 상태 확인                           |
| `/maencof:doctor`    | 건강   | 6개 진단 + 자동 수정                       |
| `/maencof:ingest`    | 고급   | URL, GitHub, 텍스트에서 가져오기           |
| `/maencof:connect`   | 고급   | 외부 데이터 소스 등록                      |
| `/maencof:mcp-setup` | 고급   | 외부 MCP 서버 설치                         |
| `/maencof:manage`    | 고급   | 스킬/에이전트 활성화 및 사용 리포트        |

---

## 핵심 규칙 요약

maencof이 시행하는 주요 규칙입니다:

| 규칙             | 기준                                            | 시행 방식      |
| ---------------- | ----------------------------------------------- | -------------- |
| L1 보호          | Core Identity 문서는 기본적으로 읽기 전용       | Hook 자동 차단 |
| Frontmatter 필수 | 모든 문서에 YAML frontmatter 필수               | MCP 검증       |
| 네이밍 규칙      | `kebab-case.md`, Layer 접두사가 디렉토리와 일치 | MCP 검증       |
| Layer 구조       | 5-Layer 디렉토리 계층 유지 필수                 | MCP + 에이전트 |
| 링크 무결성      | 깨진 링크, 고아 문서 금지                       | Doctor 진단    |

---

## 개발

```bash
yarn dev            # TypeScript watch 모드
yarn test           # Vitest watch
yarn test:run       # 1회 실행
yarn typecheck      # 타입 체크
yarn build          # tsc + esbuild (MCP + hooks)
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, fast-glob, esbuild, Vitest, Zod

---

## 상세 문서

기술적 세부사항은 [`.metadata/`](./.metadata/) 디렉토리를 참조하세요:

| 문서 세트                                                                                                                 | 내용                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Claude-Code-Plugin-Design](./.metadata/Claude-Code-Plugin-Design/) (26개)                                                | 플러그인 아키텍처, 지식 레이어, 검색 엔진, 모듈, 라이프사이클, 온보딩 |
| [Tree-Graph-Hybrid-Knowledge-Architecture](./.metadata/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/) (6개) | 연구 배경, 이중 구조 설계, 이론적 기반, 계층 모델                     |
| [TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm](./.metadata/TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm/)       | Knowledge Graph 인덱싱, 순환 감지, Spreading Activation 모델          |
| [TOOL/Markdown-Knowledge-Graph-Search-Engine](./.metadata/TOOL/Markdown-Knowledge-Graph-Search-Engine/)                   | 시스템 구성요소, 데이터 흐름, 메타데이터 전략, 검색 구현              |

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT

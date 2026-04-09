# maencof-lens Plugin — Upper-Level Design Spec

## 1. 배경 및 동기

### 문제 정의

maencof vault에 축적된 지식(설계서, 인사이트, 아키텍처 문서, 기술 레퍼런스 등)은 **maencof 세션 내에서만** 접근 가능하다.
개발 컨텍스트(예: `~/Workspace/my-project/`)에서 작업할 때, 이 지식을 참조하려면 별도의 세션 전환이 필요하다.

### 해결 방향

**maencof-lens** — maencof 생태계의 read-only 클라이언트 플러그인.
개발 컨텍스트에서 기존재하는 maencof vault의 지식 그래프에 접근하여, 더 나은 입력 구성과 설계서 참조를 가능하게 한다.

- **프롬프트 태그**: `[maencof:lens]`
- **어원**: lens(렌즈) — 지식을 확대해서 들여다보되, 손대지 않는 도구

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Read-Only** | vault에 대한 어떠한 쓰기도 불허. 읽기 전용 |
| **Code Reuse** | maencof core/search/index 모듈을 직접 공유. 전용 코드 최소화 |
| **Multi-Vault** | 복수의 vault를 동시에 참조 가능 |
| **Layer Filtering** | 특정 Layer만 조회 가능 (기본값: L2~L5) |
| **Minimal Footprint** | 최소한의 설정과 프롬프트 주입으로 동작 |

---

## 2. 네이밍 체계

| 계층 | 형식 | 예시 |
|------|------|------|
| **패키지** | `maencof-lens` | `packages/maencof-lens` |
| **MCP 도구** | prefix 없음 | `search`, `read` |
| **스킬** | `/maencof-lens:{name}` | `/maencof-lens:lookup-vault` |
| **프롬프트 태그** | `[maencof:lens]` | 세션 내 표시 |
| **설정 디렉토리** | `.maencof-lens/` | 개발 컨텍스트 루트에 위치 |

---

## 3. 개념적 아키텍처

```
┌─────────────────────────────────────┐
│  Development Context                │
│  (~/Workspace/my-project/)          │
│                                     │
│  .maencof-lens/                     │
│    config.json ← vault 등록 + 설정  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Claude Code Session          │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  maencof-lens           │  │  │
│  │  │  (MCP Plugin)           │  │  │
│  │  │                         │  │  │
│  │  │  vault_a ──┐            │  │  │
│  │  │  vault_b ──┤ Router     │  │  │
│  │  │  vault_c ──┘            │  │  │
│  │  └──────────┬──────────────┘  │  │
│  │             │                  │  │
│  └─────────────┼──────────────────┘  │
└────────────────┼─────────────────────┘
                 │ (read-only fs access)
    ┌────────────▼────────────────┐
    │  maencof Vault(s)           │
    │  /.maencof-meta/index.json  │
    │  /01_Core/ ... /05_Context/ │
    └─────────────────────────────┘
```

### 컴포넌트 관계

- **maencof-lens** 플러그인은 ogham monorepo의 **새 패키지** (`packages/maencof-lens`)로 존재
- `packages/maencof`의 core/, search/, index/, types/ 모듈을 **패키지 의존성**으로 import
- 자체적으로는 **MCP 서버 진입점** + **read-only 도구 정의** + **vault 라우터** + **프롬프트 주입 로직**만 보유

---

## 4. 전제 조건 (Preconditions)

| 전제 | 설명 |
|------|------|
| **P1** | 대상 vault에 `.maencof-meta/index.json`이 이미 빌드되어 있어야 한다 (lens는 `kg_build`를 수행하지 않음) |
| **P2** | 개발 컨텍스트 루트에 `.maencof-lens/config.json`이 존재해야 한다 |
| **P3** | lens가 참조하는 vault에 대해 파일시스템 읽기 권한이 존재해야 한다 |
| **P4** | maencof 본체와 lens는 동일 머신에서 동작한다 (원격 vault 미지원, v1 스코프) |
| **P5** | lens 사용 중에 vault 본체에서 쓰기가 발생할 수 있다 — lens는 stale read를 허용하되, 주기적 캐시 무효화로 대응 |

---

## 5. 기능 스팩

### 5.1 설정 디렉토리 (`.maencof-lens/`)

개발 컨텍스트 루트에 `.maencof-lens/` 디렉토리를 두고, lens 고유 설정을 관리한다.

```
my-project/
├── .maencof-lens/
│   └── config.json
├── src/
└── ...
```

**`.maencof-lens/config.json`**:

```jsonc
{
  "vaults": [
    {
      "name": "fionn",
      "path": "/Users/Vincent/Soulstream/tirnanog",
      "layers": [2, 3, 4, 5],    // 선택. 미지정 시 기본값 [2,3,4,5]
      "default": true
    },
    {
      "name": "work",
      "path": "/Users/Vincent/Soulstream/work-vault",
      "layers": [3, 4]
    }
  ]
}
```

**설정 규칙:**
- `vaults` 배열은 1개 이상 필수
- `name`: vault 별칭 (도구 호출 시 식별자)
- `path`: vault 절대 경로
- `layers`: 조회 허용 Layer 목록. 미지정 시 `[2, 3, 4, 5]` (L1 Core Identity 기본 비공개)
- `default`: 기본 vault 지정. 복수 vault 중 1개만 true 가능. 미지정 시 첫 번째 vault가 default

### 5.2 Read-Only 도구 세트

maencof 본체의 18개 도구 중 **읽기 전용 부분집합**만 노출한다.

| 도구 | 원본 | 설명 |
|------|------|------|
| `search` | kg_search | Spreading Activation 기반 지식 탐색 |
| `context` | kg_context | 토큰 예산 기반 컨텍스트 조립 |
| `navigate` | kg_navigate | 그래프 이웃 탐색 |
| `read` | maencof_read | 단일 문서 읽기 |
| `status` | kg_status | vault 상태 조회 |

**공통 파라미터 (모든 도구):**
- `vault` (optional): 대상 vault 이름. 생략 시 default vault 사용

**명시적으로 제외하는 도구:**
- 쓰기 계열: `maencof_create`, `maencof_update`, `maencof_delete`, `maencof_move`
- 빌드 계열: `kg_build`, `kg_suggest_links`
- 시스템 계열: `claudemd_merge`, `claudemd_read`, `claudemd_remove`
- 캡처 계열: `maencof_capture_insight`, `boundary_create`
- 캐시 관리: `context_cache_manage`
- 일일 노트: `dailynote_read`

### 5.3 Layer Filtering

모든 조회 도구는 vault 설정의 `layers` 필터를 자동 적용한다.

**동작 규칙:**
- vault config에 `layers: [2, 3, 4, 5]`이면, L1 문서는 검색 결과에서 자동 제외
- 기본값: `[2, 3, 4, 5]` — L1(Core Identity)은 기본적으로 비공개
- 도구 호출 시 `layer_filter` 파라미터로 추가 좁히기 가능 (vault config 범위 내에서만)
- vault config의 layers가 상한선 역할 — 도구에서 이를 넘어설 수 없음
- sub-layer 필터링은 v1에서 미지원

**예시:**
```
vault config: layers = [2, 3, 4, 5]
도구 호출: layer_filter = [3]
→ 실제 적용: [3] (교집합)

vault config: layers = [3, 4]
도구 호출: layer_filter = [2, 3]
→ 실제 적용: [3] (vault 상한 적용)
```

### 5.4 Stale Index 대응

lens는 `kg_build`를 수행하지 않는다. 인덱스가 stale일 때는 **경고만** 한다.

```
[maencof:lens] ⚠ vault "fionn" index is stale (last built: 2h ago, 3 docs changed).
→ Run kg_build in maencof session to refresh.
```

- stale 판단: `.maencof-meta/index.json`의 mtime vs vault 파일들의 최신 mtime 비교
- stale이어도 조회는 정상 수행 (기존 인덱스 기반)
- rebuild 유도는 메시지로만 — lens가 직접 실행하지 않음

### 5.5 프롬프트 주입 (Prompt Injection)

maencof-lens 플러그인 활성화 시, 개발 컨텍스트의 시스템 프롬프트에 **스킬 사용법** 안내를 주입한다.
도구 목록 대신 스킬을 안내하여, 사용자가 자연스러운 인터페이스로 vault 지식에 접근하도록 유도한다.

**주입 내용 (개념):**

```markdown
# [maencof:lens] Read-only vault access enabled.

개발 중 필요한 배경 지식, 설계서, 기술 레퍼런스를 maencof vault에서 조회할 수 있습니다.

## 사용 방법
- /maencof-lens:lookup <키워드>: vault 지식 검색 및 조회
- /maencof-lens:context <쿼리>: 컨텍스트 조립

## 사용 지침
- 설계 의사결정이나 아키텍처 참조가 필요할 때 활용하세요
- vault 데이터는 읽기 전용입니다 — 수정이 필요하면 maencof 세션에서 수행하세요
- 등록된 vault: {vault_list}
```

**주입 방식:**
- Claude Code 플러그인의 `system-prompt` contribution 또는 hook 기반 주입
- 정적 텍스트 + vault 목록 동적 렌더링

### 5.7 MCP 도구 접근 수준

MCP 도구는 사용자 직접 호출이 아닌, 스킬/에이전트를 경유하여 사용된다.

| 도구 | 접근 수준 | 소비자 |
|------|----------|--------|
| `search` | 스킬/에이전트 경유 | `lookup` skill, `context` skill, `researcher` agent |
| `context` | 스킬/에이전트 경유 | `context` skill, `researcher` agent |
| `navigate` | 에이전트 전용 | `researcher` agent |
| `read` | 스킬/에이전트 경유 | `lookup` skill, `researcher` agent |
| `status` | 에이전트/Hook 전용 | `researcher` agent, SessionStart hook |

### 5.8 스킬 및 에이전트

| 컴포넌트 | 유형 | 역할 |
|---------|------|------|
| `/maencof-lens:setup-lens` | 스킬 | config 관리 (기존) |
| `/maencof-lens:lookup` | 스킬 | 키워드 검색 → 문서 읽기 → 요약 |
| `/maencof-lens:context` | 스킬 | 토큰 예산 기반 컨텍스트 조립 |
| `maencof-lens:researcher` | 에이전트 | 5개 MCP 도구 활용 자율 vault 탐색 |

### 5.6 캐시 전략

| 항목 | 전략 |
|------|------|
| 인덱스 로딩 | 최초 도구 호출 시 lazy load, 이후 메모리 캐시 |
| 캐시 TTL | 세션 단위 (세션 종료 시 해제) |
| Stale 감지 | index.json의 mtime 비교로 stale 판단 |
| Stale 대응 | 경고 메시지 출력 + 인덱스 리로드 (rebuild 아님, 단순 re-read) |
| 문서 내용 | 캐시하지 않음 — 매 요청마다 파일 직접 읽기 |

---

## 6. 코드 공유 전략

### 재사용 대상 (from `packages/maencof`)

| 모듈 경로 | 재사용 내용 |
|-----------|------------|
| `core/spreading-activation.ts` | SA 알고리즘 |
| `core/tag-similarity.ts` | Jaccard 유사도 |
| `core/document-parser.ts` | frontmatter/content 파싱 |
| `core/vault-scanner.ts` | vault 구조 스캔 |
| `core/graph-builder.ts` | 그래프 구축 로직 |
| `core/yaml-parser.ts` | YAML 파싱 |
| `search/query-engine.ts` | 검색 엔진 |
| `search/context-assembler.ts` | 컨텍스트 조립 |
| `search/query-cache.ts` | 쿼리 캐시 |
| `index/metadata-store.ts` | 인덱스 읽기 |
| `types/*` | 전체 타입 정의 |

### maencof-lens 전용 코드 (최소한)

| 모듈 | 역할 |
|------|------|
| `config-loader.ts` | `.maencof-lens/config.json` 로딩 및 검증 |
| `vault-router.ts` | 복수 vault 등록/선택/라우팅 |
| `layer-guard.ts` | Layer 필터링 상한 적용 로직 |
| `server.ts` | MCP 서버 진입점 (read-only 도구만 등록) |
| `tools/lens-*.ts` | 각 read-only 도구 핸들러 (maencof 도구의 thin wrapper) |
| `prompt-injector.ts` | 프롬프트 주입 로직 |

### 공유 방식

- ogham monorepo 내에서 `packages/maencof`를 workspace 의존성으로 import
- maencof 패키지가 core/, search/, index/, types/를 barrel export로 공개
- maencof-lens는 이를 직접 import하여 사용 → 코드 중복 제로

---

## 7. 사용 시나리오

### 시나리오 A: 개발 중 설계서 참조

```
[개발 컨텍스트: ~/Workspace/ink-veil/]

사용자: "NER 모델 최적화 관련 설계서 찾아줘"

Claude → search(seed: ["NER", "모델 최적화"], vault: "fionn")
→ vault에서 "ink-veil NER Architecture Pivot" 문서 발견
→ read(path: "04_Action/ink-veil/ner-model-optimization-request.md")
→ 설계서 내용을 참고하여 개발 컨텍스트에서 구현 진행
```

### 시나리오 B: 아키텍처 의사결정 시 기존 지식 활용

```
[개발 컨텍스트: ~/Workspace/new-project/]

사용자: "FCA 아키텍처 패턴 적용하려는데, 기존 정리된 내용 있어?"

Claude → context(query: "FCA 아키텍처", vault: "fionn", token_budget: 3000)
→ FCA-AI 아키텍처 문서 + filid 기술 레퍼런스 조립
→ 조립된 컨텍스트를 기반으로 새 프로젝트에 적용 방안 제안
```

### 시나리오 C: 복수 vault 참조

```
[개발 컨텍스트: ~/Workspace/company-project/]

사용자: "개인 vault에서 관련 기술 레퍼런스 찾고, 업무 vault에서 프로젝트 스팩 찾아줘"

Claude → search(seed: ["기술 레퍼런스"], vault: "fionn")
       → search(seed: ["프로젝트 스팩"], vault: "work")
→ 두 vault의 결과를 종합하여 응답
```

---

## 8. 결과 및 기대 효과

| 항목 | 기대 결과 |
|------|----------|
| **컨텍스트 품질** | 개발 세션에서 vault 지식을 직접 참조 → 더 정확한 의사결정 |
| **워크플로우 연속성** | vault 세션 전환 없이 개발 흐름 유지 |
| **지식 활용률** | 축적된 지식의 실질적 사용 빈도 증가 |
| **코드 유지보수** | maencof core 로직 단일 소스 → 중복 제거, 일관성 보장 |
| **보안** | L1 기본 비공개, Layer 상한 적용 → 민감 정보 노출 방지 |

---

## 9. 스코프 경계

### v1 포함

- 단일 머신 내 복수 vault 참조
- 5개 read-only 도구 (`lens_` prefix)
- `.maencof-lens/config.json` 기반 설정
- Layer 필터링 (vault별 상한 + 도구별 교집합)
- 세션 단위 캐시
- 프롬프트 주입
- Stale index 경고

### v2 이후 고려

- Cross-vault 통합 검색 (단일 쿼리로 여러 vault 동시 탐색)
- 원격 vault 지원 (SSH/HTTP)
- Vault 간 링크 참조 (cross-vault wikilinks)
- 실시간 변경 감지 (file watcher)
- sub-layer 필터링 (L3 relational/structural/topical 구분)
- `dailynote_read` opt-in 지원
- 읽기 기반 insight 제안 (read → suggest, 쓰기는 별도 승인)

---

## 10. 결정 완료 사항

| # | 질문 | 결정 | 근거 |
|---|------|------|------|
| Q1 | MCP 도구 prefix | **없음** | prefix 제거. `search`, `read` — 플러그인 네임스페이스로 충분 |
| Q2 | Stale index 대응 | **경고만** | read-only 원칙 — rebuild는 역할 경계를 넘음 |
| Q3 | `dailynote_read` 포함 | **v1 제외** | 개인 행동 기록. 개발 컨텍스트에서 참조 이유 희박. `.maencof-meta` 등 추가 메타 정보는 별도 검토 |
| Q4 | sub-layer 필터링 | **v1 미지원** | layer 필터링으로 충분. 설정 복잡도 대비 실용성 낮음 |
| Q5 | 설정 위치 | **`.maencof-lens/config.json`** | 독자 디렉토리로 vault별 레이어 지정 관리 |

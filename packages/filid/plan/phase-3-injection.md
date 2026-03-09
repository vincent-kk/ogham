# Phase 3: PreToolUse 통합 Hook + 맥락 주입

> 상태: 설계 확정, 구현 대기 (Phase 2 완료 후)

## 목표

1. Claude Code가 파일에 접근할 때 해당 프랙탈 체인의 INTENT.md 맥락을 자동 주입한다.
2. 기존 분리된 PreToolUse Hook 3개를 단일 프로세스로 통합하여 성능을 개선한다.
3. 세션 내 읽은 파일들의 프랙탈 위치를 누적하여 구조적 관계 맵을 주입한다.

## 선행 조건

- Phase 1 완료 (INTENT.md/DETAIL.md 이름 확정)
- Phase 2 완료 (boundary 감지 + 체인 구성)

## Hook 통합 설계

### 현재 (3 프로세스 fork, Write|Edit만)

```
PreToolUse(Write|Edit) → pre-tool-validator.mjs  (~100ms)
                       → structure-guard.mjs      (~100ms)
                       = ~200ms / 호출
PreToolUse(Read)       → (없음)
```

### 통합 후 (1 프로세스 fork, Read|Write|Edit)

```
PreToolUse(Read|Write|Edit) → pre-tool-use.mjs (~100ms)
  ├── intentInjection(input)      ← Read|Write|Edit 전체
  ├── preToolValidation(input)    ← Write|Edit만
  └── structureGuard(input)       ← Write|Edit만
```

**성능 변화:**
- Write|Edit: ~200ms → ~100ms (개선)
- Read: 0ms → ~100ms (신규, 맥락 주입용)

### 파일 구조

```
src/hooks/
├── pre-tool-use.ts              ← 통합 오케스트레이터 (분기 로직)
├── intent-injector.ts           ← INTENT.md 맥락 주입 + 프랙탈 맵 로직
├── pre-tool-validator.ts        ← DETAIL.md append-only 검증 (기존)
├── structure-guard.ts           ← 구조 위반 검사 (기존)
└── entries/
    ├── pre-tool-use.entry.ts    ← 통합 진입점 (신규)
    ├── pre-tool-validator.entry.ts  ← 삭제 (통합)
    └── structure-guard.entry.ts     ← 삭제 (통합)
```

기존 `pre-tool-validator.ts`, `structure-guard.ts`의 **로직 파일은 유지**.
entry만 통합하여 단일 프로세스에서 import 조합.

### hooks.json 변경

```json
{
  "PreToolUse": [
    {
      "matcher": "Read|Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "... bridge/pre-tool-use.mjs",
          "timeout": 3
        }
      ]
    },
    {
      "matcher": "ExitPlanMode",
      "hooks": [
        {
          "type": "command",
          "command": "... bridge/plan-gate.mjs",
          "timeout": 3
        }
      ]
    }
  ]
}
```

## 맥락 주입 원칙

| 대상 | 주입 방식 |
|------|-----------|
| 현재 디렉토리의 INTENT.md | **전문 주입** (파일 내용 전체, 최초 1회) |
| 직계 조상의 INTENT.md | **경로 링크만** (Claude가 필요 시 직접 Read) |
| 형제 프랙탈의 INTENT.md | 주입 안 함 |
| DETAIL.md | 경로 힌트만 |
| 세션 내 읽은 파일들 | **프랙탈 맵** (누적 경로 구조) |

## Hook 입출력 형식

**입력** (stdin JSON — `PreToolUseInput`):
```json
{
  "cwd": "/path/to/project",
  "session_id": "abc123",
  "hook_event_name": "PreToolUse",
  "tool_name": "Read",
  "tool_input": {
    "file_path": "src/payment/checkout/handler.ts"
  }
}
```

**출력** (stdout JSON — `HookOutput`):
```json
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "[filid:ctx] ...\n[filid:map] ..."
  }
}
```

`<system-reminder>` 태그는 Claude Code가 `additionalContext`를 감싸서 자동 추가.

## 주입 텍스트 포맷 (LLM 토큰 최적화)

### 최초 주입 (해당 디렉토리 첫 접근 시)

```
[filid:ctx] src/payment/checkout/handler.ts
intent: src/payment/checkout/INTENT.md
---
{INTENT.md 전문 내용}
---
chain: src/payment/INTENT.md > src/INTENT.md
detail: src/payment/checkout/DETAIL.md
[filid:map] src/{payment/{checkout/*,refund},auth}
```

### 재방문 주입 (이미 INTENT.md 주입된 디렉토리)

```
[filid:map] src/{payment/{checkout/*,refund},auth}
```

**포맷 규칙:**
- `[filid:ctx]` — 현재 파일 맥락 (INTENT.md 전문 + 조상 체인 + DETAIL.md 힌트)
- `[filid:map]` — 세션 내 접근한 경로 목록, `*`가 현재 파일 위치
- brace expansion으로 공통 prefix 압축 (토큰 절감)
- 트리 그림(├──└──) 사용하지 않음 — 경로 자체가 계층을 내포

## 프랙탈 맵 (Fractal Map)

### 캐시 구조 — 단일 파일

```
~/.claude/plugins/filid/{cwdHash}/
├── session-context-{hash}         ← 기존: 세션 주입 마커
├── prompt-context-{hash}          ← 기존: FCA 규칙 텍스트 캐시
├── boundary-{sessionIdHash}       ← Phase 4: boundary 캐시
└── fmap-{sessionIdHash}.json      ← 신규: 프랙탈 맵 (단일 파일)
```

**fmap-{sessionIdHash}.json 스키마:**

```json
{
  "reads": ["src/payment/checkout", "src/payment/refund", "src/auth"],
  "intents": ["src/payment/checkout", "src/payment"],
  "details": ["src/payment"]
}
```

- `reads`: 세션 내 접근한 디렉토리 경로 (순서 보존, 중복 없음)
- `intents`: INTENT.md가 존재하는 디렉토리 (dedup 판단 겸용)
- `details`: DETAIL.md가 존재하는 디렉토리

### 매 PreToolUse(Read|Write|Edit) 시 동작

```
1. fmap JSON 읽기 (없으면 빈 객체)
2. 현재 파일의 디렉토리를 reads에 추가
3. INTENT.md 존재 여부 확인 → intents에 추가
4. DETAIL.md 존재 여부 확인 → details에 추가
5. reads가 intents에 없으면 → [filid:ctx] 전문 주입
   reads가 intents에 있으면 → [filid:map]만 주입 (재방문)
6. fmap JSON 쓰기
```

**dedup = fmap의 intents 배열**. 별도 마커 파일 불필요.

### brace 압축 알고리즘

```typescript
// 입력: ["src/payment/checkout", "src/payment/refund", "src/auth"]
// 출력: "src/{payment/{checkout,refund},auth}"
function compressPaths(paths: string[]): string
```

공통 prefix를 추출하여 brace expansion 형식으로 압축.
depth가 1이면 압축 없이 플랫 경로.

## 통합 오케스트레이터 로직

```typescript
// pre-tool-use.ts
export async function handlePreToolUse(input: PreToolUseInput): Promise<HookOutput> {
  const results: HookOutput[] = [];

  // 1. INTENT.md 맥락 + 프랙탈 맵 주입 (Read|Write|Edit 전체)
  results.push(await injectIntent(input));

  // 2. Write|Edit 전용 검증
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    // DETAIL.md(SPEC.md) 기존 내용을 오케스트레이터가 읽어서 전달
    const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
    let oldDetailContent: string | undefined;
    if (isDetailMd(filePath)) {
      try {
        oldDetailContent = readFileSync(resolve(input.cwd, filePath), 'utf-8');
      } catch { /* 신규 파일이면 undefined */ }
    }

    results.push(validatePreToolUse(input, oldDetailContent));
    results.push(await guardStructure(input));
  }

  // 결과 병합: continue = 모두 true여야 true, additionalContext = 합산
  return mergeResults(results);
}
```

**주의: `oldDetailContent` I/O 책임**
- 오케스트레이터가 `validatePreToolUse` 호출 전에 대상 파일의 기존 DETAIL.md 내용을 직접 읽음
- `pre-tool-validator.ts`는 내용을 전달받아 검증만 수행 (파일 I/O 없음)
- 단일 책임 분리 원칙에 부합하며, 테스트에서 mock이 용이

## 기존 Hook과의 관계

| Hook | 이벤트 | 상태 |
|------|--------|------|
| `pre-tool-use` (통합) | PreToolUse (Read\|Write\|Edit) | **신규** |
| `pre-tool-validator` (entry) | — | **삭제** (로직은 유지, 통합에 포함) |
| `structure-guard` (entry) | — | **삭제** (로직은 유지, 통합에 포함) |
| `context-injector` | UserPromptSubmit | **유지** (FCA 규칙 주입, 세션 최초 1회) |
| `plan-gate` | PreToolUse (ExitPlanMode) | **유지** (별도 matcher) |

## 산출물

- `src/hooks/pre-tool-use.ts` — 통합 오케스트레이터
- `src/hooks/intent-injector.ts` — INTENT.md 주입 + 프랙탈 맵 로직
- `src/hooks/entries/pre-tool-use.entry.ts` — 통합 진입점
- `hooks/hooks.json` 수정 — PreToolUse matcher 통합
- `scripts/build-hooks.mjs` 수정 — 빌드 진입점 변경
- `cache-manager.ts` 확장 — fmap JSON 읽기/쓰기
- 기존 entry 삭제: `pre-tool-validator.entry.ts`, `structure-guard.entry.ts`

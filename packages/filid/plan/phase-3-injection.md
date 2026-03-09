# Phase 3: PreToolUse 통합 Hook + 맥락 주입

> 상태: 설계 확정, 구현 대기 (Phase 2 완료 후)

## 목표

1. Claude Code가 파일에 접근할 때 해당 프랙탈 체인의 INTENT.md 맥락을 자동 주입한다.
2. 기존 분리된 PreToolUse Hook 3개를 단일 프로세스로 통합하여 성능을 개선한다.

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
├── intent-injector.ts           ← INTENT.md 맥락 주입 로직
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
| 현재 디렉토리의 INTENT.md | **전문 주입** (파일 내용 전체) |
| 직계 조상의 INTENT.md | **경로 링크만** (Claude가 필요 시 직접 Read) |
| 형제 프랙탈의 INTENT.md | 주입 안 함 |
| DETAIL.md | 경로 힌트만 |

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
    "additionalContext": "[filid] Context for src/payment/checkout/...\n..."
  }
}
```

`<system-reminder>` 태그는 Claude Code가 `additionalContext`를 감싸서 자동 추가.

### 주입 텍스트 포맷

```
[filid] Context for {relativePath}

## Current Module ({dirPath})
{INTENT.md 전문 내용 — 최대 50줄}

## Ancestor Chain
- ./INTENT.md (project root)
- src/INTENT.md
- src/payment/INTENT.md

## Detail Available
- src/payment/checkout/DETAIL.md
- src/payment/DETAIL.md
```

## 통합 오케스트레이터 로직

```typescript
// pre-tool-use.ts
export async function handlePreToolUse(input: PreToolUseInput): Promise<HookOutput> {
  const results: HookOutput[] = [];

  // 1. INTENT.md 맥락 주입 (Read|Write|Edit 전체)
  results.push(await injectIntent(input));

  // 2. Write|Edit 전용 검증
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    results.push(validatePreToolUse(input));
    results.push(await guardStructure(input));
  }

  // 결과 병합: continue = 모두 true여야 true, additionalContext = 합산
  return mergeResults(results);
}
```

## 중복 주입 방지

기존 `cache-manager.ts`의 세션 마커 패턴 재활용:

```
~/.claude/plugins/filid/{cwdHash}/injected-{sessionIdHash}-{dirHash}
```

- 디렉토리 단위로 마커 파일 생성
- 동일 세션 + 동일 디렉토리 → 마커 존재 시 주입 스킵
- `session-cleanup.ts`(SessionEnd)에서 마커 일괄 정리

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
- `src/hooks/intent-injector.ts` — INTENT.md 주입 로직
- `src/hooks/entries/pre-tool-use.entry.ts` — 통합 진입점
- `hooks/hooks.json` 수정 — PreToolUse matcher 통합
- `scripts/build-hooks.mjs` 수정 — 빌드 진입점 변경
- `cache-manager.ts` 확장 — 디렉토리별 주입 마커
- 기존 entry 삭제: `pre-tool-validator.entry.ts`, `structure-guard.entry.ts`

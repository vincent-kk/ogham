# Phase 3: PreToolUse 맥락 주입

> 상태: 설계 확정, 구현 대기 (Phase 2 완료 후)

## 목표

Claude Code가 파일에 접근할 때 PreToolUse Hook으로 해당 프랙탈 체인의 맥락을 자동 주입한다.
현재의 context-injector(규칙 텍스트 주입)를 실제 INTENT.md 내용 주입으로 전환.

## 선행 조건

- Phase 1 완료 (INTENT.md 이름 확정)
- Phase 2 완료 (boundary 감지 + 체인 구성)

## 확정된 주입 원칙

| 대상 | 주입 방식 |
|------|-----------|
| 현재 디렉토리의 INTENT.md | **전문 주입** (파일 내용 전체) |
| 직계 조상의 INTENT.md | **경로 링크만** (Claude가 필요 시 직접 Read) |
| 형제 프랙탈의 INTENT.md | 주입 안 함 |
| DETAIL.md | 경로 힌트만 |

### 주입 형태 예시

```
<system-reminder>
[filid] Context for src/payment/checkout/handler.ts

## Current Module (src/payment/checkout/)
<INTENT.md 전문 내용>

## Ancestor Chain
- ./INTENT.md (project root)
- src/INTENT.md
- src/payment/INTENT.md

## Detail Available
- src/payment/checkout/DETAIL.md
- src/payment/DETAIL.md
</system-reminder>
```

## 핵심 구현 사항

### 1. PreToolUse Hook 트리거

- Read, Write, Edit 도구 사용 시 트리거
- 파일 경로에서 디렉토리 추출 → Phase 2의 체인 구성 호출

### 2. 중복 주입 방지

Hook stdout은 tool result 블록으로 주입되므로 Claude 레벨 중복 감지 불가.
구현 레벨에서 대응:

- **세션 내 주입 이력 추적**: 동일 디렉토리에 대해 이미 주입했으면 스킵
- 단, Hook은 매번 새 프로세스 fork → 프로세스 간 상태 공유 불가
- → 디스크 기반 세션 파일(`~/.claude/plugin/filid/{session}/injected.json`) 또는 Phase 4 캐시 활용

### 3. 기존 context-injector와의 관계

현재 `context-injector.ts`는 UserPromptSubmit 시 FCA 규칙 텍스트를 주입.
Phase 3의 주입은 PreToolUse 시 INTENT.md **내용**을 주입.
두 가지는 공존 가능 (다른 이벤트, 다른 목적).

## 컨텍스트 윈도우 효율

- 깊은 체인(5+ depth)에서 링크 힌트만 주입 → 오염 최소화
- 현재 디렉토리 INTENT.md만 전문 주입 (50줄 이하 규칙으로 크기 제한됨)

## 산출물

- PreToolUse Hook 핸들러 (INTENT.md 주입)
- 중복 주입 방지 로직
- 주입 포맷 정의

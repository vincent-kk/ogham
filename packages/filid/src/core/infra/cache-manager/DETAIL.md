# cache-manager — Detail

## Requirements

세션/프롬프트/경계/프랙탈맵/런해시/가이드 6종 캐시를 `~/.claude/plugins/filid/{cwdHash}/` 디렉토리에 파일로 저장한다.

## API Contracts

| 함수 | 출처 파일 | 시그니처 |
|------|-----------|---------|
| `cwdHash` | session-cache | `(cwd: string) => string` |
| `getCacheDir` | session-cache | `(cwd: string) => string` |
| `sessionIdHash` | session-cache | `(sessionId: string) => string` |
| `isFirstInSession` | session-cache | `(sessionId, cwd) => boolean` |
| `markSessionInjected` | session-cache | `(sessionId, cwd) => void` |
| `pruneOldSessions` | session-cache | `(cwd) => void` |
| `pruneStaleCacheDirs` | session-cache | `() => void` |
| `removeSessionFiles` | session-cache | `(sessionId, cwd) => void` |
| `readPromptContext` | prompt-context-cache | `(cwd, sessionId) => string \| null` |
| `writePromptContext` | prompt-context-cache | `(cwd, context, sessionId) => void` |
| `hasPromptContext` | prompt-context-cache | `(sessionId, cwd) => boolean` |
| `readBoundary` | boundary-cache | `(cwd, sessionId, dir) => string \| null` |
| `writeBoundary` | boundary-cache | `(cwd, sessionId, dir, boundaryPath) => void` |
| `readFractalMap` | fractal-map-cache | `(cwd, sessionId) => FractalMap` |
| `writeFractalMap` | fractal-map-cache | `(cwd, sessionId, map) => void` |
| `removeFractalMap` | fractal-map-cache | `(cwd, sessionId) => void` |
| `saveRunHash` | run-hash-cache | `(cwd, skillName, hash) => void` |
| `getLastRunHash` | run-hash-cache | `(cwd, skillName) => string \| null` |
| `hasGuideInjected` | guide-cache | `(sessionId, cwd) => boolean` |
| `markGuideInjected` | guide-cache | `(sessionId, cwd) => void` |

## Intentional Cross-Concern Coupling

`session-cache.ts`의 `pruneOldSessions`와 `removeSessionFiles`는 다른 캐시 파일의 파일명 규약을 의도적으로 알고 있다 (`prompt-context-{hash}`, `guide-{hash}`, `boundary-{hash}`, `fmap-{hash}.json`). 이는 세션 정리 시 모든 연관 파일을 원자적으로 제거하기 위한 설계이며, 별도 추상화 없이 파일명을 직접 참조하는 것이 의도된 결합이다. 이 패턴을 변경하거나 추상화하려면 Ask-first 경계를 적용한다.

## Last Updated

2026-04-11

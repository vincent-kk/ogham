# Phase 4: Boundary 캐싱 (경량화)

> 상태: 결정 완료 — boundary만 캐싱, INTENT.md는 매번 직접 읽기

## 목표

프로젝트 루트 boundary(package.json 위치)만 세션 내 캐싱하여 반복적인 디렉토리 순회를 회피한다.
INTENT.md 존재 여부 및 내용은 캐싱하지 않는다.

## 선행 조건

- Phase 3 완료 (intent-injector가 캐시 소비자)

## 캐싱 범위

| 대상 | 캐싱 | 이유 |
|------|------|------|
| boundary 위치 (package.json) | O | 세션 내 불변, 디렉토리 순회 비용 절감 |
| INTENT.md 존재 여부 | **X** | 생성/삭제 빈번 → 캐시 오동작 위험 |
| INTENT.md 내용 | **X** | 50줄 이하, readFileSync 수 ms로 충분 |
| chain 구성 결과 | **X** | boundary만 알면 chain 구성은 즉시 계산 가능 |

## 왜 전체 캐시를 축소했는가

Phase 3의 intent-injector가 하는 일:
1. 디렉토리에서 위로 올라가며 `package.json` 찾기 (boundary) ← **이것만 캐싱**
2. 경로상 `INTENT.md` 존재 여부 확인 (`existsSync`) ← 수 us
3. 현재 디렉토리 `INTENT.md` 읽기 (`readFileSync`, 50줄) ← 수 ms

depth 5 체인이어도 `existsSync` 5~6번 + `readFileSync` 1번 = **수 밀리초**.
캐시 없이도 3초 timeout 내 충분. INTENT.md를 캐싱하면 생성/삭제 시 오동작 위험.

## 구현

### 기존 cache-manager.ts에 통합

`src/core/cache-manager.ts`의 기존 패턴을 그대로 활용:

```
~/.claude/plugins/filid/{cwdHash}/
├── session-context-{hash}                ← 기존: 세션 주입 마커
├── prompt-context-{hash}                 ← 기존: FCA 규칙 텍스트 캐시
├── run-{skillName}.hash                  ← 기존: 스킬 실행 해시
├── boundary-{sessionIdHash}              ← 신규: boundary 위치 캐시 (JSON)
└── injected-{sessionIdHash}-{dirHash}    ← 신규: 디렉토리별 주입 마커
```

추가할 함수:

```typescript
// boundary 캐시
readBoundary(cwd, sessionId, dir): string | null
writeBoundary(cwd, sessionId, dir, boundaryPath): void

// 디렉토리별 주입 중복 방지 마커
isIntentInjected(cwd, sessionId, dir): boolean
markIntentInjected(cwd, sessionId, dir): void
```

기존 `removeSessionFiles(sessionId, cwd)` 확장:
- boundary-{hash} 파일 정리
- injected-{hash}-* 마커 정리

### 무효화

- git HEAD 변경 시: **전체 무효화** (boundary 파일 삭제, lazy 재빌드)
- 세션 종료 시: 기존 `session-cleanup.ts`(SessionEnd)에서 자동 정리

## 기존 Phase 4 계획과의 차이

| 원래 계획 | 현재 결정 |
|-----------|-----------|
| 전체 tree 캐싱 (chain, mtimes, INTENT.md 내용) | boundary 위치만 캐싱 |
| mtime 기반 파일 단위 무효화 | 전체 무효화 (lazy 재빌드) |
| `filid build` 프리빌드 CLI | 불필요 (lazy로 충분) |
| git diff 선택적 무효화 | 불필요 (전체 무효화 비용 무시) |

## 산출물

- `cache-manager.ts` 확장 — boundary 캐시 읽기/쓰기
- `session-cleanup.ts` 확장 — boundary 캐시 정리
- Phase 6 (고속화)는 실측 후 필요 시에만 도입

# 정본 수정 의뢰서 (C4) — 규칙 문서의 호스트 채널 분기

> **작성 2026-07-15.** [stage4-host-paths.md](./stage4-host-paths.md)(경로 좌표 — **이미 반영됨**, main `77825966`)의 **후속 델타**다. 이 문서는 그 작업에 **없던 항목** 하나만 다룬다: G8 게이트를 그 뒤에 닫았기 때문이다.
>
> **자립 문서** — 실측 근거를 여기에 다 담았으므로 다른 문서를 읽지 않아도 착수할 수 있다.
> **대상: 플러그인 런타임(정본)** — 어댑터·도구와 별개 브랜치에서 수정한다.

---

## 0. 무엇이 남았나

경로 좌표(`pluginRoot()`·`projectRoot()`)는 `@ogham/cross-platform` 의 `hostPaths` 로 이미 정리됐다. **남은 것은 "쓰기 대상 파일의 이름·위치가 호스트마다 다르다" 는 축이다.**

| 대상                                  | 지금                      | Codex 에서 필요한 것 |
| ------------------------------------- | ------------------------- | -------------------- |
| filid 규칙 문서 배포 (`syncRuleDocs`) | `.claude/rules/*.md` 고정 | **`AGENTS.md` 병합** |
| maencof 지침 병합 (`claudeMdMerger`)  | `CLAUDE.md` 고정          | **`AGENTS.md`**      |

둘 다 **Codex 에서는 지금 무의미하게 동작한다** — Codex 는 `.claude/rules/*.md` 도 `CLAUDE.md` 도 읽지 않는다. 파일은 만들어지지만 모델은 못 본다. 에러가 아니라 **조용한 무효**라 더 위험하다.

---

## 1. 왜 `AGENTS.md` 인가 (실측 근거)

**기존 가정이 틀렸다.** 설계 문서는 `~/.codex/rules/` 를 filid 규칙의 Codex 타깃 후보로 적어뒀는데, 실제로 열어보니 지침 문서 채널이 **아니다**:

```
# ~/.codex/rules/default.rules
prefix_rule(pattern=["yarn", "test:run"], decision="allow")
prefix_rule(pattern=["gh", "pr", "checks"], decision="allow")
```

**쉘 커맨드 승인 allowlist** 다 — Claude 의 `settings.json` permissions 에 대응하지, `.claude/rules/*.md`(마크다운 지침)에 대응하지 않는다. **여기에 마크다운을 쓰면 안 된다.**

Codex 의 지침 채널은 **`AGENTS.md` 하나**다. 마커를 심어 `codex debug prompt-input`(모델이 보는 프롬프트를 그대로 렌더)으로 실측했다:

| 파일                      | 모델 프롬프트 주입                |
| ------------------------- | --------------------------------- |
| 저장소 루트 `AGENTS.md`   | ✅ 주입됨 (user role)             |
| 전역 `~/.codex/AGENTS.md` | ✅ 주입됨                         |
| **둘 다 있을 때**         | ✅ **둘 다 주입되고 함께 쌓인다** |
| `.claude/rules/*.md`      | ❌ 무시                           |

⇒ 저장소 루트와 전역 중 **어디에 쓸지는 설계 결정**이다(둘 다 유효). filid 는 프로젝트 단위 규칙이므로 **저장소 루트 `AGENTS.md`** 가 자연스럽다.

**agy 는 미실측** — `GEMINI.md`·`AGENTS.md`·`.agents/rules/*.md` 가 후보지만 확인하지 않았다. **agy 분기는 비워두고 지원한다고 주장하지 말 것.**

---

## 2. 수정 지점 (main `60ab6c87` 기준 검증됨)

### C4-1. filid — 규칙 문서 배포

```
filid/src/core/infra/configLoader/loaders/syncRuleDocs.ts:73
    const rulesDir = join(resolvedRoot, '.claude', 'rules');          ← 쓰기 대상

filid/src/core/infra/configLoader/loaders/getRuleDocsStatus.ts:66
    const destPath = join(resolvedRoot, '.claude', 'rules', entry.filename);
filid/src/core/infra/configLoader/loaders/getRuleDocsStatus.ts:70
    ? join(resolvedRoot, '.claude', 'rules', entry.legacyFilename)     ← drift 감지도 같은 경로
```

**주의 — 읽기 쪽도 같이 봐야 한다.** 훅이 규칙 존재 여부를 이 경로로 판정한다:

```
filid/src/hooks/userPromptSubmit/utils/buildMinimalContext.ts:19,23
    existsSync(join(root, '.claude', 'rules', 'filid_fca-policy.md'))
```

Codex 에서 규칙을 `AGENTS.md` 에 병합하면 이 존재 판정이 항상 false 가 된다 → **훅이 "규칙 없음" 으로 오판**한다. 쓰기 채널만 바꾸고 읽기 채널을 놔두면 새 버그가 생긴다.

**설계 고려**: `.claude/rules/` 는 **파일 여러 개**인데 `AGENTS.md` 는 **파일 하나**다. 병합 전략(섹션 마커로 감싸 idempotent 하게 삽입/갱신)이 필요하고, 그래야 `syncRuleDocs` 의 add/remove 의미론이 유지된다. maencof 의 `claudeMdMerger` 가 이미 같은 문제를 풀고 있으니 **그 병합 로직을 재사용하거나 같은 규약을 따를 것**.

### C4-2. maencof — 지침 병합

```
maencof/src/constants/claudeMd.ts:2
    export const CLAUDE_MD_RELATIVE_PATH = 'CLAUDE.md';               ← 호스트 고정

maencof/src/mcp/server/registrations/claudeMd.ts:34,64
    () => CLAUDE_MD_RELATIVE_PATH                                     ← 소비처 2곳
```

`CLAUDE_MD_RELATIVE_PATH` 를 상수에서 **`detectHost()` 기반 함수**로 바꾸면 소비처는 이미 `() => …` 형태라 그대로 붙는다.

### C4-3. 상태 디렉터리 (같은 축, 별건)

`~/.claude/` 밑에 런타임 상태를 쓰는 지점들 — Codex 로 돌려도 Claude 폴더에 상태가 쌓인다. 기능은 동작하므로 **우선순위 낮음**이나 같은 분기에 얹을 수 있다.

```
deilen/src/constants/paths.ts        (CLAUDE_CONFIG_DIR ?? ~/.claude)
r-statistics  R_STATISTICS_HOME      (= join(claudeRoot(), 'plugins', 'r-statistics'))
```

---

## 3. 설계

`@ogham/cross-platform` 의 `hostPaths` 에 **문서 채널 해석**을 추가한다 (경로 좌표와 같은 집, 이미 8/10 플러그인이 의존):

```ts
/** 호스트가 지침 문서로 읽는 파일. Claude=CLAUDE.md, Codex=AGENTS.md. */
export function instructionsFile(): string;
//  claude → "CLAUDE.md"
//  codex  → "AGENTS.md"
//  agy    → 미정 (실측 전까지 claude 와 동일하게 두거나 throw)

/** 규칙 문서를 어디에 어떻게 쓰는가. */
export function ruleDocsTarget():
  | { kind: "directory"; path: string }
  | { kind: "merge"; file: string };
//  claude → { kind: "directory", path: ".claude/rules" }
//  codex  → { kind: "merge", file: "AGENTS.md" }      ← 파일 하나에 섹션 병합
```

**Claude 무결손이 절대 조건**: `OGHAM_HOST` 부재(=Claude)에서 전 플러그인 테스트가 **현행과 동일 통과**해야 한다. 분기는 가산적으로 — 기존 경로를 바꾸지 말고 옆에 추가한다.

---

## 4. 완료 기준

- **Claude**: `OGHAM_HOST` 부재에서 filid `syncRuleDocs` 가 `.claude/rules/*.md` 를 지금과 똑같이 배포하고, maencof 가 `CLAUDE.md` 를 지금과 똑같이 병합한다. 전 테스트 동일 통과.
- **Codex**: filid 규칙이 `AGENTS.md` 에 병합되고, **훅의 규칙 존재 판정이 그 채널을 본다**(오판 없음). `codex debug prompt-input` 에 규칙 내용이 실제로 실린다.
- **Codex**: maencof 가 `AGENTS.md` 를 병합 대상으로 잡는다.
- 재실행 idempotent — 같은 규칙을 두 번 배포해도 `AGENTS.md` 가 중복 누적되지 않는다.

---

## 5. 참고 — 남은 4개 `process.cwd()` 지점은 손대지 말 것

경로 좌표 작업 후 남은 4건은 **의도적으로 남긴 것**이다. 프로젝트 좌표가 아니다:

```
filid/src/ast/astGrepShared/utils/getSgModule.ts:20    ← @ast-grep/napi 모듈 해석용
imbas/src/ast/astGrepShared/astGrepShared.ts:43        ← 동일
deilen/src/mcp/httpServer/utils/bridgeRoot.ts:35       ← 자기탐색 폴백 (pluginRoot 우선)
deilen/.../renderViewer/operations/resolveMarkdown.ts:21 ← 주석
```

Codex 에서 cwd 가 플러그인 루트라는 사실이 이 지점들에는 **오히려 유리**하다. 프로젝트 좌표로 오분류해서 바꾸지 말 것.

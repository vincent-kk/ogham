# filid 규칙 문서 분할 계획

> `plugins/filid/templates/rules/filid_fca-policy.md` (320줄) 을 seiri 규칙 포맷의
> **4개 필수 규칙 문서**로 분할한다. 이 문서는 실행 계획이며, 세션 없이 수행 가능하도록
> 경로·명령·기대 출력을 명시한다.

## 결정 사항 (확정)

| 항목               | 결정                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| 파일 수            | 4개 (내용은 6분할 체제와 동일, 전부 required 이므로 파일 수를 제한)  |
| required 정책      | 4개 전부 `required: true`                                            |
| 구 파일 회수       | `filid_fca-policy.md` 는 owned orphan 스윕으로 자동 삭제 (아래 근거) |
| `fca.md` 마이그레이션 | `filid_fractal-boundaries.md` 엔트리가 `legacyFilename` 승계        |
| 훅 포인터          | 대표 문서 1개 유지 + 대표 문서가 형제 문서를 본문에서 지목            |

### 구 파일 회수 근거 (스키마 변경 불필요)

- `shared/agent-artifacts/src/rules/planning/listOwnedRuleOrphans.ts:13` — 소유권 판정이
  `filename.startsWith(`${owner}_`) && filename.endsWith('.md')`. owner 는 `'filid'`.
- manifest 에서 사라진 `filid_fca-policy.md` 는 `knownFilenames` 에 없으므로 owned orphan →
  `planDirectoryRuleOrphan.ts:25-36` 이 `content: null` 로 삭제를 계획한다.
- `fca.md` 는 `filid_` 접두사가 없어 스윕되지 않는다. 따라서 **한 엔트리만**
  `legacyFilename: "fca.md"` 를 승계해야 한다.
- `shared/agent-artifacts/src/rules/helpers/validateRuleDocuments.ts:16-23` 이
  filename + legacyFilenames 전역 유일성을 강제하므로 두 엔트리가 같은 legacy 를 주장하면
  `Duplicate rule document filename` 으로 sync 가 실패한다. 승계는 정확히 1개.

---

## 전역 제약 (모든 작업이 상속)

- TypeScript ^5.7 / Node ≥ 20 / ESM, import 확장자 `.js`.
- **템플릿 바이트 불변 전제**: `.prettierignore:12` 가 `plugins/*/templates/rules/` 를 포매터에서
  제외하고 `.gitattributes` 가 해당 `*.md` 를 `eol=lf` 로 고정한다. 새 파일도 이 글롭에 자동 포함되므로
  별도 조치는 없으나, **템플릿을 손으로 재포맷하지 말 것** — 저장된 `templateHash` 가 전부 무효가 되고
  이미 배포된 사용자 사본이 로컬 드리프트로 보고된다.
- **수치 임계값은 filid 소유**다. `plugins/seiri/src/__tests__/ruleInvariants.test.ts:42-70` 의
  THRESHOLD 금지 정규식은 seiri 전용이며 filid 로 복사하지 않는다. 50줄·15·32·max-depth 는 전부 유지한다.
- **seiri 파일명을 참조하지 않는다.** 대상 프로젝트에 seiri 가 없을 수 있다. 층위 관계는
  "일반 구조 규칙이 방향을 말하는 자리에서, 이 규칙은 임계값과 증거 기준을 공급한다" 식의
  조건부 산문으로만 표현한다.
- **훅 도달 코드는 배럴 import 금지** — 구체 파일 직접 import (`../../../constants/ruleDocs.js` 형태).
- 규칙 문서 본문 언어는 영어 (사용자 전역 지침: Claude 컴포넌트 파일은 영어).

### seiri 규칙 포맷 골격 (기계 검사 대상)

`plugins/seiri/src/__tests__/ruleInvariants.test.ts` 가 강제하는 3가지. 4개 문서 전부 충족해야 한다.

```markdown
[---
paths:                          ← 조건부 문서만. `globs:` 는 금지(하니스가 무시하고 상시 로드로 바뀜)
  - '<glob>'
---]

# <제목>

> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > filid defaults. On conflict, the higher source wins and this rule yields.
                                ← B1: /^> \*\*Precedence\*\*:/m

<요지 1–2문장> This rule rests on a property every codebase has: <최소 전제>.
                                ← B5: /\brests on (a property|properties)\b/i

**Tradeoff:** <선택> **Applies when:** <활성 조건>

## N. <명령형 한 줄>

**<굵은 격언 한 줄>**

- <구체 지침>

Ask yourself: "<자기점검 질문>"

---

**This rule is working if:** <관찰 가능한 성공 신호> **This rule is wrong for you if:** <정직한 적용 제외>
                                ← B6: `This rule is working if:` + `is wrong for you if:`
```

---

## 파일 맵

### 생성 (4)

| 경로                                                        | 책임                            | 로딩                  | 예상 |
| ----------------------------------------------------------- | ------------------------------- | --------------------- | ---- |
| `plugins/filid/templates/rules/filid_fractal-boundaries.md`  | 노드가 무엇이고 어떻게 건너는가 | 상시                  | ~110 |
| `plugins/filid/templates/rules/filid_module-documents.md`    | INTENT/DETAIL 문서 계약         | `paths:` INTENT/DETAIL | ~60  |
| `plugins/filid/templates/rules/filid_verification-records.md`| 검증 문서 역할과 상한           | `paths:` 테스트 글롭  | ~55  |
| `plugins/filid/templates/rules/filid_code-placement.md`      | 어디에 두고 어떤 순서로 바꾸는가 | 상시                  | ~50  |

### 삭제 (1)

| 경로                                                | 사유                     |
| --------------------------------------------------- | ------------------------ |
| `plugins/filid/templates/rules/filid_fca-policy.md` | 위 4개로 대체            |

### 수정

| 경로                                                          | 변경                                              |
| -------------------------------------------------------------- | ------------------------------------------------- |
| `plugins/filid/templates/rules/manifest.json`                   | 엔트리 1 → 4                                      |
| `plugins/filid/templates/rules/README.md`                       | 예시 manifest 와 "규칙 추가" 절차 갱신            |
| `plugins/filid/src/constants/ruleDocs.ts`                       | 단일 상수 → 대표 문서 + legacy 목록               |
| `plugins/filid/src/hooks/userPromptSubmit/utils/inspectFcaPolicy.ts` | legacy 배열 확장                             |
| `plugins/filid/src/hooks/userPromptSubmit/DETAIL.md`            | 포인터 계약 갱신 (코드보다 먼저)                  |
| `plugins/filid/src/core/infra/configLoader/DETAIL.md`           | rule-doc 엔트리 수·legacy 계약 갱신 (코드보다 먼저) |
| `plugins/filid/src/__tests__/unit/hooks/userPromptSubmitContext.test.ts` | 리터럴 어서션 7곳                       |
| `plugins/filid/src/hooks/userPromptSubmit/__tests__/injectContext.test.ts` | `RULE_FILE` 상수                      |
| `plugins/filid/src/__tests__/unit/core/configRuleDocuments.test.ts` | `REQUIRED_ID` / `REQUIRED_FILE`                |
| `plugins/filid/src/__tests__/unit/core/ruleDocsChannel.test.ts`  | 픽스처 엔트리                                     |
| `plugins/filid/src/__tests__/unit/core/ruleDocsCompatibility.test.ts` | orphan 스윕 + legacy 승계 케이스 추가        |
| `plugins/filid/src/mcp/tools/openSettings/webServer/__tests__/webServer.test.ts` | `ruleDocs.selections` 키           |
| `plugins/filid/src/mcp/tools/ruleDocsSync/__tests__/ruleDocsSync.test.ts` | "filid 는 fca-policy 하나만 배포" 주석 2곳   |
| `.metadata/filid/04-USAGE.md`                                   | 78행 AGENTS.md 원본 문장                          |
| `.metadata/filid/07-RULES-REFERENCE.md`                         | 3행 canonical 규칙 문서 경로                      |
| `.claude/rules/`                                                | 재배포 산출물 (T4 에서 도구가 씀)                 |

---

## 내용 배분 (원문 320줄 → 4개 문서)

원문 행 번호는 삭제 전 `filid_fca-policy.md` 기준.

### 1. `filid_fractal-boundaries.md` — 6절, 상시

| 절 | 굵은 격언(초안)                                                | 원문 출처                    |
| -- | --------------------------------------------------------------- | ---------------------------- |
| 1  | Classification comes from files that exist, not from intent.     | `:31-38`, `:40-63`, `:75-77` |
| 2  | Classification describes; it never prescribes.                   | `:64-74`                     |
| 3  | A fractal is crossed through its entry point, never around it.   | `:113-123`, `:149-155`       |
| 4  | A fractal root holds documents and entry points — not code.      | `:142-147`                   |
| 5  | Organ access is judged by where the consumer sits.               | `:157-186` (표 포함)         |
| 6  | The graph is acyclic and depth is a toll.                        | `:125-140`                   |

- 1절에 노드 타입 표(`:33-38`), 6단계 우선순위, `entryPointOverrides` 가 분류가 아니라
  `entry-point-surface` 를 먹인다는 단서(`:51-57`), 기본 organ 이름 목록(`:75-77`)을 모두 담는다.
- 5절은 원문의 소비자/경로/판정 표(`:160-164`)를 그대로 옮기고, 면책 선언 위치가
  소유 fractal 의 `DETAIL.md` 라는 점(`:179-181`)과 Reason 이 하중 필드라는 점(`:265-267`)을
  한 불릿으로 지목한다. 문법 자체는 문서 2에 있다.
- 6절에 `indeterminate` 가 PASS 로 승격되지 않는다는 원칙(`:89`)을 순환 판정 문맥으로 인라인한다.
- B5 근거 문장: `This rule rests on a property every codebase has: directories contain files, and files reference one another.`
- B6 반증: `...is wrong for you if:` 저장소가 FCA 를 채택하지 않았다면 — 그때는 스캐너가
  없는 fractal 을 지목할 뿐 규칙이 강제되지 않는다.
- **형제 지목**: 인트로 말미에 한 줄 — 문서 계약은 `filid_module-documents.md`,
  검증 문서는 `filid_verification-records.md`, 배치는 `filid_code-placement.md` 에 있다.

### 2. `filid_module-documents.md` — 5절, `paths:` 조건부

frontmatter:

```yaml
---
paths:
  - 'INTENT.md'
  - 'DETAIL.md'
---
```

| 절 | 굵은 격언(초안)                                            | 원문 출처            |
| -- | ------------------------------------------------------------ | -------------------- |
| 1  | INTENT records the boundary; DETAIL records the contract.    | `:229-236`, `:240-245` |
| 2  | INTENT is at most 50 lines and names its three boundaries.   | `:97-99`             |
| 3  | An organ has no INTENT — independent docs mean a fractal.    | `:108-111`           |
| 4  | DETAIL is current state, not an append-only history.         | `:103-106`, `:243-247` |
| 5  | An exemption without a reason is a disabled rule in costume. | `:248-267`           |

- 4절에 수용 그룹 ID 안정성(`:106`)과 `legacy-criteria-ledger` 미자동삭제(`:246-247`)를 포함한다.
- 5절은 `Organ Exemptions` 코드 블록(`:254-263`)을 **펜스 안에** 그대로 유지한다. 원문에서 이 펜스가
  헤딩 파서에 유령 절 2개로 보였으므로, 펜스 앞뒤에 빈 줄을 두어 경계를 분명히 한다.
- B5 근거: `This rule rests on a property every FCA project has: a module's contract is written down in a file next to the code.`

### 3. `filid_verification-records.md` — 5절, `paths:` 조건부

frontmatter는 `plugins/seiri/templates/rules/seiri_test-validity.md:1-18` 의 글롭 세트를 그대로 사용한다
(`*.test.*`, `*.spec.*`, `*_test.*`, `*_spec.*`, `test_*.*`, `*Test.*`, `*Tests.*`, `*Spec.*`,
`conftest.py`, `__tests__`, `test`, `tests`, `spec`, `specs`, `e2e`). `globs:` 로 쓰지 말 것.

| 절 | 굵은 격언(초안)                                                 | 원문 출처   |
| -- | ----------------------------------------------------------------- | ----------- |
| 1  | Verification files hold roles, not ranks.                         | `:210-213`  |
| 2  | A spec-document holds 15 cases; a test-record holds 32 per file.  | `:188-195`  |
| 3  | What cannot be counted is indeterminate, never a pass.            | `:215-221`  |
| 4  | Never remove coverage to meet a cap.                              | `:223-225`  |
| 5  | Multiple spec-documents bind to distinct DETAIL groups.           | `:197-206`  |

- 2절에 test-record 의 프로젝트 전체 총량 무제한(`:195`)을 명시한다 — 상한이 파일당임을 놓치면
  커버리지를 깎는 오독이 생긴다.
- 5절에 `filid:contract <group-id>` 마커(`:205-206`)와 sibling 그룹 집합 비중첩(`:200`)을 담는다.
- B5 근거: `This rule rests on a property every codebase has: verification files exist, and their cases can be counted.`

### 4. `filid_code-placement.md` — 5절, 상시

| 절 | 굵은 격언(초안)                                                | 원문 출처   |
| -- | ---------------------------------------------------------------- | ----------- |
| 1  | Shared code sits at the lowest common fractal of its consumers.  | `:271-273`  |
| 2  | An organ cannot be a lowest common ancestor.                     | `:275`      |
| 3  | No evidence for a name means a decision is required, not invented.| `:276-277`  |
| 4  | Planning is read-only; the postcondition demands the exact target.| `:278-284`  |
| 5  | The document changes before the code does.                       | `:310-320`  |

- 3절은 `shared` / `common` 을 지어내지 말고 `requiresDecision: true` 를 세우라는 원문 규범을 유지한다.
- 5절은 Development Workflow 7단계를 불릿으로 옮기고, "경고도 findings 로 센다"(`:319`)를 유지한다.
- B5 근거: `This rule rests on a property every codebase has: a unit has a location, and its consumers have locations too.`

### 이관·삭제 (43줄)

| 원문                          | 처리                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `:15-29` Product Boundary     | `plugins/filid/INTENT.md` 로 이관 — 프로젝트 규칙이 아니라 제품 범위 선언   |
| `:79-91` Adapter Boundary     | `plugins/filid/src/adapters/INTENT.md` 로 이관. 단 `:89` 의 "indeterminate/unsupported 를 PASS 로 바꾸지 말 것"은 문서 1 §6 과 문서 3 §3 에 인라인 유지 |
| `:286-300` Cross-review Scope | `plugins/filid/skills/cross-review/SKILL.md` 로 이관                        |
| `:302-308` Structure Principles | **삭제** — 문서 1·4 의 요약 중복                                          |
| `:1-13` 머리말                | 각 문서 인트로로 분산 (요약 4불릿은 재사용하지 않는다)                      |

---

## 작업

각 작업은 독립적으로 리뷰·거부 가능하며 검증 가능한 산출물로 끝난다.

### T1 — 규칙 문서 4개 작성

**산출물**: `plugins/filid/templates/rules/` 아래 새 파일 4개. 구 파일은 아직 지우지 않는다(대조용).

**단계**

1. 위 "내용 배분" 표대로 4개 파일을 작성한다. 각 파일은 "seiri 규칙 포맷 골격" 을 그대로 따른다.
2. Precedence 줄은 4개 파일 전부 아래와 **완전히 동일한 한 줄**로 쓴다.

   ```
   > **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > filid defaults. On conflict, the higher source wins and this rule yields.
   ```

3. 문서 2·3 의 frontmatter 는 `paths:` 키를 쓴다. `globs:` 는 하니스가 무시해 조용히 상시 로드가 된다.
4. 원문을 지우기 전에 커버리지를 대조한다 — "내용 배분" 표의 모든 원문 행 범위가 어느 문서에 들어갔는지
   확인하고, 이관·삭제 표에 없는 행이 남지 않았는지 본다.

**검증**

```bash
cd /Users/Vincent/Workspace/ogham_mk2/plugins/filid/templates/rules
for f in filid_fractal-boundaries.md filid_module-documents.md filid_verification-records.md filid_code-placement.md; do
  printf '%-38s B1:%s B5:%s B6a:%s B6b:%s lines:%s\n' "$f" \
    "$(grep -cE '^> \*\*Precedence\*\*:' $f)" \
    "$(grep -ciE 'rests on (a property|properties)' $f)" \
    "$(grep -c 'This rule is working if:' $f)" \
    "$(grep -c 'is wrong for you if:' $f)" \
    "$(wc -l < $f)"
done
grep -l '^globs:' filid_*.md; echo "globs exit=$?"
```

기대: 4행 전부 `B1:1 B5:1 B6a:1 B6b:1`. 마지막 줄 `globs exit=1` (일치 없음).

**인터페이스 (후속 작업이 소비)**

- 파일명 4개: `filid_fractal-boundaries.md`, `filid_module-documents.md`,
  `filid_verification-records.md`, `filid_code-placement.md`
- 대표 문서: `filid_fractal-boundaries.md` (T3 의 훅 포인터 대상)

---

### T2 — manifest 교체 · 구 템플릿 삭제 · 해시 동기화

**산출물**: 엔트리 4개짜리 `manifest.json`, 해시 주입 완료, `--check` 통과.

**단계**

1. `plugins/filid/templates/rules/filid_fca-policy.md` 를 삭제한다.
2. `plugins/filid/templates/rules/manifest.json` 의 `rules` 배열을 아래로 교체한다.
   `templateHash` 는 빈 문자열로 두지 말고 **아예 넣지 않는다** — 3단계가 주입한다.
   (`loadRuleDocsManifest.ts:24-30` 이 빈 해시를 오류로 던지므로 3단계 전에는 로드가 실패하는 것이 정상.)

   ```json
   {
     "_comment": "Injectable rule docs manifest. Used by syncRuleDocs() to drive rule file deployment from the setup skill. Never read by SessionStart hooks. All four entries are required — filid rules are not partially adoptable.",
     "version": "1.0",
     "rules": [
       {
         "id": "filid_fractal-boundaries",
         "filename": "filid_fractal-boundaries.md",
         "legacyFilename": "fca.md",
         "required": true,
         "title": "Fractal Boundaries",
         "description": "Node classification, entry-point surfaces, organ access, exemptions, and the acyclic dependency graph."
       },
       {
         "id": "filid_module-documents",
         "filename": "filid_module-documents.md",
         "required": true,
         "title": "Module Documents",
         "description": "INTENT and DETAIL document contracts: the 50-line boundary doc, the current-state contract ledger, and organ exemption entries."
       },
       {
         "id": "filid_verification-records",
         "filename": "filid_verification-records.md",
         "required": true,
         "title": "Verification Records",
         "description": "Spec-document and test-record roles, the 15 and 32 case caps, counting rules, and DETAIL acceptance-group links."
       },
       {
         "id": "filid_code-placement",
         "filename": "filid_code-placement.md",
         "required": true,
         "title": "Code Placement",
         "description": "Lowest-common-fractal placement, restructure plan preconditions and postconditions, and the document-before-code workflow."
       }
     ]
   }
   ```

3. 해시를 주입한다.

   ```bash
   cd /Users/Vincent/Workspace/ogham_mk2 && yarn filid build:rules
   ```

   기대: 종료 코드 0, `manifest.json` 의 4개 엔트리 전부에 `templateHash` 가 채워짐.

**검증**

```bash
cd /Users/Vincent/Workspace/ogham_mk2/plugins/filid && node scripts/syncRuleHashes.mjs --check
node -e "const m=require('./templates/rules/manifest.json');console.log(m.rules.length, m.rules.every(r=>r.templateHash&&r.required))"
```

기대: `--check` 종료 코드 0. 두 번째 명령이 `4 true`.

**인터페이스**: manifest id 4개 — `filid_fractal-boundaries`, `filid_module-documents`,
`filid_verification-records`, `filid_code-placement`.

---

### T3 — DETAIL 갱신 → 상수·훅 변경 → 테스트 갱신

FCA 워크플로에 따라 **DETAIL 을 코드보다 먼저** 고친다.

**산출물**: `yarn filid typecheck` 통과 + 영향 받은 단위 테스트 green.

**단계**

1. `plugins/filid/src/hooks/userPromptSubmit/DETAIL.md` 의 포인터 계약을 갱신한다 —
   대표 규칙 문서가 `filid_fractal-boundaries.md` 이고 legacy 주소가
   `filid_fca-policy.md` → `fca.md` 순으로 조회된다는 사실을 적는다.
   3줄 output 규약 자체는 바뀌지 않는다.
2. `plugins/filid/src/core/infra/configLoader/DETAIL.md` 의 rule-doc 계약을 갱신한다 —
   엔트리 4개 전부 required, legacy 승계는 대표 엔트리 1개, 구 파일은 owned orphan 스윕으로 회수.
3. `plugins/filid/src/constants/ruleDocs.ts` 를 고친다. 이름이 단일 문서를 전제하므로 함께 바꾼다.

   ```ts
   /** The rule document the hook reports the project's status from. */
   export const PRIMARY_RULE_DOC = 'filid_fractal-boundaries.md';

   /**
    * Addresses this document has had before, newest first. `filid_fca-policy.md`
    * was the single combined policy doc; `fca.md` predates the `filid_` prefix.
    * Siblings deployed alongside the primary doc need no legacy chain — they
    * never existed under another name.
    */
   export const LEGACY_RULE_DOCS = ['filid_fca-policy.md', 'fca.md'] as const;
   ```

   `FILID_SECTION_NAMESPACE` 와 `ruleDocMarkers()` 는 그대로 둔다.

4. `plugins/filid/src/hooks/userPromptSubmit/utils/inspectFcaPolicy.ts` 를 갱신한다.

   ```ts
   import {
     LEGACY_RULE_DOCS,
     PRIMARY_RULE_DOC,
   } from '../../../constants/ruleDocs.js';
   // ...
   return inspectTrustedRuleDocumentPresence(
     { owner: 'filid', target },
     { filename: PRIMARY_RULE_DOC, legacyFilenames: [...LEGACY_RULE_DOCS] },
   );
   ```

   함수명 `inspectFcaPolicy` 는 유지한다 — 호출부(`buildMinimalContext.ts:19`)와
   INTENT 문구가 이 이름을 쓰고 있고, 의미("FCA 정책이 배포됐는가")는 변하지 않았다.
   `buildMinimalContext.ts` 는 변경하지 않는다 — `displayTarget` 이 대표 문서를 가리키고
   형제 문서는 대표 문서 본문이 지목한다(T1 §1 형제 지목).

5. 테스트를 갱신한다. 리터럴 대조 지점:

   - `src/__tests__/unit/hooks/userPromptSubmitContext.test.ts` — 8·28·46·88·101·133·155·178·242행 근처의
     `filid_fca-policy.md` 리터럴을 `filid_fractal-boundaries.md` 로 바꾼다.
   - `src/hooks/userPromptSubmit/__tests__/injectContext.test.ts:22` — `RULE_FILE` 상수.
   - `src/__tests__/unit/core/configRuleDocuments.test.ts:19-20` — `REQUIRED_ID` / `REQUIRED_FILE`.
   - `src/__tests__/unit/core/ruleDocsChannel.test.ts:24,51` — 픽스처.
   - `src/mcp/tools/openSettings/webServer/__tests__/webServer.test.ts:44` — `selections` 키를
     `{ 'filid_fractal-boundaries': true }` 로.
   - `src/mcp/tools/ruleDocsSync/__tests__/ruleDocsSync.test.ts:20,237` — "filid 는 required 규칙
     하나만 배포한다" 는 주석·전제가 더 이상 참이 아니다. optional 엔트리가 여전히 0개라는 사실은
     유지되므로 주석 문구만 4개 required 로 고친다.

6. `src/__tests__/unit/core/ruleDocsCompatibility.test.ts` 에 **먼저 실패하는** 케이스 2개를 추가한다
   (seiri_test-validity §1 — 고치기 전에 빨간 것을 본다).

   - **케이스 A (orphan 회수)**: `.claude/rules/filid_fca-policy.md` 가 존재하는 프로젝트에서
     `syncRuleDocs` 를 돌리면 결과 `removed` 에 `filid_fca-policy.md` 가 포함되고 파일이 사라진다.
   - **케이스 B (legacy 승계)**: `.claude/rules/fca.md` 만 존재하는 프로젝트에서
     `syncRuleDocs` 를 돌리면 `fca.md` 가 사라지고 `filid_fractal-boundaries.md` 가 현재 템플릿
     내용으로 존재한다.

   두 케이스는 T2 의 manifest 교체 전에는 실패해야 한다 — 실패를 확인한 뒤 진행한다.

**검증**

```bash
cd /Users/Vincent/Workspace/ogham_mk2
yarn filid typecheck
yarn filid vitest run src/__tests__/unit/core src/__tests__/unit/hooks src/hooks/userPromptSubmit src/mcp/tools/ruleDocsSync
grep -rn "FCA_POLICY_RULE_DOC\|filid_fca-policy" plugins/filid/src
```

기대: typecheck 종료 코드 0. 지정 테스트 전부 통과. 마지막 grep 은
`constants/ruleDocs.ts` 의 `LEGACY_RULE_DOCS` 배열과 `ruleDocsCompatibility.test.ts` 의
케이스 A 픽스처에서만 `filid_fca-policy` 가 나와야 하고, `FCA_POLICY_RULE_DOC` 는 0건.

---

### T4 — 빌드 · 재배포 · 참조 문서 갱신 · 전체 검증

**산출물**: 이 저장소 자신의 `.claude/rules/` 가 4개 문서로 갱신되고 `inSync: true`,
루트 `AGENTS.md` 재생성, 전체 테스트 통과.

> canonical 규칙 문서를 고치면 `build:rules` + `rule_docs_sync` 까지가 한 단위다.
> `.metadata/filid/vnext-redesign-plan.md:1999` 가 이 단계를 건너뛰어 세션 내내 stale 규칙을
> 읽은 사고를 기록하고 있다.

**단계**

1. 참조 문서를 고친다.
   - `.metadata/filid/04-USAGE.md:78` — 루트 `AGENTS.md` 의 원본이 단일 파일이라는 문장을
     4개 규칙 문서로 고친다.
   - `.metadata/filid/07-RULES-REFERENCE.md:3` — canonical 규칙 문서 경로.
   - `plugins/filid/templates/rules/README.md` — 예시 manifest 를 4엔트리로, "규칙 추가" 절차의
     `required: false` 문구를 현재 정책(전부 required)에 맞게 고친다.
2. 이관 대상을 옮긴다 (내용 배분 §이관·삭제 표).
3. 전체 빌드.

   ```bash
   cd /Users/Vincent/Workspace/ogham_mk2 && yarn filid build
   ```

   기대: 종료 코드 0. `bridge/` 재생성, `build:compile-plugin` 이 루트 `AGENTS.md` ·
   `.codex-plugin/` 을 4개 문서 기준으로 재생성.
4. 이 저장소에 재배포한다 — `mcp__plugin_filid_tools__rule_docs_sync` 를 호출한다
   (`syncRuleDocs` 는 setup 표면에서만 호출해야 하므로 직접 실행하지 않는다).
5. 배포 결과를 확인한다.

   ```bash
   ls .claude/rules/filid_*.md
   diff -q plugins/filid/templates/rules/filid_fractal-boundaries.md .claude/rules/filid_fractal-boundaries.md
   ```

   기대: 4개 파일만 존재(`filid_fca-policy.md` 없음). diff 무출력.

**검증**

```bash
cd /Users/Vincent/Workspace/ogham_mk2
yarn filid test:run
yarn typecheck
yarn lint
git status --short
```

기대: 테스트·typecheck·lint 전부 종료 코드 0.
`git status` 에 `plugins/filid/templates/rules/` 4 추가 + 1 삭제 + manifest 수정,
`bridge/`·`public/`·`AGENTS.md`·`.codex-plugin/` 재생성물, `.claude/rules/` 갱신이 보여야 한다.

---

## 자기 리뷰

- 요구사항 대응: 4개 분할(T1·T2) · 전부 required(T2 manifest) · seiri 포맷(T1 검증 스크립트가
  B1/B5/B6 를 기계 확인) · 내용은 6분할 체제와 동일(내용 배분 표가 원문 320줄 전체를 배분).
- 이름 일치: `PRIMARY_RULE_DOC` / `LEGACY_RULE_DOCS` 가 T3 §3 에서 정의되고 T3 §4 에서만 소비된다.
  manifest id 4개는 T2 에서 정의되고 T3 §5 의 `selections` 키가 그중 하나를 쓴다.
- 미결 없음: `legacyFilename` 승계 대상(대표 엔트리 1개)과 구 파일 회수 경로(owned orphan 스윕)가
  코드 근거와 함께 확정돼 있다.
- 위험 잔여 1건: 문서 1이 ~110줄로 seiri 최대치(84줄)를 넘는다. 파일 수를 4개로 묶으라는 결정의
  직접 귀결이며 내용 손실보다 낫다고 판단했다. 절 수는 6개로 seiri 상한 안에 있다.

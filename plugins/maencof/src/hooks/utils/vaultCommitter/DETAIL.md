# vaultCommitter — DETAIL

## Requirements

- SessionEnd 또는 UserPromptSubmit 이벤트에서 opt-in 설정 (`.maencof-meta/vault-commit.json::enabled=true`) 이 있을 때만 vault 변경사항을 자동 커밋한다.
- 커밋 범위는 `scope` 필드로 제어한다. 필드 부재 시 기본 scope 는 5-Layer 문서 트리 + `.maencof-meta/` (`DEFAULT_COMMIT_SCOPE`). `.maencof/` 그래프 캐시는 재생성 가능하므로 기본 scope 에 포함하지 않는다.
- 민감 파일 2차 방어: 모든 staging 은 `SENSITIVE_EXCLUDE_PATH_SPECS` (credential/secret/token/apikey 류 `.json`, `.pem`, `.key`, `.env*`) 를 exclude pathspec 으로 동반한다. 1차 방어는 vault 의 `.gitignore`. 지식 문서(`.md`) 는 이름과 무관하게 exclude 대상이 아니다.
- 하루 1커밋 정책: `fold_daily`(기본 true) 가 켜져 있으면 당일의 연속된 자동 커밋을 `git reset --soft` 로 하나로 접은 뒤 재커밋한다 (`helpers/foldDaily`). 수동 커밋은 폴딩 경계로 작동하며 절대 접지 않는다.
- UserPromptSubmit 은 사용자의 프롬프트가 설정된 `skip_patterns` 중 하나와 매칭될 때만 트리거된다. 미설정 시 기본 패턴은 `/clear`.
- 어떠한 경로에서도 세션 종료 / 프롬프트 처리를 블록하지 않는다. 항상 `{ continue: true }` 반환.

## API Contracts

### Config schema (`.maencof-meta/vault-commit.json`)

```jsonc
{
  "enabled": true,
  "scope": ["01_Core/", "02_Derived/", ".maencof-meta/"],
  "fold_daily": true,
  "message_template": "chore(maencof): session wrap [{dirs}] ({date} {time})",
  "skip_patterns": ["^\\s*/clear\\s*$"],
}
```

- `enabled` (필수, boolean): true 가 아니면 훅은 즉시 반환.
- `scope` (선택, string[]): vault 루트 상대 디렉터리/파일 목록 (`/` 구분자, 디렉터리는 trailing slash 권장). **루트 전체 모드 `["."]`** 를 지원한다 — vault 루트 전체가 커밋 대상이 되며, 제외는 전적으로 `.gitignore` 계층(로컬·하위·전역)이 담당한다. vault 고유 자산 디렉터리(dashboard/, web/ 등 이름이 vault 마다 다른 것)까지 설정 갱신 없이 포함하려면 이 모드를 쓴다. 절대 경로·`..`·`:` 포함·`.git` 은 항목 단위로 거부된다. 유효 항목이 하나도 없으면 `DEFAULT_COMMIT_SCOPE` 로 fallback.
- `fold_daily` (선택, boolean, 기본 true): 당일 자동 커밋 폴딩 on/off.
- `message_template` (선택, string): 커밋 메시지 템플릿. placeholder — `{dirs}` (staged top-level 디렉터리 목록), `{count}` (staged 파일 수), `{date}` (YYYY-MM-DD), `{time}` (HH:MM). placeholder 토큰의 정본은 constants 의 `MESSAGE_PLACEHOLDERS`, 치환 로직은 gitUtils 의 `MESSAGE_TEMPLATE_REPLACERS` — 새 placeholder 는 토큰 추가 후 replacer 를 등록해 확장하며(필요 시 `CommitMessageContext` 확장), 둘의 1:1 대응은 `satisfies Record<PlaceholderToken, ...>` 가 컴파일 타임에 강제한다. 미지의 placeholder 는 치환 없이 그대로 남는다. **정적 접두부(첫 `{` 이전 부분, trim 후) 는 6자 이상**이어야 한다 — 접두부가 폴딩의 자동 커밋 식별 마커(startsWith 매칭)로 파생되므로, 짧은 접두부는 수동 커밋 오탐을 낳는다. 규칙 위반 시 필드는 조용히 무시되고 기본 템플릿(`DEFAULT_MESSAGE_TEMPLATE`)을 쓴다. 수동 커밋 subject 를 이 접두부로 시작하게 쓰면 폴딩 대상으로 오인되므로 피할 것.
- `skip_patterns` (선택, string[]): regex source 배열. case-insensitive 매칭. 유효하지 않은 regex 는 silently 무시. 필드 부재/빈 배열 → `DEFAULT_SKIP_PATTERN_SOURCE` (`^\\s*/clear\\s*$`) fallback. 이름은 트리거 semantics 와 다르지만 기존 사용자 config 호환을 위해 유지.
- 위 5개 외 필드는 무시된다 (과거 수기 config 의 잔여 필드 호환).

### Functions

- `readVaultCommitConfig(cwd)` — config 파싱. `enabled` boolean 필수, `scope`/`fold_daily`/`skip_patterns` 는 타입 불일치 시 항목 단위 drop.
- `shouldCommitOnPrompt(prompt, config)` — UserPromptSubmit 게이트.
- `runVaultCommitter(input, event?)` — main handler. 플로우: vault → config → prompt gate → repo → index.lock → 변경 확인 → stage → fold(옵션) → commit.

### Commit behavior

- staging: 존재하는 scope 항목만 모아 단일 `git add -- <scope...> <sensitive excludes...>` 실행.
- staged 파일이 0개면 커밋하지 않는다.
- 커밋 메시지: `message_template` 렌더 결과. 기본 `chore(maencof): session wrap [<top-level dirs>] (<YYYY-MM-DD HH:MM>)`. 디렉터리 목록은 커밋에 실제 포함되는 staged 파일에서 도출 (폴딩 시 접힌 변경 포함).
- `git commit --no-verify` 로 커밋.
- `.git/index.lock` 존재 시 시작 전 skip; 실행 중 lock 충돌 (`index.lock` stderr) 은 `runGit` 이 backoff 재시도.
- 폴딩: HEAD 부터 당일+자동 커밋을 걷어 BASE 를 찾고, `git reset --soft BASE` → re-stage → commit. 자동 커밋 판정은 `AUTO_COMMIT_SUBJECT_MARKERS` includes 매칭(레거시 `*_session_wrap` 및 은퇴한 vault 로컬 스크립트의 subject 포함) + `message_template` 정적 접두부 startsWith 매칭. 재커밋 실패 시 `git reset --soft ORIG_HEAD` 로 복구. root 도달·탐색 상한(`FOLD_SCAN_MAX_COMMITS`) 초과 시 폴딩을 포기하고 일반 커밋한다.

## Policy — `--no-verify` rationale (Y1 Option A, 승인 완료 2026-04-16)

repo 소유자는 2026-04-16 자 Y1 정책 결정에서 **Option A — Keep `--no-verify`**
를 승인했다. 이 결정은 user-level global CLAUDE.md 의 "Never skip hooks"
기본 원칙에 대한 명시적 예외이며, 다음 근거에 기반한다:

1. **재귀 루프 방지.** 사용자의 pre-commit hook 이 vault 파일 자체를 쓰거나
   읽는 경우, vaultCommitter 가 pre-commit 을 실행시키면 그 hook 이 또다시
   vault 를 수정해 무한 루프로 발전할 수 있다. `--no-verify` 는 이 경로의
   재귀를 끊는다.
2. **자동 커밋 의미 유지.** SessionEnd / `/clear` 트리거는 사용자가 손을 대지
   않은 상태에서 발생한다. pre-commit 이 대화형 입력을 요구하면 세션 종료
   자체가 블록될 수 있어 hook-as-background-job 보장이 깨진다.
3. **opt-in 전용.** 기능 자체가 `.maencof-meta/vault-commit.json::enabled=true`
   에 의해서만 활성화되므로, 예외가 사용자 전체 리포지토리로 번지지 않는다.

이 결정을 되돌리려면 (a) vault 파일을 쓰지 않는 pre-commit 환경을 보장하고,
(b) loop-detector (사용자 hook 이 vault 를 수정했는지 detect → 재귀 중단)
를 새로 구현한 뒤 본 훅에서 `--no-verify` 를 제거해야 한다.

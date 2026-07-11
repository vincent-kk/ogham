# Reproduction — 검증 재현 절차

> **상태: 보류 — 개발예정.** 마이그레이션은 착수하지 않으나(2026-07-12 — [migration-playbook-deferred.md](./migration-playbook-deferred.md)), 이 재현 절차는 임시 산출물 기반이라 보류 상태에서도 그대로 유효하다.

> 컴파일러는 **도구 + 스펙만** 커밋한다(변환 테스트·플러그인 추출물 미커밋). 이 문서는 그 검증을 언제든 재현하는 절차다. 2026-07-11 이 절차로 4개 플러그인(복잡도 4계층)을 확인했다.

## 0. 전제

- 실행: `node --import tsx tools/plugin-compiler/src/main.ts <cmd> <pkgDir>` (repo 루트에서).
- CLI: `extract`(현행 산출물 → `definitions/`), `compile`(→ `targets/<host>/`), `verify`(Claude 등가 게이트).
- 재현 산출물(`definitions/`·`targets/`)은 임시 — 확인 후 `rm -rf plugins/<pkg>/{definitions,targets}` 로 정리.

## 1. Claude 무결손 (바이트 등가 게이트)

```bash
cd tools/plugin-compiler
for p in deilen maencof-lens filid maencof; do
  node --import tsx src/main.ts extract ../../plugins/$p     # 현행 → definitions/ (도구명 토큰화)
  node --import tsx src/main.ts verify  ../../plugins/$p     # 기대: "✓ claude equivalence OK"
done
```

- **기대**: 4개 전부 `✓ claude equivalence OK` (빈 diff). JSON 은 의미 동일, 그 외(스킬 라운드트립·agents·bridge)는 바이트 동일.
- deilen 은 손작성 정본이 원본이나, extract 로도 동일 결과. maencof-lens/filid/maencof 는 extract 정본으로 확인.

## 2. 3-호스트 산출물 + L2 구조 (compile 진단)

```bash
node --import tsx src/main.ts compile ../../plugins/filid   # 최대 L2: 19 skills·14 agents·5 hooks
```

기대 진단·산출물:

- Claude `targets/claude/`: `hooks/hooks.json`(5 이벤트)·`agents/*.md`(14)·`.claude-plugin/plugin.json`·`.mcp.json`(server `t`, `${CLAUDE_PLUGIN_ROOT}` args).
- Codex `targets/codex/`: **`hooks/` 없음**(⚠ `hook-loss: all hooks dropped`)·`.codex-agents/*.toml`(14, read-only/workspace-write sandbox 분류)·`.mcp.json`(server=`filid` 오버라이드·`cwd:"."`)·도구명 `mcp__filid.*`.
- agy `targets/agy/`: `hooks.json` named-group — SessionStart/UserPromptSubmit→PreInvocation, PreToolUse(matcher `Read|Write|Edit`→`view_file|write_to_file|replace_file_content`). **SessionEnd·SubagentStart 드롭**(⚠ hook-loss 경고). agent .md 도구그랜트 `mcp_t_*`.

## 3. 도구명 치환 (3-호스트)

```bash
grep -o 'mcp__plugin_filid_t__[a-z_]*' ../../plugins/filid/targets/claude/skills/*/SKILL.md | head   # claude full-form
grep -o 'mcp__filid\.[a-z_]*'          ../../plugins/filid/targets/codex/skills/*/SKILL.md  | head   # codex
grep -o 'mcp_t_[a-z_]*'                ../../plugins/filid/targets/agy/skills/*/SKILL.md    | head   # agy
```

## 4. SessionEnd → MCP-lifecycle 지원 (mcp-lifecycle fallback)

```bash
printf '\nhooks:\n  SessionEnd: mcp-lifecycle\n' >> ../../plugins/filid/definitions/plugin.yaml
node --import tsx src/main.ts compile ../../plugins/filid
node -e "console.log(Object.keys(require('../../plugins/filid/targets/claude/hooks/hooks.json').hooks))"  # SessionEnd 없음
```

- **기대**: Claude hooks.json 에서 **SessionEnd 제거**(나머지 4 이벤트 유지), agy·codex 도 제외, **SessionEnd 손실 경고 없음**(런타임 소유). 오버라이드 제거 후 재컴파일 시 SessionEnd 복귀(바이트 충실).

## 5. Codex 실 스모크 (수동, 선택)

`.metadata/plugin-compiler/case-studies.md` §D.1 절차 — deilen codex 타깃을 codex 마켓플레이스에 로컬 설치 후 `codex exec` 도구 목록에서 `mcp__deilen.*` 4종 노출 확인. (2026-07-11 통과.)

## 6. 정리

```bash
for p in deilen maencof-lens filid maencof; do rm -rf ../../plugins/$p/{definitions,targets}; done
```

## 단위 검증 재도입(선택)

순수 함수(`stableJson`·`jsonEqual`·`diffMaps`·`substituteTokens`·`findUnresolvedTokens`)는 vitest 단위 테스트로 재도입 가능하다. 재도입 시: `tools/plugin-compiler` 에 `vitest` devDep + `vitest.config.ts`(`include: src/**/__tests__/**`) 복원, 루트 `vitest.config.ts` projects 에 `./tools/plugin-compiler` 추가. 등가 게이트는 실 플러그인 정본이 있어야 하므로 마이그레이션([migration-playbook-deferred.md](./migration-playbook-deferred.md)) 이후 CI 로 상설화한다.

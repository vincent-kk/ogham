# intentInjector -- 전달 모델 기반 INTENT.md 주입 + mutation 게이트

## Purpose

Read | Write | Edit 공용 방문 파이프라인. 전달 모델("규칙이 live 컨텍스트에
존재하면 전달된 상태")의 3-상태(미전달/stale/fresh)에 따라 소유 fractal의
`[filid:ctx]`(INTENT 본문 인라인 + chain + detail 힌트)를 주입하고, 미전달
모듈의 mutation은 deny reason에 규칙 본문을 실어 1왕복으로 차단-전달한다
(`[filid:gate]`). `[filid:map]`은 방문 집합이 변한 경우에만 방출.

## Structure

- `intentInjector.ts` — `processVisit(input, spikeMode?)` 단일 진입
- `utils/` organ — ctx/gate/map 블록 빌더와 키·경로 보조 함수

## Conventions

- 상태 판정·기록의 최종 권위는 `commitVisit`(cacheManager) lock 트랜잭션;
  메모리 판정은 advisory 사전 필터. 같은 턴 재방문 디렉토리는 완전 무출력
- fresh(경과 < `injection.ctxTtlTurns`, 기본 5턴) → 무출력; stale → soft ctx
  재전달; 미전달 → Read는 ctx, mutation은 deny(+본문) 후 재시도 통과
- 게이트 면제: INTENT/DETAIL/criteria.md 대상(문서 위생은 validator 전담),
  owner INTENT 부재, spike 모드. INTENT.md 자기-작성은 전달로 마킹
- 전달 단위는 소유 fractal(chain 상향 첫 INTENT.md 보유 dir); 키는 `{boundary}\t{relDir}`;
  서브 스코프 분리는 판별 transcript_path 제공 시 자동 활성 (현행 미제공 → 세션 공유, DETAIL 참조)
- `GUIDE_BLOCK`은 스코프당 1회, 첫 ctx(또는 첫 deny reason)에 선행

## Boundaries

### Always do

- boundary는 즉시 캐시해 chain 재계산 회피; 경로는 POSIX 슬래시로 정규화
- deny reason에는 항상 재시도 안내와 INTENT 본문을 포함 (bare deny 금지)

### Ask first

- `[filid:ctx]`/`[filid:map]`/`[filid:gate]` 포맷 변경 (에이전트가 읽는 계약)
- TTL 기본값(5턴) 변경, 게이트 면제 목록 확장

### Never do

- stale/fresh 상태에서 deny 발화 (deny는 미전달 mutation 전용)
- 프로젝트 파일 write (캐시 파일 외 부수효과 금지)
- 전달 기록을 세션 epoch 간 공유 (compact/clear 리셋 필수)

## Dependencies

- `../../core/infra/cacheManager/` (`commitVisit`, `readFractalMap`, `readDelivered`, `readTurn`), `../../core/tree/boundaryDetector/` (`buildChain`)
- `../shared/`, `../utils/` (`validateCwd`, `readHookConfig`, `visitScope`), `../../constants/agentContext.js`

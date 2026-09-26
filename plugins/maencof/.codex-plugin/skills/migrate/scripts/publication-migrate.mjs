#!/usr/bin/env node
/**
 * @file publication-migrate.mjs
 * @description Publication → 99_Archive + clusterseed migration tool for the
 * /maencof:migrate `publications` option. Zero-dependency (node:fs / node:path /
 * node:util only, Node >= 20). Plans from a series config, executes with a
 * write-ahead log (`.maencof-meta/publication-migration-wal.json`, shaped like
 * the plugin's MigrationWAL), and rolls back byte-identically (content + mode;
 * timestamps excluded). Default mode is a dry-run that never writes.
 *
 * Exit codes: 0 ok · 1 execution failure · 2 config/input/WAL-precondition
 * error · 3 collision (target already exists).
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const WAL_REL = '.maencof-meta/publication-migration-wal.json';
const ANCHOR_PREFIX = '03_External/clusterseeds/';
const LAYER_DIRS = ['01_Core', '02_Derived', '03_External', '04_Action', '05_Context'];

/** vault-relative 경로 정규화 — `./`·중복 슬래시 제거, 선행 `/`·`..` 는 null */
function normalizeRel(p) {
  if (typeof p !== 'string' || p.trim() === '') return null;
  const norm = posix.normalize(p.replaceAll('\\', '/'));
  if (norm.startsWith('/') || norm === '..' || norm.startsWith('../')) return null;
  if (norm === '.' || norm.includes('/../')) return null;
  return norm;
}

/** 파일의 EOL 감지 — 라인 조작 시 보존한다 */
function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function stripQuotes(v) {
  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
  )
    return v.slice(1, -1);
  return v;
}

/**
 * 단일행 `key: value` frontmatter 파서. 그 외 형식(다중행·블록 배열·구획 부재)은
 * null — 호출자가 anomaly 로 격리한다. 값은 원문 문자열 그대로 보존한다.
 */
function parseFrontmatter(text) {
  const eol = detectEol(text);
  const lines = text.split(eol);
  if (lines[0] !== '---') return null;
  const fields = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return { fields, eol };
    const m = /^([A-Za-z_][A-Za-z0-9_-]*): ?(.*)$/.exec(lines[i]);
    if (!m) return null;
    fields.set(m[1], m[2]);
  }
  return null;
}

/**
 * frontmatter 에 `key: value` 라인을 삽입/교체한다. 라인 단위 조작만 수행해
 * 나머지 바이트는 불변이다. 삽입 위치는 layer 라인 뒤, 없으면 닫는 `---` 앞.
 */
function upsertFrontmatterLine(text, key, value) {
  const eol = detectEol(text);
  const lines = text.split(eol);
  if (lines[0] !== '---') return null;
  let close = -1;
  let keyIdx = -1;
  let layerIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      close = i;
      break;
    }
    if (lines[i].startsWith(`${key}:`)) keyIdx = i;
    if (lines[i].startsWith('layer:')) layerIdx = i;
  }
  if (close === -1) return null;
  const newLine = `${key}: ${value}`;
  if (keyIdx !== -1) lines[keyIdx] = newLine;
  else lines.splice(layerIdx !== -1 ? layerIdx + 1 : close, 0, newLine);
  return lines.join(eol);
}

/** 자기가 삽입한 `key: value` 라인 1개를 제거한다 (롤백 전용 — 다른 바이트 불변) */
function removeFrontmatterLine(text, key, value) {
  const eol = detectEol(text);
  const lines = text.split(eol);
  const target = `${key}: ${value}`;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') break;
    if (lines[i] === target) {
      lines.splice(i, 1);
      return lines.join(eol);
    }
  }
  return text;
}

/** 디렉토리 하위 .md 상대경로 수집 — 부재 디렉토리는 빈 목록 */
function walkDir(vaultPath, relDir, recursive) {
  const absDir = join(vaultPath, relDir);
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) return [];
  const out = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(vaultPath, rel), { withFileTypes: true })) {
      const childRel = posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(childRel);
      } else if (entry.name.endsWith('.md')) out.push(childRel);
    }
  };
  walk(relDir);
  return out;
}

/** 1차 분류 — anomaly 사유는 리포트에 그대로 실린다 */
function classifyPass1(vaultPath, relPath) {
  const text = readFileSync(join(vaultPath, relPath), 'utf-8');
  const fm = parseFrontmatter(text);
  if (!fm) return { kind: 'anomaly', reason: 'unparseable-frontmatter' };
  if (fm.fields.get('archived') === 'true') {
    const raw = fm.fields.get('archive_path');
    if (raw === undefined || stripQuotes(raw).trim() === '')
      return { kind: 'anomaly', reason: 'archived-without-archive-path' };
    const ap = normalizeRel(stripQuotes(raw));
    if (!ap) return { kind: 'anomaly', reason: 'invalid-archive-path' };
    if (ap === relPath) return { kind: 'anomaly', reason: 'self-referential-stub' };
    return { kind: 'stub-candidate', archivePath: ap };
  }
  return { kind: 'body' };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 레이어 디렉토리 접두를 뗀 형태 — `04_Action/cve/x.md` → `cve/x.md`. 아니면 null. */
function stripLayerPrefix(rel) {
  const m = rel.match(/^(?:0[1-5]_[A-Za-z]+)\/(.+)$/);
  return m ? m[1] : null;
}

/**
 * 한 파일을 가리키는 링크 타깃 표기 변형 — 확장자 유무 × 레이어 접두 유무.
 * 볼트에는 `[[04_Action/cve/x.md]]`·`[[04_Action/cve/x]]`·`[[cve/x]]` 가 섞여 쓰인다.
 * 긴 것부터 정렬해 정규식 교체에서 더 구체적인 형태가 먼저 매칭되게 한다.
 */
function linkTargetVariants(rel) {
  const bases = new Set([rel.replace(/\.md$/, '')]);
  const stripped = stripLayerPrefix(rel);
  if (stripped) bases.add(stripped.replace(/\.md$/, ''));
  return [...bases].sort((a, b) => b.length - a.length);
}

/**
 * 링크 컨텍스트(`[[`·`](`) 안의 경로만 치환한다. 치환 수 반환.
 * 대소문자는 무시한다 — 같은 파일을 `CVE-`/`cve-` 로 달리 적은 링크가 실재하고,
 * 대소문자만 다른 두 파일은 macOS/Windows 파일시스템에서 공존할 수 없다.
 *
 * rollback 은 의미를 되돌리되 바이트를 되돌리지는 않는다. 확장자 표기는 원문대로
 * 보존되므로 정규 형태(`04_Action/cve/x[.md]`)는 그대로 복원되지만, 비정규 표기
 * (레이어 상대경로·다른 대소문자)는 정규 경로로 수렴한다 — 가리키는 파일은 같다.
 * 바이트 단위 복원이 필요해지면 op 에 원문 매칭 문자열을 실어야 한다.
 */
function replacePathLinks(content, fromRel, toRel) {
  let count = 0;
  const toNoExt = toRel.replace(/\.md$/, '');
  const alternation = linkTargetVariants(fromRel).map(escapeRegex).join('|');
  const out = content
    .replace(
      new RegExp(`(\\[\\[)(?:${alternation})(\\.md)?(?=\\]\\]|\\|)`, 'gi'),
      (_m, p1, ext) => {
        count += 1;
        return `${p1}${ext ? toRel : toNoExt}`;
      },
    )
    .replace(
      new RegExp(`(\\]\\()(?:${alternation})(\\.md)?(?=[)#\\s])`, 'gi'),
      (_m, p1, ext) => {
        count += 1;
        return `${p1}${ext ? toRel : toNoExt}`;
      },
    );
  return { content: out, count };
}

/** 위키링크/마크다운 링크 타깃 추출 — basename 링크 계수용 */
function extractLinkTargets(content) {
  const targets = [];
  for (const m of content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) targets.push(m[1]);
  for (const m of content.matchAll(/\]\(([^)]+)\)/g)) targets.push(m[1]);
  return targets;
}

/** 앵커 문서 렌더링 — 포인터만 담는다(멤버 목록·정확 총수 금지, as-of 날짜 표기) */
function renderAnchor(series, archiveRoot, movedCount, today) {
  const fm = [
    '---',
    `created: ${today}`,
    `updated: ${today}`,
    `tags: [${series.anchor.tags.join(', ')}]`,
    'layer: 3',
    'sub_layer: clusterseed',
    `cluster_key: ${series.key}`,
    `title: ${series.title}`,
  ];
  if (series.anchor.gist) fm.push(`gist: ${series.anchor.gist}`);
  fm.push('---');
  const dir = `${archiveRoot}/${series.archiveDir}/`;
  const body = [
    '',
    series.anchor.description ?? series.title,
    '',
    `- Archive: \`${dir}\` — this series' bodies live outside the knowledge graph — enumerate them via kg_search { cluster: "${series.key}" } (as of ${today}, ${movedCount} items migrated here).`,
    '- Ingestion: new items in this series land directly under the archive directory above — never in layer directories.',
    '- Reading: this anchor is the lexical entry point; open individual items by explicit path (read/update work on archive paths).',
    `- Distilled documents sharing \`cluster_key: ${series.key}\` stay in the graph and collapse behind one representative.`,
    '',
  ];
  return fm.concat(body).join('\n');
}

/** config 검증 — 위반은 문자열 목록으로 반환(비면 유효) */
function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['config is not an object'];
  if (config.version !== 1) errors.push('version must be 1');
  const archiveRoot = normalizeRel(config.archiveRoot ?? '');
  if (!archiveRoot) errors.push('archiveRoot is missing or invalid');
  if (!Array.isArray(config.series) || config.series.length === 0)
    errors.push('series must be a non-empty array');
  for (const s of Array.isArray(config.series) ? config.series : []) {
    const label = s?.key ?? '<missing key>';
    if (typeof s?.key !== 'string' || s.key.trim() === '')
      errors.push(`series ${label}: key is required`);
    if (typeof s?.title !== 'string' || s.title.trim() === '')
      errors.push(`series ${label}: title is required`);
    const anchorPath = normalizeRel(s?.anchor?.path ?? '');
    if (!anchorPath || !anchorPath.startsWith(ANCHOR_PREFIX))
      errors.push(`series ${label}: anchor.path must start with ${ANCHOR_PREFIX}`);
    if (!Array.isArray(s?.anchor?.tags) || s.anchor.tags.length === 0)
      errors.push(`series ${label}: anchor.tags must be non-empty`);
    if (!normalizeRel(s?.archiveDir ?? ''))
      errors.push(`series ${label}: archiveDir is missing or invalid`);
    if (!Array.isArray(s?.moveSources))
      errors.push(`series ${label}: moveSources must be an array`);
    for (const src of [
      ...(Array.isArray(s?.moveSources) ? s.moveSources : []),
      ...(Array.isArray(s?.stampOnly) ? s.stampOnly : []),
    ]) {
      if (!normalizeRel(src?.dir ?? ''))
        errors.push(`series ${label}: source dir is missing or invalid`);
      if (src?.filePattern !== undefined) {
        try {
          new RegExp(src.filePattern);
        } catch {
          errors.push(`series ${label}: invalid filePattern ${src.filePattern}`);
        }
      }
    }
    for (const pat of Array.isArray(s?.excludePatterns) ? s.excludePatterns : []) {
      try {
        new RegExp(pat);
      } catch {
        errors.push(`series ${label}: invalid excludePattern ${pat}`);
      }
    }
  }
  return errors;
}

/** 계획 수립 — 읽기 전용. ops·collisions·anomalies·링크 계수를 산출한다. */
function buildPlan(vaultPath, config) {
  const archiveRoot = normalizeRel(config.archiveRoot);
  const ops = [];
  const anomalies = [];
  const collisions = [];
  // 목표 경로 점유 — casefold 키: 대소문자만 다른 동명 중복(실볼트 실측: cve-/CVE- 혼용)은
  // 대소문자 무시 파일시스템에서 실행 중 충돌하므로 계획 시점에 collision 으로 잡는다
  const claimedTargets = new Set();
  const movedPairs = [];
  // 링크 재작성 op 의 경로 보정용 — 이동 op 가 재작성 op 보다 먼저 실행되므로,
  // 이동 대상 파일의 재작성은 이동 후 경로를 가리켜야 한다. 삭제될 스텁은 제외.
  const bodyMoveMap = new Map();
  const deletedRels = new Set();
  const summary = { series: {}, totalOps: 0 };
  // 볼트 소유 적재 코드의 전환 제안(Phase R)이 소비하는 기계가독 지시 — 시리즈별
  // 새 적재 목적지·앵커·발견된 적재 스크립트 경로
  const redirection = [];
  let basenameLinksSkipped = 0;
  let preexistingTargetSkipped = 0;

  const neededDirs = new Set();
  const ensureDirPlanned = (relDir) => {
    if (!existsSync(join(vaultPath, relDir)) && !neededDirs.has(relDir)) {
      neededDirs.add(relDir);
      ops.push({ type: 'create_dir', path: relDir });
    }
  };

  for (const series of config.series) {
    const excludes = (series.excludePatterns ?? []).map((p) => new RegExp(p));
    const excluded = (name) => excludes.some((re) => re.test(name));
    const targetDir = posix.join(archiveRoot, normalizeRel(series.archiveDir));
    const stat = { move: 0, stubDelete: 0, stamp: 0, linkRewrites: 0 };

    // 이동 후보 수집·분류
    const moveCandidates = [];
    for (const src of series.moveSources ?? []) {
      const relDir = normalizeRel(src.dir);
      const pattern = src.filePattern ? new RegExp(src.filePattern) : null;
      for (const rel of walkDir(vaultPath, relDir, src.recursive === true)) {
        const name = basename(rel);
        if (pattern && !pattern.test(name)) continue;
        if (excluded(name)) continue;
        moveCandidates.push(rel);
      }
    }

    const bodies = [];
    const stubCandidates = [];
    for (const rel of moveCandidates) {
      const c = classifyPass1(vaultPath, rel);
      if (c.kind === 'body') bodies.push(rel);
      else if (c.kind === 'stub-candidate') stubCandidates.push({ rel, archivePath: c.archivePath });
      else anomalies.push({ path: rel, reason: c.reason });
    }

    // 본문 이동 계획 + 충돌 검사 (디스크 존재 ∪ 계획 내 중복)
    const bodyTargets = new Map();
    for (const rel of bodies) {
      const target = posix.join(targetDir, basename(rel));
      if (
        existsSync(join(vaultPath, target)) ||
        claimedTargets.has(target.toLowerCase())
      ) {
        collisions.push({ from: rel, target });
        continue;
      }
      claimedTargets.add(target.toLowerCase());
      bodyTargets.set(rel, target);
    }

    // 2차 스텁 검증 — 본문이 실존·body 분류·(이번에 이동되거나 이미 아카이브 하)일 때만 삭제
    const confirmedStubs = [];
    for (const { rel, archivePath } of stubCandidates) {
      const targetAbs = join(vaultPath, archivePath);
      const bodyOk =
        existsSync(targetAbs) && classifyPass1(vaultPath, archivePath).kind === 'body';
      if (!bodyOk) {
        anomalies.push({ path: rel, reason: 'stub-body-missing-or-not-body' });
        continue;
      }
      const bodyMovedTo = bodyTargets.get(archivePath);
      const bodyAlreadyArchived = archivePath.startsWith(`${archiveRoot}/`);
      if (!bodyMovedTo && !bodyAlreadyArchived) {
        anomalies.push({ path: rel, reason: 'stub-body-not-migrated' });
        continue;
      }
      confirmedStubs.push({ rel, newBodyPath: bodyMovedTo ?? archivePath });
    }

    if (bodyTargets.size > 0) ensureDirPlanned(targetDir);
    for (const [rel, target] of bodyTargets) {
      ops.push({ type: 'move_file', from: rel, to: target });
      ops.push({
        type: 'patch_frontmatter',
        path: target,
        field: 'cluster_key',
        oldValue: null,
        newValue: series.key,
      });
      movedPairs.push({ from: rel, to: target });
      bodyMoveMap.set(rel, target);
      stat.move += 1;
    }
    // 스텁이 가리키던 그래프 경로도 새 아카이브 경로로 링크 재작성 대상
    for (const { rel, newBodyPath } of confirmedStubs)
      movedPairs.push({ from: rel, to: newBodyPath });

    // stampOnly — 원위치 cluster_key 스탬프
    for (const src of series.stampOnly ?? []) {
      const relDir = normalizeRel(src.dir);
      const pattern = src.filePattern ? new RegExp(src.filePattern) : null;
      for (const rel of walkDir(vaultPath, relDir, src.recursive === true)) {
        const name = basename(rel);
        if (pattern && !pattern.test(name)) continue;
        if (excluded(name)) continue;
        const text = readFileSync(join(vaultPath, rel), 'utf-8');
        const fm = parseFrontmatter(text);
        if (!fm) {
          anomalies.push({ path: rel, reason: 'unparseable-frontmatter' });
          continue;
        }
        const existing = fm.fields.get('cluster_key');
        if (existing === series.key) continue;
        ops.push({
          type: 'patch_frontmatter',
          path: rel,
          field: 'cluster_key',
          oldValue: existing ?? null,
          newValue: series.key,
        });
        stat.stamp += 1;
      }
    }

    // 스텁 삭제 (내용+mode 스냅샷은 실행 시 WAL 에 기록)
    if (series.deleteStubs !== false)
      for (const { rel } of confirmedStubs) {
        ops.push({ type: 'delete_file', path: rel });
        deletedRels.add(rel);
        stat.stubDelete += 1;
      }

    // 앵커 생성 — 선존재는 충돌
    const anchorPath = normalizeRel(series.anchor.path);
    if (
      existsSync(join(vaultPath, anchorPath)) ||
      claimedTargets.has(anchorPath.toLowerCase())
    ) {
      collisions.push({ from: '(anchor)', target: anchorPath });
    } else {
      claimedTargets.add(anchorPath.toLowerCase());
      ensureDirPlanned(posix.dirname(anchorPath));
      const today = new Date().toISOString().slice(0, 10);
      ops.push({
        type: 'create_file',
        path: anchorPath,
        content: renderAnchor(series, archiveRoot, stat.move, today),
      });
    }

    summary.series[series.key] = stat;
    redirection.push({
      key: series.key,
      ingestionTarget: `${targetDir}/`,
      anchorPath,
      sourceRefs: Array.isArray(series.sourceRefs) ? series.sourceRefs : [],
    });
  }

  // 링크 재작성 — 레이어 디렉토리 1패스, 파일당 신경로 선존재 시 제외
  if (movedPairs.length > 0) {
    const layerFiles = LAYER_DIRS.flatMap((d) => walkDir(vaultPath, d, true));
    const movedBaseNames = new Set(
      movedPairs.flatMap(({ from }) => [basename(from), basename(from).replace(/\.md$/, '')]),
    );
    const oldPathForms = new Set(
      movedPairs.flatMap(({ from }) => [from, from.replace(/\.md$/, '')]),
    );
    for (const rel of layerFiles) {
      if (deletedRels.has(rel)) continue; // 삭제될 스텁 — 재작성 무의미
      const content = readFileSync(join(vaultPath, rel), 'utf-8');
      // 표기 변형·대소문자를 모두 훑어야 하므로 소문자 사본을 파일당 한 번만 만든다
      const contentLower = content.toLowerCase();
      // 이동 대상 파일의 재작성은 이동 후 경로에 적용된다 (이동 op 가 선행)
      const opPath = bodyMoveMap.get(rel) ?? rel;
      let rewrites = 0;
      for (const { from, to } of movedPairs) {
        if (rel === from) continue;
        // 링크 컨텍스트 안에 표기 변형 중 하나라도 있는지 — 정규식 컴파일 전 값싼 선별.
        // 별칭(`|label`)이 붙은 링크도 통과해야 하므로 닫는 `]]` 를 요구하지 않는다.
        const hasOld = linkTargetVariants(from).some((v) => {
          const probe = v.toLowerCase();
          return (
            contentLower.includes(`[[${probe}`) ||
            contentLower.includes(`](${probe}`)
          );
        });
        if (!hasOld) continue;
        if (content.includes(to)) {
          preexistingTargetSkipped += 1;
          continue;
        }
        const rewriteEnabled = config.series.some(
          (s) => s.rewriteLinks !== false,
        );
        if (!rewriteEnabled) continue;
        const { count } = replacePathLinks(content, from, to);
        if (count > 0)
          ops.push({ type: 'rewrite_link', path: opPath, from, to, count });
        rewrites += count;
      }
      // basename-단독 링크 계수 (경로형이 아닌 타깃만)
      for (const target of extractLinkTargets(content)) {
        const t = target.trim();
        if (oldPathForms.has(t)) continue;
        const base = basename(t);
        if (movedBaseNames.has(base) && !t.includes('/')) basenameLinksSkipped += 1;
      }
      void rewrites;
    }
  }

  summary.totalOps = ops.length;
  return {
    ops,
    summary,
    anomalies,
    collisions,
    redirection,
    basenameLinksSkipped,
    preexistingTargetSkipped,
  };
}

function readWal(vaultPath) {
  const abs = join(vaultPath, WAL_REL);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function writeWal(vaultPath, wal) {
  const abs = join(vaultPath, WAL_REL);
  mkdirSync(join(vaultPath, '.maencof-meta'), { recursive: true });
  writeFileSync(abs, JSON.stringify(wal), 'utf-8');
}

/** op 1건 적용 — 실행 직전 전제조건 재검사. 충돌은 'collision' 을 던진다. */
function applyOp(vaultPath, op) {
  switch (op.type) {
    case 'create_dir':
      mkdirSync(join(vaultPath, op.path), { recursive: true });
      return op;
    case 'move_file': {
      if (existsSync(join(vaultPath, op.to))) throw new Error(`collision: ${op.to}`);
      mkdirSync(join(vaultPath, posix.dirname(op.to)), { recursive: true });
      renameSync(join(vaultPath, op.from), join(vaultPath, op.to));
      return op;
    }
    case 'patch_frontmatter': {
      const abs = join(vaultPath, op.path);
      const next = upsertFrontmatterLine(readFileSync(abs, 'utf-8'), op.field, op.newValue);
      if (next === null) throw new Error(`unpatchable frontmatter: ${op.path}`);
      writeFileSync(abs, next, 'utf-8');
      return op;
    }
    case 'delete_file': {
      const abs = join(vaultPath, op.path);
      const snapshot = {
        ...op,
        content: readFileSync(abs, 'utf-8'),
        mode: statSync(abs).mode & 0o777,
      };
      rmSync(abs);
      return snapshot;
    }
    case 'rewrite_link': {
      const abs = join(vaultPath, op.path);
      const { content } = replacePathLinks(readFileSync(abs, 'utf-8'), op.from, op.to);
      writeFileSync(abs, content, 'utf-8');
      return op;
    }
    case 'create_file': {
      if (existsSync(join(vaultPath, op.path)))
        throw new Error(`collision: ${op.path}`);
      mkdirSync(join(vaultPath, posix.dirname(op.path)), { recursive: true });
      writeFileSync(join(vaultPath, op.path), op.content, 'utf-8');
      return op;
    }
    default:
      throw new Error(`unknown op type: ${op.type}`);
  }
}

/** WAL 선기록 실행 — op 마다 done 갱신·재기록(크래시 재개/롤백 가능) */
function executePlan(vaultPath, plan) {
  const wal = {
    id: `pubmig-${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    operations: plan.ops.map((op) => ({ op, status: 'pending' })),
  };
  writeWal(vaultPath, wal);
  let executed = 0;
  for (const entry of wal.operations) {
    try {
      entry.op = applyOp(vaultPath, entry.op);
      entry.status = 'done';
      entry.executedAt = new Date().toISOString();
      executed += 1;
      writeWal(vaultPath, wal);
    } catch (e) {
      writeWal(vaultPath, wal);
      const collision = String(e?.message ?? '').startsWith('collision:');
      return { wal, executed, failed: 1, collision, error: String(e?.message ?? e) };
    }
  }
  wal.status = 'completed';
  wal.completedAt = new Date().toISOString();
  writeWal(vaultPath, wal);
  return { wal, executed, failed: 0, collision: false };
}

/** done 엔트리 역순 롤백 — 내용+mode 복원, 자기 삽입 라인 제거, 링크 역치환 */
function rollback(vaultPath) {
  const wal = readWal(vaultPath);
  if (!wal) return { error: 'no WAL to roll back' };
  let rolledBack = 0;
  const done = wal.operations.filter((e) => e.status === 'done').reverse();
  for (const entry of done) {
    const op = entry.op;
    switch (op.type) {
      case 'create_dir': {
        // best-effort — 빈 부모 사다리까지 걷어내고, 외부 파일이 생겼으면 멈춘다
        let cur = op.path;
        while (cur && cur !== '.') {
          try {
            rmdirSync(join(vaultPath, cur));
          } catch {
            break;
          }
          cur = posix.dirname(cur);
        }
        break;
      }
      case 'move_file':
        mkdirSync(join(vaultPath, posix.dirname(op.from)), { recursive: true });
        renameSync(join(vaultPath, op.to), join(vaultPath, op.from));
        break;
      case 'patch_frontmatter': {
        const abs = join(vaultPath, op.path);
        const text = readFileSync(abs, 'utf-8');
        const next =
          op.oldValue === null
            ? removeFrontmatterLine(text, op.field, op.newValue)
            : upsertFrontmatterLine(text, op.field, op.oldValue);
        writeFileSync(abs, next, 'utf-8');
        break;
      }
      case 'delete_file': {
        const abs = join(vaultPath, op.path);
        mkdirSync(join(vaultPath, posix.dirname(op.path)), { recursive: true });
        writeFileSync(abs, op.content, 'utf-8');
        if (typeof op.mode === 'number') chmodSync(abs, op.mode);
        break;
      }
      case 'rewrite_link': {
        const abs = join(vaultPath, op.path);
        const { content } = replacePathLinks(readFileSync(abs, 'utf-8'), op.to, op.from);
        writeFileSync(abs, content, 'utf-8');
        break;
      }
      case 'create_file':
        rmSync(join(vaultPath, op.path), { force: true });
        break;
      default:
        break;
    }
    entry.status = 'rolled_back';
    rolledBack += 1;
    writeWal(vaultPath, wal);
  }
  wal.status = 'rolled_back';
  writeWal(vaultPath, wal);
  return { rolledBack };
}

function emit(payload) {
  console.log(JSON.stringify(payload));
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      execute: { type: 'boolean', default: false },
      rollback: { type: 'boolean', default: false },
      report: { type: 'string' },
    },
  });

  const vaultPath = positionals[0];
  if (!vaultPath || !existsSync(vaultPath) || !statSync(vaultPath).isDirectory()) {
    console.error('usage: publication-migrate.mjs <vaultPath> --config <file> [--execute|--rollback] [--report <file>]');
    process.exit(2);
  }

  if (values.rollback) {
    const result = rollback(vaultPath);
    if (result.error) {
      console.error(result.error);
      process.exit(2);
    }
    emit({ mode: 'rollback', rolledBack: result.rolledBack });
    process.exit(0);
  }

  if (!values.config || !existsSync(values.config)) {
    console.error('--config <file> is required (except for --rollback)');
    process.exit(2);
  }
  let config;
  try {
    config = JSON.parse(readFileSync(values.config, 'utf-8'));
  } catch (e) {
    console.error(`config is not valid JSON: ${e}`);
    process.exit(2);
  }
  const configErrors = validateConfig(config);
  if (configErrors.length > 0) {
    for (const err of configErrors) console.error(`config error: ${err}`);
    process.exit(2);
  }

  const plan = buildPlan(vaultPath, config);
  const base = {
    summary: plan.summary,
    anomalies: plan.anomalies,
    collisions: plan.collisions,
    redirection: plan.redirection,
    basenameLinksSkipped: plan.basenameLinksSkipped,
    preexistingTargetSkipped: plan.preexistingTargetSkipped,
  };
  if (values.report)
    writeFileSync(values.report, JSON.stringify({ ...base, ops: plan.ops }, null, 2), 'utf-8');

  if (!values.execute) {
    console.error(
      `[dry-run] ops=${plan.summary.totalOps} anomalies=${plan.anomalies.length} collisions=${plan.collisions.length}`,
    );
    emit({ mode: 'dry-run', ...base });
    process.exit(0);
  }

  const existingWal = readWal(vaultPath);
  if (existingWal) {
    console.error(
      `a previous WAL exists (status: ${existingWal.status}) — roll it back or clear ${WAL_REL} before re-running`,
    );
    process.exit(2);
  }
  if (plan.collisions.length > 0) {
    for (const c of plan.collisions) console.error(`collision: ${c.from} -> ${c.target}`);
    emit({ mode: 'execute', ...base, executed: 0 });
    process.exit(3);
  }

  const result = executePlan(vaultPath, plan);
  emit({ mode: 'execute', ...base, executed: result.executed, walId: result.wal.id });
  if (result.collision) process.exit(3);
  if (result.failed > 0) {
    console.error(`execution failed: ${result.error} — run --rollback`);
    process.exit(1);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

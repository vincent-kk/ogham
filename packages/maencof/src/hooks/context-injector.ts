/**
 * @file context-injector.ts
 * @description UserPromptSubmit hook — Two-path context injection.
 *
 * First prompt: session context (KG summary, directives) + turn context (XML meta-tags)
 * Subsequent prompts: turn context only
 *
 * All injected text MUST be in English.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  isFirstInSession,
  markSessionInjected,
  readTurnContext,
  writePromptContext,
  writeTurnContext,
} from './cache-manager.js';
import { isMaencofVault } from './shared.js';
import {
  buildTurnContext,
  readCompanionIdentity,
  readIndexMetadata,
  readStaleCount,
} from './turn-context-builder.js';

export interface UserPromptSubmitInput {
  session_id?: string;
  cwd?: string;
  prompt?: string;
}

export interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext: string;
  };
}

/**
 * Build one-time session context (verbose, English only).
 * Complements CLAUDE.md static directives — does not replace them.
 */
function buildSessionContext(cwd: string): string {
  const { totalNodes, layerCounts } = readIndexMetadata(cwd);
  const staleCount = readStaleCount(cwd);
  const freshPercent =
    totalNodes > 0
      ? Math.round(((totalNodes - staleCount) / totalNodes) * 100)
      : 100;

  // Top domains from index.json
  const domains = readTopDomains(cwd, 5);
  const domainText =
    domains.length > 0
      ? domains.map((d) => `${d.domain} (${d.count})`).join(', ')
      : 'none detected';

  // L4 Action document count
  const l4Count = layerCounts[4] ?? 0;

  const lines: string[] = [
    '[maencof] Knowledge Graph Summary',
    `- ${totalNodes} nodes across 5 layers`,
    `- Top domains: ${domainText}`,
    `- Active L4 documents: ${l4Count}`,
    `- Index freshness: ${freshPercent}% (${staleCount} stale nodes)`,
    '',
    '[maencof] Session Directives',
    '- Vault tool rules are in CLAUDE.md (written at session start). Follow them strictly.',
    '- Turn-by-turn context is injected as XML meta-tags on every prompt.',
    '- When <kg-core> shows low freshness (<90%), proactively run kg_build.',
    '- When <kg-stale-advisory> is present, run kg_build IMMEDIATELY before other vault operations.',
    '- When <pinned> contains nodes, prioritize those in context assembly via kg_context.',
    '- kg_context now returns content snippets from top results. Use it as the primary content retrieval tool for multi-document queries.',
  ];

  // Companion identity — origin_story and greeting (session-once)
  const identity = readCompanionIdentity(cwd);
  if (identity) {
    lines.push('');
    lines.push('[maencof] Companion Identity');
    if (identity.origin_story) {
      // First sentence up to 120 chars
      const firstSentence = identity.origin_story.split(/\.\s/)[0] ?? '';
      const origin =
        firstSentence.length > 120
          ? firstSentence.slice(0, 120)
          : firstSentence;
      lines.push(`- Origin: ${origin}`);
    }
    if (identity.greeting) {
      lines.push(`- Greeting: ${identity.greeting}`);
    }
  }

  return lines.join('\n');
}

interface DomainCount {
  domain: string;
  count: number;
}

/**
 * Read top N domains from index.json node tags/domain fields.
 */
function readTopDomains(cwd: string, limit: number): DomainCount[] {
  const indexPath = join(cwd, '.maencof', 'index.json');
  try {
    if (!existsSync(indexPath)) return [];
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as { nodes?: unknown };

    let nodes: Array<{ domain?: string }> = [];
    if (Array.isArray(parsed.nodes)) {
      nodes = parsed.nodes as Array<{ domain?: string }>;
    } else if (parsed.nodes && typeof parsed.nodes === 'object') {
      nodes = Object.values(parsed.nodes) as Array<{ domain?: string }>;
    }

    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (typeof node.domain === 'string' && node.domain) {
        counts.set(node.domain, (counts.get(node.domain) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  } catch {
    return [];
  }
}

/**
 * UserPromptSubmit hook handler.
 * Two-path injection: session context (first prompt) + turn context (every prompt).
 * Never blocks user prompts (always continue: true).
 */
export function injectContext(input: UserPromptSubmitInput): HookOutput {
  const cwd = input.cwd ?? process.cwd();
  const sessionId = input.session_id ?? '';

  // Gate: skip if not a maencof vault
  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  // TURN CONTEXT (every prompt)
  let turnContext = readTurnContext(cwd);
  if (!turnContext) {
    // First time or cache cleared — build and persist
    turnContext = buildTurnContext(cwd);
    writeTurnContext(cwd, turnContext);
  }

  // SESSION CONTEXT (first prompt only)
  const isFirst = isFirstInSession(sessionId, cwd);
  let sessionContext = '';
  if (isFirst) {
    sessionContext = buildSessionContext(cwd);
    writePromptContext(cwd, sessionContext, sessionId);
    markSessionInjected(sessionId, cwd);
  }

  // Combine: session context (if first) + turn context (always)
  const parts: string[] = [];
  if (sessionContext) parts.push(sessionContext);
  parts.push(turnContext);
  const additionalContext = parts.join('\n\n');

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };
}

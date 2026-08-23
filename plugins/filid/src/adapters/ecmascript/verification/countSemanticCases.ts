import type { VerificationCaseCount } from '../../../types/adapters.js';
import {
  type LexicalToken,
  scanLexicalTokens,
} from '../structure/scanLexicalTokens.js';

interface StaticRows {
  exact: boolean;
  count: number;
  nextIndex: number;
}

const CASE_APIS = new Set(['it', 'specify', 'test']);
const SUITE_APIS = new Set(['describe', 'suite']);

class SemanticCaseCounter {
  readonly tokens: LexicalToken[];
  readonly reasons = new Set<string>();
  knownCount = 0;

  constructor(readonly source: string) {
    this.tokens = scanLexicalTokens(source);
  }

  count(): VerificationCaseCount {
    this.detectAliases();
    this.scanRange(0, this.tokens.length, 1);
    const certainty =
      this.reasons.size > 0 ? ('indeterminate' as const) : ('exact' as const);
    return {
      certainty,
      exactCount: certainty === 'exact' ? this.knownCount : undefined,
      knownLowerBound: this.knownCount,
      reasons: [...this.reasons],
    };
  }

  private scanRange(start: number, end: number, multiplier: number): void {
    for (let index = start; index < end; index += 1) {
      const token = this.tokens[index];
      if (token.kind !== 'identifier' || this.tokens[index - 1]?.value === '.')
        continue;

      if (SUITE_APIS.has(token.value)) {
        const rows = this.parseEach(index);
        if (!rows) continue;
        const body = this.findCallbackBody(rows.nextIndex, end);
        if (!body) {
          this.reasons.add(
            `parameterized suite at offset ${token.start} has an unsupported callback shape`,
          );
          continue;
        }
        if (!rows.exact)
          this.reasons.add(
            `parameterized suite at offset ${token.start} uses a dynamic table`,
          );
        this.scanRange(
          body.start,
          body.end,
          rows.exact ? multiplier * rows.count : 0,
        );
        index = body.closeIndex;
        continue;
      }

      if (!CASE_APIS.has(token.value)) continue;
      if (this.tokens[index - 1]?.value === '=') {
        this.reasons.add(
          `case API at offset ${token.start} is assigned through an alias`,
        );
        continue;
      }

      const rows = this.parseEach(index);
      if (rows) {
        if (rows.exact) this.knownCount += multiplier * rows.count;
        else
          this.reasons.add(
            `parameterized case at offset ${token.start} uses a dynamic table`,
          );
        index = Math.max(index, rows.nextIndex - 1);
        continue;
      }

      if (this.hasInvocation(index)) this.knownCount += multiplier;
    }
  }

  private parseEach(baseIndex: number): StaticRows | null {
    let cursor = baseIndex + 1;
    while (
      this.tokens[cursor]?.value === '.' &&
      this.tokens[cursor + 1]?.kind === 'identifier'
    ) {
      const member = this.tokens[cursor + 1].value;
      cursor += 2;
      if (member !== 'each') continue;

      // `it.each<T>([…])` puts a type argument list between `each` and the
      // call; it carries no rows, and reading it as the table loses the count.
      if (this.tokens[cursor]?.value === '<') {
        const typeClose = this.findMatching(cursor, '<', '>');
        if (typeClose < 0)
          return { exact: false, count: 0, nextIndex: cursor + 1 };
        cursor = typeClose + 1;
      }

      const tableStart = this.tokens[cursor];
      if (!tableStart) return { exact: false, count: 0, nextIndex: cursor };
      if (tableStart.value === '(') {
        const close = this.findMatching(cursor, '(', ')');
        if (close < 0) return { exact: false, count: 0, nextIndex: cursor + 1 };
        const parsed = this.parseStaticRows(cursor + 1);
        return { ...parsed, nextIndex: close + 1 };
      }
      const parsed = this.parseStaticRows(cursor);
      return { ...parsed, nextIndex: cursor + 1 };
    }
    return null;
  }

  private parseStaticRows(start: number): Omit<StaticRows, 'nextIndex'> {
    const token = this.tokens[start];
    if (!token) return { exact: false, count: 0 };

    if (token.value === '[') {
      const close = this.findMatching(start, '[', ']');
      if (close < 0) return { exact: false, count: 0 };
      const raw = this.source.slice(token.start, this.tokens[close].end);
      if (raw.includes('...')) return { exact: false, count: 0 };

      let count = 0;
      let segmentHasContent = false;
      for (let index = start + 1; index < close; index += 1) {
        const current = this.tokens[index];
        const topLevelComma =
          current.value === ',' &&
          current.bracketDepth === token.bracketDepth + 1 &&
          current.parenDepth === token.parenDepth &&
          current.braceDepth === token.braceDepth;
        if (topLevelComma) {
          if (segmentHasContent) count += 1;
          segmentHasContent = false;
        } else segmentHasContent = true;
      }
      if (segmentHasContent) count += 1;
      return { exact: true, count };
    }

    if (
      (token.kind === 'string' || token.kind === 'template') &&
      this.source[token.start] === '`'
    ) {
      if (token.kind === 'template') return { exact: false, count: 0 };
      const lines = token.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return { exact: true, count: Math.max(0, lines.length - 1) };
    }

    return { exact: false, count: 0 };
  }

  private hasInvocation(baseIndex: number): boolean {
    let cursor = baseIndex + 1;
    while (
      this.tokens[cursor]?.value === '.' &&
      this.tokens[cursor + 1]?.kind === 'identifier'
    )
      cursor += 2;
    return this.tokens[cursor]?.value === '(';
  }

  private findCallbackBody(
    invocationStart: number,
    rangeEnd: number,
  ): { start: number; end: number; closeIndex: number } | null {
    if (this.tokens[invocationStart]?.value !== '(') return null;
    const invocationEnd = this.findMatching(invocationStart, '(', ')');
    if (invocationEnd < 0 || invocationEnd > rangeEnd) return null;

    let anchor = -1;
    for (let index = invocationStart + 1; index < invocationEnd; index += 1)
      if (
        this.tokens[index].value === '=>' ||
        this.tokens[index].value === 'function'
      ) {
        anchor = index;
        break;
      }
    if (anchor < 0) return null;

    const open = this.tokens.findIndex(
      (token, index) =>
        index > anchor && index < invocationEnd && token.value === '{',
    );
    if (open < 0) return null;
    const close = this.findMatching(open, '{', '}');
    if (close < 0 || close > invocationEnd) return null;
    return { start: open + 1, end: close, closeIndex: close };
  }

  private findMatching(
    openIndex: number,
    openValue: string,
    closeValue: string,
  ): number {
    let depth = 0;
    for (let index = openIndex; index < this.tokens.length; index += 1) {
      const value = this.tokens[index].value;
      if (value === openValue) depth += 1;
      else if (value === closeValue) {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  }

  private detectAliases(): void {
    const declarations = new Set(['const', 'let', 'var']);
    for (let index = 0; index < this.tokens.length - 3; index += 1) {
      if (
        !declarations.has(this.tokens[index].value) ||
        this.tokens[index + 1].kind !== 'identifier' ||
        this.tokens[index + 2].value !== '=' ||
        !CASE_APIS.has(this.tokens[index + 3].value)
      )
        continue;
      const alias = this.tokens[index + 1].value;
      const isCalled = this.tokens.some(
        (token, candidate) =>
          candidate > index + 3 &&
          token.kind === 'identifier' &&
          token.value === alias &&
          this.tokens[candidate + 1]?.value === '(',
      );
      if (isCalled)
        this.reasons.add(`case API alias "${alias}" has an unknown expansion`);
    }
  }
}

export function countSemanticCases(source: string): VerificationCaseCount {
  return new SemanticCaseCounter(source).count();
}

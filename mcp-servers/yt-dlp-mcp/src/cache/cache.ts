interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Minimal LRU + TTL cache backed by Map insertion order (ARCHITECTURE §9).
 * `now` is injectable for deterministic tests.
 */
export class TtlLruCache<V> {
  private readonly store: Map<string, Entry<V>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(maxSize: number, ttlMs: number, now: () => number = Date.now) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.now = now;
    this.store = new Map<string, Entry<V>>();
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    return entry !== undefined && entry.expiresAt > this.now();
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

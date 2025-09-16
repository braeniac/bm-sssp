// src/sssp/bmssp/psqueue.ts
//
// Partial-sorting queue used by BM-SSSP.
// Operations:
//   - insert({ key, val })               : amortized small cost
//   - batchPrepend(L)                    : prepend a list known to be strictly smaller than current items
//   - pull() -> { S, bound }             : remove up to M smallest *pairs* and return
//                                          unique keys S (keeping the best val per key) and a separating bound
//
// Design notes:
// - We maintain a small list of "blocks" (arrays) of {key,val} pairs.
// - Blocks are roughly ordered by their upper-bound values (via where we insert/split).
// - On pull(), we collect up to M pairs from the front, then dedupe by smallest val per key.
// - The returned "bound" is the TRUE minimum val among all remaining pairs (or B if empty).
// - We allow duplicate keys across blocks; pull() keeps the best (smallest val) one.
// - size_ tracks number of stored *pairs*, not unique keys.
//
// Correctness considerations for BM-SSSP glue:
// - Getting the true min bound is important; if the bound is too large, some items never get pulled.
// - batchPrepend(L) assumes every val in L is < any current queue val. If a caller violates this,
//   we defensively route those items to normal insert() so behavior stays correct (just a tad slower).

export type Key = number;

type Pair = { key: Key; val: number };

export class PSQueue {
  private M: number;         // max pairs to remove per pull()
  private B: number;         // bound returned if queue is empty
  private blocks: Pair[][] = [];
  private size_: number = 0;

  constructor(M: number, B: number) {
    this.M = Math.max(1, M);
    this.B = B;
  }

  get size(): number { return this.size_; }
  isEmpty(): boolean { return this.size_ === 0; }

  /** Insert a single pair. Duplicates allowed; worse duplicates are ignored on pull(). */
  insert(p: Pair): void {
    // Find a block whose current (approx) upper bound can accommodate p.
    // Linear scan is fine; blocks remain small under our parameter choices.
    let i = 0;
    for (; i < this.blocks.length; i++) {
      const blk = this.blocks[i];
      const last = blk.length ? blk[blk.length - 1] : undefined;
      if (!last || p.val <= last.val) break;
    }
    if (i === this.blocks.length) this.blocks.push([]);
    const blk = this.blocks[i];
    blk.push(p);
    this.size_++;

    // If a block grows too large, split it to keep ops cheap.
    if (blk.length > this.M) {
      blk.sort((a, b) => a.val - b.val);
      const mid = Math.ceil(blk.length / 2);
      const left = blk.slice(0, mid);
      const right = blk.slice(mid);
      this.blocks.splice(i, 1, left, right);
    }
  }

  /**
   * Prepend a list L that (by contract) has values strictly smaller than any current queue val.
   * We still defensively check and route any non-small elements through normal insert().
   */
  batchPrepend(L: Pair[]): void {
    if (!L.length) return;

    const curMin = this.peekGlobalMin(); // Infinity if empty
    const smaller: Pair[] = [];
    // Split L into "definitely smaller" and "not smaller" (defensive)
    for (const p of L) {
      if (p.val < curMin) smaller.push(p);
      else this.insert(p);
    }
    if (!smaller.length) return;

    // To keep blocks tidy, chunk and sort before unshifting.
    const chunkSize = Math.max(1, Math.floor(this.M / 2));
    for (let i = 0; i < smaller.length; i += chunkSize) {
      const chunk = smaller.slice(i, i + chunkSize);
      chunk.sort((a, b) => a.val - b.val);
      this.blocks.unshift(chunk);
      this.size_ += chunk.length;
    }
  }

  /**
   * Pull up to M pairs with the smallest values.
   * Returns:
   *  - S: unique keys among the pulled pairs (keeping the smallest val per key)
   *  - bound: the TRUE minimum value remaining in the queue (or B if empty)
   */
  pull(): { S: Key[]; bound: number } {
    if (this.isEmpty()) return { S: [], bound: this.B };

    // Collect pairs from the front blocks until we reach M (or run out).
    const acc: Pair[] = [];
    while (this.blocks.length && acc.length < this.M) {
      const front = this.blocks[0];
      while (front.length && acc.length < this.M) {
        acc.push(front.shift()!);
      }
      if (front.length === 0) this.blocks.shift();
    }

    // Deduplicate by smallest val per key.
    const best = new Map<Key, number>();
    for (const p of acc) {
      const prev = best.get(p.key);
      if (prev === undefined || p.val < prev) best.set(p.key, p.val);
    }

    // Compute the true global min among the remaining pairs (not just a peek).
    const bound = this.computeTrueMinOrB();

    // Maintain pair count (we removed acc.length pairs).
    this.size_ -= acc.length;

    return { S: Array.from(best.keys()), bound };
  }

  // --- helpers ---

  /** Return Infinity if empty; otherwise the smallest value among all remaining pairs. */
  private peekGlobalMin(): number {
    if (this.isEmpty()) return Infinity;
    let minVal = Infinity;
    for (const blk of this.blocks) {
      for (const p of blk) {
        if (p.val < minVal) minVal = p.val;
      }
    }
    return minVal;
  }

  /** Compute true min remaining or return B if empty. */
  private computeTrueMinOrB(): number {
    if (this.isEmpty()) return this.B;
    const m = this.peekGlobalMin();
    return Number.isFinite(m) ? m : this.B;
  }
}

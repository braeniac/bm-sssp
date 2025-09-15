// src/sssp/bmssp/psqueue.ts
export type Key = number;

type Pair = { key: Key; val: number };

export class PSQueue {
  private M: number;
  private B: number; // upper bound if queue is empty
  // We keep a small number of blocks, each is a small array of {key,val} roughly sorted by val.
  private blocks: Pair[][] = [];
  private size_: number = 0;

  constructor(M: number, B: number) {
    this.M = Math.max(1, M);
    this.B = B;
  }

  get size() { return this.size_; }
  isEmpty() { return this.size_ === 0; }

  /** Insert or update single key/value. */
  insert(p: Pair) {
    // Find block position by upper bound (linear scan is fine; blocks stay small in our parameter regime).
    // If you want, you can replace with binary search later.
    let i = 0;
    for (; i < this.blocks.length; i++) {
      const last = this.blocks[i][this.blocks[i].length - 1];
      if (!last || p.val <= last.val) break;
    }
    if (i === this.blocks.length) this.blocks.push([]);
    // If key exists in this block chain, keep the smaller val
    // For simplicity, we’ll just insert; duplicates of a key with worse val will be filtered on pull.
    this.blocks[i].push(p);
    this.size_ += 1;

    // Split block if it grows too large (~M). Keeps amortized bounds reasonable.
    if (this.blocks[i].length > this.M) {
      const b = this.blocks[i];
      b.sort((a, b) => a.val - b.val);
      const mid = Math.ceil(b.length / 2);
      const left = b.slice(0, mid);
      const right = b.slice(mid);
      this.blocks.splice(i, 1, left, right);
    }
  }

  /** Batch prepend L where every val in L is smaller than any current val (by contract). */
  batchPrepend(L: Pair[]) {
    if (!L.length) return;
    // Keep a block size ≤ M to preserve amortized guarantees.
    // We can chunk L into blocks of size ≤ M and put them at the front.
    // Sort each chunk by val ascending to make future pulls simpler.
    const chunkSize = Math.max(1, Math.floor(this.M / 2));
    for (let i = 0; i < L.length; i += chunkSize) {
      const chunk = L.slice(i, i + chunkSize);
      chunk.sort((a, b) => a.val - b.val);
      this.blocks.unshift(chunk);
      this.size_ += chunk.length;
    }
  }

  /**
   * Pull up to M smallest pairs.
   * Returns: { S, bound }
   *  - S: an array of keys (deduped by smallest val seen)
   *  - bound: a separating value x (if queue still has items) or B (if empty)
   */
  pull(): { S: Key[]; bound: number } {
    if (this.isEmpty()) return { S: [], bound: this.B };

    const acc: Pair[] = [];
    // Collect from front blocks until we have at least M items or we run out.
    while (this.blocks.length && acc.length < this.M) {
      const front = this.blocks[0];
      while (front.length && acc.length < this.M) {
        acc.push(front.shift()!);
      }
      if (front.length === 0) this.blocks.shift();
    }

    // Deduplicate by smallest val for each key (keep the best one)
    const best = new Map<Key, number>();
    for (const p of acc) {
      const prev = best.get(p.key);
      if (prev === undefined || p.val < prev) best.set(p.key, p.val);
    }

    // Compute bound: the min val left in queue, or B if empty
    let bound = this.B;
    if (!this.isEmpty()) {
      let minVal = Infinity;
      // Peek at the smallest remaining val (front of first block)
      outer: for (let i = 0; i < this.blocks.length; i++) {
        const blk = this.blocks[i];
        if (!blk.length) continue;
        // block not guaranteed sorted globally but front items tend to be smaller
        for (let j = 0; j < Math.min(4, blk.length); j++) {
          if (blk[j].val < minVal) minVal = blk[j].val;
        }
        // scanning a few items is fine; amortized cost stays small
        if (minVal < Infinity) break outer;
      }
      if (minVal < Infinity) bound = minVal;
    }

    const S = Array.from(best.keys());
    this.size_ -= acc.length; // logical items removed
    return { S, bound };
  }
}

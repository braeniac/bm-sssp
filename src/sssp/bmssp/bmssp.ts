// src/sssp/bmssp/bmssp.ts
//
// BM-SSSP driver + recursion, wired to the primitives:
//   - baseCase (mini-Dijkstra bounded by B)
//   - findPivots (k rounds of bounded relax → W, P)
//   - PSQueue (partial-sorting queue: Insert / BatchPrepend / Pull)
//
// Key design choices that make this robust on small graphs too:
//   1) We process the PSQueue **until empty** (no early cap), so we never strand work.
//   2) If findPivots returns an empty pivot set P, we **fallback to S** (ensures progress).
//   3) We use a practical floor **k ≥ 2** in the public driver (bmSssp) for tiny graphs.
//   4) At the end of a level, we run a **bounded multi-source Dijkstra** from `extraW`
//      (the nodes in W whose dist < B). A single pass of “relax from extraW” is not
//      enough for deep successor chains; this multi-source bounded Dijkstra fully
//      propagates improvements within the level’s bound before returning.
//   5) In loop classification, we always use the **local** B′ from the recursive call
//      when deciding whether an updated neighbor goes into [B′, Bi) (batchPrepend) or
//      [Bi, B) (insert). Using a stale/global B′ misclassifies edges and can stall.
//
// Pre-reqs/assumptions from the paper:
// - Graph is directed, non-negative edge weights.
// - dist[] is global state threaded through recursion.
// - ≤ comparisons (not strictly <) are allowed in relax checks (paper’s reuse).

import { GSRGraph, SSSPOptions, SSSPResult } from "../../core/types.js";
import { baseCase } from "./baseCase.js";
import { findPivots } from "./findPivots.js";
import { PSQueue } from "./psqueue.js";

/**
 * Public entry: BM-SSSP solver.
 *  - Picks parameters as in the paper (up to small constants) with a practical k-floor for small n.
 *  - Initializes global dist/pred and invokes the top-level recursion: BMSSP(L, ∞, {s}).
 */
export function bmSssp(g: GSRGraph, opts: SSSPOptions): SSSPResult {
  const n = g.n;
  const src = opts.source;
  if (src < 0 || src >= n) throw new Error("source out of range");

  // Paper-inspired parameterization:
  //   k ≈ log^(1/3) n,  t ≈ log^(2/3) n,  L ≈ ceil( log n / t )
  // We enforce k ≥ 2 on small graphs to avoid starvation in base cases.
  const ln = Math.max(1, Math.log(Math.max(2, n)));
  const k = Math.max(2, Math.floor(Math.cbrt(ln)));                 // ≥ 2 for tiny n
  const t = Math.max(1, Math.floor(Math.cbrt(ln * ln)));            // ≈ log^(2/3) n
  const L = Math.max(1, Math.ceil(ln / Math.max(1, t)));            // recursion depth

  const dist = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const pred = opts.returnPredecessors ? new Int32Array(n).fill(-1) : undefined;
  dist[src] = 0;

  // Top-level call: B = ∞, S = { src }
  BMSSP_level(g, L, Number.POSITIVE_INFINITY, [src], k, t, dist, pred);

  const out: SSSPResult = { dist };
  if (pred) out.pred = pred;
  return out;
}

/**
 * Recursive BMSSP(l, B, S):
 *
 * If l == 0:
 *   - Run baseCase(B, {x}) from a chosen x∈S (we pick min-dist in S if |S|>1)
 *   - Return (B′, U) from baseCase
 *
 * Else:
 *   1) {W, P} = FindPivots(B, S, k)
 *      - If P is empty (can happen in small graphs), set P = S to ensure seeding.
 *   2) Initialize PSQueue Q with capacity M that loosely grows with level.
 *      Insert all pivots with their current distances.
 *   3) While Q is not empty:
 *        Pull(Si, Bi) from Q
 *        Recurse: (B′i, Ui) = BMSSP(l-1, Bi, Si)
 *        For each u in Ui, relax u→v:
 *          - If nd ∈ [Bi, B),     Q.insert(v, nd)
 *          - If nd ∈ [B′i, Bi),   buffer into K for batchPrepend
 *        BatchPrepend K; also return any x∈Si whose dx fell into [B′i, Bi)
 *   4) After queue empties (success), set B′ = B.
 *      Complete nodes in W with d < B′ (call this set extraW), and
 *      **run a bounded multi-source Dijkstra from extraW (nd < B)** to fully propagate
 *      improvements before returning up one level.
 */
function BMSSP_level(
  g: GSRGraph,
  l: number,
  B: number,
  S: number[],
  k: number,
  t: number,
  dist: Float64Array,
  pred?: Int32Array
): { Bprime: number; U: number[] } {
  // Base case: bounded mini-Dijkstra
  if (l <= 0) {
    // If S has multiple vertices, choose the one with smallest current dist.
    let x = S[0];
    if (S.length > 1) {
      let best = dist[x], bestx = x;
      for (const s of S) if (dist[s] < best) { best = dist[s]; bestx = s; }
      x = bestx;
    }
    return baseCase(g, x, B, k, dist, pred);
  }

  // 1) Find pivots. If none, seed with S to ensure progress.
  const { W, P: P0 } = findPivots(g, B, S, k, dist);
  const P = P0.length ? P0 : [...S];

  // 2) Partial-sorting queue. We use a soft exponential-ish capacity with level (not critical).
  const M = Math.max(4, Math.floor(Math.pow(2, (l - 1) * Math.max(1, t / 4))));
  const Q = new PSQueue(M, B);

  // Seed Q with pivots
  for (const x of P) Q.insert({ key: x, val: dist[x] });

  // Accumulate all Ui from subproblems (useful for debugging/metrics; not required for correctness)
  let Uall: number[] = [];

  // 3) Process the queue **until empty** (correctness-first)
  while (!Q.isEmpty()) {
    // Pull up to M smallest keys with a separating bound Bi
    const { S: Si, bound: Bi } = Q.pull();
    if (!Si.length) break;

    // Recurse to level l-1 with upper bound Bi
    const { Bprime: Bpi, U: Ui } = BMSSP_level(g, l - 1, Bi, Si, k, t, dist, pred);
    Uall = Uall.concat(Ui);

    // Classify relaxations from Ui using *local* Bpi and Bi
    const K: { key: number; val: number }[] = [];

    for (const u of Ui) {
      const du = dist[u];
      if (!Number.isFinite(du)) continue;
      const Lk = g.rowPtr[u], Rk = g.rowPtr[u + 1];
      for (let kk2 = Lk; kk2 < Rk; kk2++) {
        const v = g.cols[kk2];
        const nd = du + g.weights[kk2];

        // Allow ≤ for reuse; tighten on strict improvement
        if (nd <= dist[v]) {
          if (nd < dist[v]) {
            dist[v] = nd;
            if (pred) pred[v] = u;
          }
          if (nd >= Bi && nd < B) {
            // Goes into the current level’s active band
            Q.insert({ key: v, val: nd });
          } else if (nd >= Bpi && nd < Bi) {
            // Too small for current band; prepend for earlier processing
            K.push({ key: v, val: nd });
          }
        }
      }
    }

    // Put the [B′i, Bi) updates at the front
    if (K.length) Q.batchPrepend(K);

    // Also return any x∈Si whose current dx fell into [B′i, Bi)
    const back: { key: number; val: number }[] = [];
    for (const x of Si) {
      const dx = dist[x];
      if (dx >= Bpi && dx < Bi) back.push({ key: x, val: dx });
    }
    if (back.length) Q.batchPrepend(back);
  }

  // If we exit the loop, the queue is empty → success for this level.
  const Bprime_out = B;

  // Collect nodes in W that are strictly completed under B′
  const extraW: number[] = [];
  for (const x of W) if (dist[x] < Bprime_out) extraW.push(x);

  // ---- Critical finishing step: bounded multi-source Dijkstra from extraW (nd < B) ----
  // Rationale: some vertices in W can become < B only via the W-path (not via a pulled Ui).
  // A single pass of "relax from extraW" is not enough for deep chains; the bounded Dijkstra
  // fully propagates those improvements before returning up the recursion.
  if (extraW.length) {
    type Item = { v: number; d: number };
    const heap: Item[] = [];

    const push = (it: Item) => { heap.push(it); up(heap.length - 1); };
    const up = (i: number) => {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].d <= heap[i].d) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = (): Item | undefined => {
      if (heap.length === 0) return;
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) { heap[0] = last; down(0); }
      return top;
    };
    const down = (i: number) => {
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        if (l < heap.length && heap[l].d < heap[m].d) m = l;
        if (r < heap.length && heap[r].d < heap[m].d) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    };

    // Seed all extraW nodes as sources with their finalized distances
    for (const u of extraW) push({ v: u, d: dist[u] });

    // Standard Dijkstra loop, but bounded: only traverse edges with nd < B
    while (heap.length) {
      const it = pop()!;
      const u = it.v;
      if (it.d !== dist[u]) continue; // stale entry

      const Lk = g.rowPtr[u], Rk = g.rowPtr[u + 1];
      for (let kk2 = Lk; kk2 < Rk; kk2++) {
        const v = g.cols[kk2];
        const nd = dist[u] + g.weights[kk2];
        if (!(nd < B)) continue;      // respect level bound

        if (nd < dist[v]) {
          dist[v] = nd;
          if (pred) pred[v] = u;
          push({ v, d: nd });
        }
      }
    }
  }
  // ----------------------------------------------------------------------------

  // U is everything we explicitly completed from subproblems plus extraW at this level.
  const U = Uall.concat(extraW);
  return { Bprime: Bprime_out, U };
}

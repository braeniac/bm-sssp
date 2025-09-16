// src/sssp/bmssp/bmssp.ts
import { GSRGraph, SSSPOptions, SSSPResult } from "../../core/types.js";
import { baseCase } from "./baseCase.js";
import { findPivots } from "./findPivots.js";
import { PSQueue } from "./psqueue.js";

/**
 * Top-level BM-SSSP driver.
 * Picks k = floor(log^(1/3) n), t = floor(log^(2/3) n), depth L = ceil(log n / t), then runs BMSSP(L, ∞, {s}).
 */
export function bmSssp(g: GSRGraph, opts: SSSPOptions): SSSPResult {
  const n = g.n;
  const src = opts.source;
  if (src < 0 || src >= n) throw new Error("source out of range");
  
  // Parameters as in the paper
  const ln = Math.max(1, Math.log(Math.max(2, n)));
  const k = Math.max(2, Math.floor(Math.cbrt(ln)));                 // ≈ log^(1/3) n
  const t = Math.max(1, Math.floor(Math.cbrt(ln * ln)));            // ≈ log^(2/3) n
  const L = Math.max(1, Math.ceil(ln / Math.max(1, t)));            // levels

  const dist = new Float64Array(n).fill(Infinity);
  const pred = opts.returnPredecessors ? new Int32Array(n).fill(-1) : undefined;
  dist[src] = 0;

  BMSSP_level(g, L, Number.POSITIVE_INFINITY, [src], k, t, dist, pred);

  const out: SSSPResult = { dist };
  if (pred) out.pred = pred;
  return out;
}

/**
 * BMSSP(l, B, S):
 * - If l == 0 => baseCase
 * - Else:
 *    1) {W,P} = FindPivots(B, S, k)
 *    2) Initialize PSQueue with M = 2^{(l-1) t} (we’ll use a soft cap that grows with level)
 *    3) Loop:
 *       Pull(Si, Bi) from queue
 *       Recurse BMSSP(l-1, Bi, Si) => (B'i, Ui)
 *       For each u in Ui, relax out-neighbors:
 *         if nd in [Bi, B): queue.insert(v, nd)
 *         else if nd in [B'i, Bi): buffer K; later batchPrepend(K)
 *       BatchPrepend the (K + returning Si in that subrange)
 *    4) Stop if queue empty (success), or |U| gets large (partial). Return (B', U)
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
  if (l <= 0) {
    // Base case: S must be a singleton; if not, pick the closest among S as the "x" to expand.
    let x = S[0];
    if (S.length > 1) {
      let best = dist[x], bestx = x;
      for (const s of S) if (dist[s] < best) { best = dist[s]; bestx = s; }
      x = bestx;
    }
    return baseCase(g, x, B, k, dist, pred);
  }

  // 1) Find pivots (shrinks S)
  const { W, P } = findPivots(g, B, S, k, dist);

  // 2) Initialize PSQueue with M = 2^{(l-1) t}. We don't need exact power; a soft exponential cap works.
  // Use an exponential-ish growth cap to get fewer pulls at higher levels.
  const M = Math.max(4, Math.floor(Math.pow(2, (l - 1) * Math.max(1, t / 4))));
  const Q = new PSQueue(M, B);

  // Insert pivots with their current d̂[x]
  for (const x of P) {
    Q.insert({ key: x, val: dist[x] });
  }

  // Track progress
  let U: number[] = [];
  let i = 0;
  let Bprime_i = P.length ? Math.min(...P.map(p => dist[p])) : B; // initial lower bound
  if (!Number.isFinite(Bprime_i)) Bprime_i = B;

  // 3) Iteratively pull chunks and recurse
  while (U.length < k * k * Math.max(1, Math.floor(Math.pow(2, l * Math.max(1, t / 6))))) { // ≈ k * 2^{lt} soft cap
    if (Q.isEmpty()) break; // success

    i++;
    const pulled = Q.pull();
    const Si = pulled.S;
    const Bi = pulled.bound;
    if (!Si.length) break;

    // Recurse down
    const { Bprime, U: Ui } = BMSSP_level(g, l - 1, Bi, Si, k, t, dist, pred);
    Bprime_i = Math.min(Bprime_i, Bprime);
    U = U.concat(Ui);

    // Relax edges from Ui and manage the queue (respect intervals)
    const K: { key: number; val: number }[] = [];

    for (const u of Ui) {
      const du = dist[u];
      if (!Number.isFinite(du)) continue;
      const Lk = g.rowPtr[u], Rk = g.rowPtr[u + 1];
      for (let kk2 = Lk; kk2 < Rk; kk2++) {
        const v = g.cols[kk2];
        const nd = du + g.weights[kk2];

        // Important: use <= comparison to allow reuse across levels
        if (nd <= dist[v]) {
          // tighten if strictly smaller
          if (nd < dist[v]) {
            dist[v] = nd;
            if (pred) pred[v] = u;
          }

          if (nd >= Bi && nd < B) {
            Q.insert({ key: v, val: nd });
          } else if (nd >= Bprime && nd < Bi) {
            K.push({ key: v, val: nd });
          }
        }
      }
    }

    // BatchPrepend all (B'i, Bi) range + any Si elements whose current dist fell in [B'i, Bi)
    if (K.length) Q.batchPrepend(K);

    // Also put back Si nodes if their current dist is in [B'i, Bi)
    const back: { key: number; val: number }[] = [];
    for (const x of Si) {
      const dx = dist[x];
      if (dx >= Bprime && dx < Bi) back.push({ key: x, val: dx });
    }
    if (back.length) Q.batchPrepend(back);
  }

  // End condition:
  // - Success if queue empty -> B' = B
  // - Partial if U got large -> B' = Bprime_i
  const success = Q.isEmpty();
  const Bprime_out = success ? B : Bprime_i;

  // Include the completed portion of W under B' to U
  const extraW: number[] = [];
  for (const x of W) if (dist[x] < Bprime_out) extraW.push(x);
  if (extraW.length) U = U.concat(extraW);

  return { Bprime: Bprime_out, U };
}

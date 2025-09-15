import { GSRGraph } from "../../core/types.js";

/**
 * FindPivots(B, S, k)
 *
 * Pre-req: For every incomplete v with d(v) < B, its shortest path visits some complete u in S.
 * dist[] reflects current best-known distances; vertices in S should be "complete".
 *
 * Returns:
 *  - W: number[]; visited set after up to k bounded relax steps. Some may (now) be complete.
 *  - P: number[]; subset of S that are "pivots": each has a tight-tree of size >= k inside W.
 */
export function findPivots(
  g: GSRGraph,
  B: number,
  S: number[],
  k: number,
  dist: Float64Array
): { W: number[]; P: number[] } {
  const n = g.n;
  const inW = new Uint8Array(n);
  const Wi: number[][] = [];
  const W: number[] = [];

  // W0 = S
  Wi.push([...S]);
  for (const u of S) if (!inW[u]) { inW[u] = 1; W.push(u); }

  // --- k rounds of bounded relax (like Bellman-Ford) ---
  for (let i = 1; i <= k; i++) {
    const prev = Wi[i - 1];
    const nextSet: number[] = [];

    const before = W.length;

    // Explore out-neighbors of the previous frontier, bounded by B
    for (const u of prev) {
      const du = dist[u];
      if (!Number.isFinite(du)) continue;
      const L = g.rowPtr[u], R = g.rowPtr[u + 1];
      for (let kk = L; kk < R; kk++) {
        const v = g.cols[kk];
        const nd = du + g.weights[kk];
        if (!(nd < B)) continue; // respect bound

        // allow <= to enable reuse across levels
        if (nd <= dist[v]) {
          if (nd < dist[v]) dist[v] = nd; // tighten if strictly better
          if (!inW[v]) {
            inW[v] = 1;
            W.push(v);
            nextSet.push(v);
          }
        }
      }
    }

    Wi.push(nextSet);

    // Early stop if W exploded: |W| > k * |S|
    if (W.length > k * S.length) {
      // In this branch, per the paper, we can set P = S.
      return { W, P: [...S] };
    }

    // If no growth this round, stop early.
    if (W.length === before) break;
  }

  // --- Build tight-forest F over W ---
  // Tight edge: dist[v] == dist[u] + w  (use epsilon for floating point safety)
  const EPS = 1e-12;
  const parent = new Int32Array(n).fill(-1);

  for (const u of W) {
    const du = dist[u];
    if (!Number.isFinite(du)) continue;
    const L = g.rowPtr[u], R = g.rowPtr[u + 1];
    for (let kk = L; kk < R; kk++) {
      const v = g.cols[kk];
      if (!inW[v]) continue; // only edges within W
      const nd = du + g.weights[kk];
      if (Math.abs(nd - dist[v]) <= EPS) {
        // choose the tight predecessor with smallest dist (stable enough for subtree sizing)
        if (parent[v] === -1 || dist[u] < dist[parent[v]]) parent[v] = u;
      }
    }
  }

  // --- Subtree sizes (forest may have multiple roots) ---
  const size = new Int32Array(n).fill(0);
  const order = [...W].sort((a, b) => dist[a] - dist[b]); // ascending distance (topo-like)
  for (const v of order) size[v] = 1;
  for (const v of order) {
    const p = parent[v];
    if (p !== -1) size[p] += size[v];
  }

  // Pivots: roots in S with subtree size >= k
  const P: number[] = [];
  for (const s of S) {
    if (parent[s] === -1 && size[s] >= k) P.push(s);
  }

  return { W, P };
}

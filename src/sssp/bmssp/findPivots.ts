import { GSRGraph } from "../../core/types.js";

/**
 * FindPivots(B, S, k)
 *
 * - Do k rounds of relaxations from S bounded by B.
 * - Collect W (all discovered vertices).
 * - If W grows too big (>|S| * k), return {W, P=S}.
 * - Else build the tight-forest on W (edges where dist[v] ≈ dist[u]+w).
 * - Return pivots = roots in S whose subtree size ≥ k.
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

  // Start with S
  Wi.push([...S]);
  for (const u of S) if (!inW[u]) { inW[u] = 1; W.push(u); }

  // --- k rounds ---
  for (let i = 1; i <= k; i++) {
    const prev = Wi[i - 1];
    const next: number[] = [];
    const before = W.length;

    for (const u of prev) {
      const du = dist[u];
      if (!Number.isFinite(du)) continue;
      const L = g.rowPtr[u], R = g.rowPtr[u + 1];
      for (let kk = L; kk < R; kk++) {
        const v = g.cols[kk];
        const nd = du + g.weights[kk];
        if (!(nd < B)) continue;

        if (nd <= dist[v]) {
          if (nd < dist[v]) dist[v] = nd;
          if (!inW[v]) {
            inW[v] = 1;
            W.push(v);
            next.push(v);
          }
        }
      }
    }

    Wi.push(next);

    if (W.length > k * S.length) {
      return { W, P: [...S] };
    }
    if (W.length === before) break;
  }

  // --- Build tight-forest ---
  const EPS = 1e-12; // epsilon for float safety
  const parent = new Int32Array(n).fill(-1);

  for (const u of W) {
    const du = dist[u];
    if (!Number.isFinite(du)) continue;
    const L = g.rowPtr[u], R = g.rowPtr[u + 1];
    for (let kk = L; kk < R; kk++) {
      const v = g.cols[kk];
      if (!inW[v]) continue;
      const nd = du + g.weights[kk];
      if (Math.abs(nd - dist[v]) <= EPS) {
        if (parent[v] === -1 || dist[u] < dist[parent[v]]) parent[v] = u;
      }
    }
  }

  // Subtree sizes
  const size = new Int32Array(n).fill(0);
  const order = [...W].sort((a, b) => dist[a] - dist[b]);
  for (const v of order) size[v] = 1;
  for (const v of order) {
    const p = parent[v];
    if (p !== -1) size[p] += size[v];
  }

  const P: number[] = [];
  for (const s of S) {
    if (parent[s] === -1 && size[s] >= k) P.push(s);
  }

  return { W, P };
}

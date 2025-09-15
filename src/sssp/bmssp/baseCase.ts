import { GSRGraph, SSSPResult } from "../../core/types.js";

/**
 * BaseCase(B, S={x}) — Mini-Dijkstra bounded by B.
 *
 * Pre-req:
 *  - S is a singleton {x}
 *  - x is "complete" relative to current dist[] (dist[x] is final)
 *  - Every incomplete v with d(v) < B has its shortest path going through x
 *
 * Returns:
 *  - Bprime: number <= B
 *  - U: number[] (the set of vertices completed here)
 *
 * We assume a caller-managed dist[] and pred[] (so we can compare with oracle).
 */
export function baseCase(
  g: GSRGraph,
  x: number,
  B: number,
  k: number,
  dist: Float64Array,
  pred?: Int32Array
): { Bprime: number; U: number[] } {
  type Item = { v: number; d: number };
  const heap: Item[] = [];
  const inHeap = new Uint8Array(g.n);

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
      let l = i * 2 + 1, r = l + 1, m = i;
      if (l < heap.length && heap[l].d < heap[m].d) m = l;
      if (r < heap.length && heap[r].d < heap[m].d) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };

  // Initialize with x
  push({ v: x, d: dist[x] });
  inHeap[x] = 1;

  const U0: number[] = [];

  while (heap.length && U0.length < k + 1) {
    const it = pop()!;
    const u = it.v;
    if (it.d !== dist[u]) continue; // stale
    U0.push(u);

    // relax out-neighbors if within bound B
    const L = g.rowPtr[u], R = g.rowPtr[u + 1];
    for (let kk = L; kk < R; kk++) {
      const v = g.cols[kk];
      const nd = dist[u] + g.weights[kk];

      if (!(nd < B)) continue; // respect bound

      if (nd < dist[v]) {
        dist[v] = nd;
        if (pred) pred[v] = u;
        if (inHeap[v]) {
          // decrease-key: insert again; stale entries will be skipped
          push({ v, d: nd });
        } else {
          inHeap[v] = 1;
          push({ v, d: nd });
        }
      }
    }
  }

  if (U0.length <= k) {
    // We didn’t reach k+1; success with B' = B and U = U0
    return { Bprime: B, U: U0 };
  } else {
    // We found k+1 vertices; set B' to the max dist among them, and return those strictly below B'
    let Bprime = -Infinity;
    for (const v of U0) if (dist[v] > Bprime) Bprime = dist[v];
    const U = U0.filter(v => dist[v] < Bprime);
    return { Bprime, U };
  }
}

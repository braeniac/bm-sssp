import { GSRGraph } from "../../core/types.js";

/**
 * Base case mini-Dijkstra bounded by B, starting from x.
 * Pops up to k+1 vertices.
 * - If fewer than k+1, returns B' = B and all popped vertices in U.
 * - Else returns B' = max popped distance and U = those < B'.
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

  // --- Heap helpers (same as Dijkstra) ---
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

  push({ v: x, d: dist[x] });
  inHeap[x] = 1;

  const popped: number[] = [];

  while (heap.length && popped.length < k + 1) {
    const it = pop()!;
    const u = it.v;
    if (it.d !== dist[u]) continue; // stale entry
    popped.push(u);

    // Relax edges bounded by B
    const L = g.rowPtr[u], R = g.rowPtr[u + 1];
    for (let kk = L; kk < R; kk++) {
      const v = g.cols[kk];
      const nd = dist[u] + g.weights[kk];
      if (!(nd < B)) continue;

      if (nd < dist[v]) {
        dist[v] = nd;
        if (pred) pred[v] = u;
        push({ v, d: nd });
        inHeap[v] = 1;
      }
    }
  }

  if (popped.length <= k) {
    return { Bprime: B, U: popped };
  } else {
    let Bprime = -Infinity;
    for (const v of popped) if (dist[v] > Bprime) Bprime = dist[v];
    const U = popped.filter(v => dist[v] < Bprime);
    return { Bprime, U };
  }
}

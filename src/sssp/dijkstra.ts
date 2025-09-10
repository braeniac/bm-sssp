import { GSRGraph, SSSPOptions, SSSPResult } from "../core/types.js";

export function dijkstraSSSP(g: GSRGraph, opts: SSSPOptions): SSSPResult {
  
  const n = g.n;
  const src = opts.source;
  
  if (src < 0 || src >= n) throw new Error("source out of range");

  const dist = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const pred = opts.returnPredecessors ? new Int32Array(n).fill(-1) : undefined;
  const visited = new Uint8Array(n);

  dist[src] = 0;

  // Min-heap (very small, simple)
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
      let l = i * 2 + 1, r = l + 1, m = i;
      if (l < heap.length && heap[l].d < heap[m].d) m = l;
      if (r < heap.length && heap[r].d < heap[m].d) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };

  push({ v: src, d: 0 });

  while (true) {
    const it = pop();
    if (!it) break;
    const u = it.v;
    if (visited[u]) continue;
    visited[u] = 1;

    for (let k = g.rowPtr[u]; k < g.rowPtr[u + 1]; k++) {
      const v = g.cols[k];
      const w = g.weights[k];
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        if (pred) pred[v] = u;
        push({ v, d: nd });
      }
    }
  }

  const result: SSSPResult = { dist };
  
  if (pred) result.pred = pred;

  return result;
}

import { GSRGraph } from "../../core/types.js"; 

// Relax all edges out of u.
// If boundB is given, only consider neighbors with nd < boundB.
// eqOK=true allows "≤" updates (paper requires this for reuse across levels).
export function relaxOutNeighbors(
  g: GSRGraph,
  u: number,
  dist: Float64Array,
  pred?: Int32Array,
  eqOK = false,
  boundB?: number
): number {
  let updates = 0;
  const du = dist[u];
  if (!Number.isFinite(du)) return updates;

  const L = g.rowPtr[u], R = g.rowPtr[u + 1];
  for (let k = L; k < R; k++) {
    const v = g.cols[k];
    const nd = du + g.weights[k];

    if (boundB !== undefined && !(nd < boundB)) continue;

    if ((eqOK && nd <= dist[v]) || (!eqOK && nd < dist[v])) {
      if (nd < dist[v]) {
        dist[v] = nd;
        if (pred) pred[v] = u;
      }
      updates++;
    }
  }
  return updates;
}

// Relax from a whole set of vertices
export function relaxFromSet(
  g: GSRGraph,
  U: number[],
  dist: Float64Array,
  pred?: Int32Array,
  eqOK = false,
  boundB?: number
): number {
  let total = 0;
  for (const u of U) total += relaxOutNeighbors(g, u, dist, pred, eqOK, boundB);
  return total;
}

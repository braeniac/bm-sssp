import { GSRGraph } from "../../core/types.js";

/**
 * Relax all outgoing edges of u (CSR) against dist[] with optional bound B.
 * - If nd = dist[u] + w is < dist[v], we update dist[v] (and pred if provided).
 * - If eqOK is true, we allow nd <= dist[v] (paper uses ≤ to reuse edges across levels).
 * - If boundB is provided, we only consider updates with nd < boundB.
 *
 * Returns: number of successful relaxations (updates performed or equals-allowed hits).
 */
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

    if (boundB !== undefined && !(nd < boundB)) {
      continue; // bounded BMSSP relax
    }

    // Compare with <= if eqOK, else <
    if ((eqOK && nd <= dist[v]) || (!eqOK && nd < dist[v])) {
      dist[v] = nd;
      if (pred) pred[v] = u;
      updates++;
    }
  }
  return updates;
}

/**
 * One "Bellman-Ford-style" step over a frontier set U: relax all edges out of all u in U.
 * Returns total relaxations.
 */
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

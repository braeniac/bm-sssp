// Public entry point for the package.
// Exports all the core types, the graph builder, and the two algorithms:
// - dijkstraSSSP (oracle reference)
// - bmSssp (the new algorithm, aliased to "sssp" for user-facing API)

export type {
  Node,
  Edge,
  GraphInput,
  GSRGraph,
  SSSPOptions,
  SSSPResult,
} from "./core/types.js";

export { buildGraph } from "./core/graph.js";

// Keep Dijkstra exported for validation / testing
export { dijkstraSSSP } from "./sssp/dijkstra.js";

// Alias bmSssp as the public "sssp"
export { bmSssp as sssp } from "./sssp/bmssp/bmssp.js";


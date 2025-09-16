// Core type definitions shared across modules.

export type Node = number;

export type Edge = {
  u: Node;
  v: Node;
  w: number; // edge weight: must be finite, non-negative
};

// Input can be either:
//  - Edge list: { n, edges }
//  - Adjacency list: { n, adj }
export type GraphInput =
  | {
      n: number;
      edges: Edge[];
      directed?: boolean;
    }
  | {
      n: number;
      adj: Array<Array<{ v: Node; w: number }>>;
      directed?: boolean;
    };

// CSR (Compressed Sparse Row) representation of a graph
export type GSRGraph = {
  n: number;
  m: number;
  directed: boolean;
  rowPtr: Int32Array;    // length n+1; offsets into cols/weights
  cols: Int32Array;      // length m; stores neighbor vertices
  weights: Float64Array; // length m; stores edge weights
};

// Options to pass to SSSP algorithms
export type SSSPOptions = {
  source: Node;
  returnPredecessors?: boolean;
  kSteps?: number;      // BM-SSSP tuning param (optional)
  pivotFactor?: number; // BM-SSSP tuning param (optional)
};

// Results of SSSP run
export type SSSPResult = {
  dist: Float64Array;   // shortest distances
  pred?: Int32Array;    // predecessors (if requested)
  hops?: Int32Array;    // (future) hop counts
};

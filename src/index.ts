export const VERSION = "0.1.0-dev"; 

import { 
    Vertex, 
    Edge, 
    GraphInput,
    SSSPOptions, 
    SSSPResult 
} from "./types.js";

/** === Public API === */

export function sssp(graph : GraphInput, options : SSSPOptions) : SSSPResult {

    //basic runtime checks

    if (!graph || typeof graph != 'object') {
        throw new TypeError("sssp(graph, options): 'graph' must be an object.");
    }

    if (!("n" in graph) || !Number.isInteger(graph.n) || graph.n < 0) {
        throw new TypeError("graph.n must be a non-negative integer.");
    }
    
    const n = graph.n;

    if (!options || !Number.isInteger(options.source) || options.source < 0 || options.source >= n) {
        throw new RangeError("sssp(graph, options): options.source must be an integer in [0, n).");
    }

    //TODO-------
    throw new Error(
        "bm-sssp: core algorithm not implemented yet"
    );
}

/** Convenience helper for consumers to detect library presence/version */
export function about(): string {
  return `bm-sssp ${VERSION} — Directed SSSP (non-negative weights).`;
}

export type Vertex = number; 

export type Edge = {
    /** Vertex (0..n-1) */
    u : Vertex,
    /** Vertex (0..n-1) */
    v : Vertex,
    /** Non-negative weight */
    w : number
}

export type GraphInput = 
{
    /** Number of verticies possibly 0..n-1 */
    n : number, 
    /** Edge list */
    edges : Edge[],
    /** 
    *   Each connection between two vertices have a specific direction
    *   by default: TRUE
    */
    directed ?: Boolean
} |
{
    /** Number of verticis possibly 0..n-1 */
    n : number,
    /** 
     * adj is an adjacency list.
     * 
     * It's an array, where each index corresponds to a vertex.
     * Each entry (adj[i]) is an array of edges going out of vertex i.
     * Each edge is stored as an object with:
     * - the neighbor (v), and 
     * - the edge weight (w).
     * 
     */
    adj: Array<Array<{ v : Vertex ; w : number }>>,
    /** 
    * Each connection between two vertices have a specific direction
    * By default: TRUE
    */
    directed ?: Boolean
}

export type SSSPOptions = {
    /** required a source vertex (0..n-1) */
    source : Vertex,
    /** 
     * return predecessor array to reconstruct path 
     * 
     * For example, 
     * source vertex: 0.
     * 0 -> 1 (w : 2)
     * 0 -> 2 (w : 5)
     * 1 -> 2 (w : 1)
     * 
     * The predecessor array (pred) will return:
     * pred[0] = -1  //source has no predecessor
     * pred[1] = 0   // 0 -> 1
     * pred[2] = 1   // 1 -> 2 
     * 
     * 2 → pred[2] = 1 → pred[1] = 0 → pred[0] = -1
    */
    returnPrecessors ?: boolean,
    /**
     * Tuning knobs
     * kSteps: relax depth per phase 
     * pivotFactor: affects FindPivots / expansion threshold.
     */
    kSteps ?: number,
    pivotFactor ?: number
}

export type SSSPResult = {
  /** shortest distances from source; +Infinity where unreachable */
  dist: Float64Array
  /** predecessor array (only if requested) */
  pred?: Int32Array
};
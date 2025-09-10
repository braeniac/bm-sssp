import { Node, GraphInput, GSRGraph } from "./types.js";


export function buildGraph(input : GraphInput) : GSRGraph { 

    const directed = input.directed ?? true; 
 
    const n = input.n;
    if (!(Number.isInteger(n) && n >= 0)) throw new Error("n must be a non-negative integer."); 
    
    let edges: { u : Node, v : Node, w : number }[] = []; 

    if ("edges" in input) {
        edges = input.edges.slice();
    } else {
        //flatten (adj) adjacency list
        edges = [];
        for (let u = 0; u<input.adj.length; u++) {
            const row = input.adj[u];
            for (let j = 0; j<row.length; j++) {
                const { v, w } = row[j];        
                edges.push({ u, v, w });
            }
        }
    }

    let m = edges.length; 

    const rowPtr = new Int32Array(n + 1); 

    //creates space for each nodes outgoing edges. 
    const outdeg = new Int32Array(n); 

    //validating u, v as valid vertices [0, n).
    //increment outdeg for each edge u->v.
    for (const e of edges) {
        if (!Number.isInteger(e.u) || e.u < 0 || e.u >= n) throw new Error("edge.u out of range");
        if (!Number.isInteger(e.v) || e.v < 0 || e.v >= n) throw new Error("edge.v out of range");
        if (!Number.isFinite(e.w) || e.w < 0) throw new Error("edge.w must be a finite non-negative number");
        outdeg[e.u]++;
    }

    // prefix sums → rowPtr
    for (let i = 0, sum = 0; i < n; i++) {
        rowPtr[i] = sum;
        sum += outdeg[i];
    }

    rowPtr[n] = m;

    const cols = new Int32Array(m);
    const weights = new Float64Array(m);
    const cursor = rowPtr.slice();

    for (const e of edges) {
        const k = cursor[e.u]++;
        cols[k] = e.v;
        weights[k] = e.w;
    }

    return { n, m, directed, rowPtr, cols, weights }; 
}
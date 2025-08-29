import { 
    Vertex,
    GraphInput,
    GSRGraph
} from "./types.js";


function assert(cond:unknown, msg: string) : asserts cond {
    if (!cond) {
        throw new TypeError(msg);
    }
}

export function buildGraph (input : GraphInput) : GSRGraph {  
    const directed = input.directed ?? true

    const n = input.n;
    assert(Number.isInteger(n) && n >= 0, "graph.n must be a non-negative integer");

    let edges: { u : Vertex; v : Vertex; w : number }[] = []; 

    if ("edges" in input) {
        edges = input.edges;
    } else {
        //flatten (adj) adjacency list
        edges = [];
        for (let u = 0; u<input.adj.length; u++) {
            const row = input.adj[u];
            for (let j = 0; j<row.length; j++) {
                edges.push({ u, v : row[u].v, w: row[u].w});
            }
        }
    }

    const m = edges.length; 
    const rowPtr = new Int32Array(n + 1); 

    //creates space for each vertexs outgoing edges. 
    const outdeg = new Int32Array(n); 

    //validating u, v as valid vertices [0, n).
    //increment outdeg for each edge u->v.
    for (const e of edges) {
        assert(Number.isInteger(e.u) && e.u >= 0 && e.u < n, "edge.u is out of range");
        assert(Number.isInteger(e.v) && e.v >= 0 && e.v < n, "edge.v is out of range");
        assert(Number.isFinite(e.w) && e.w >= 0, "edge.w must be a non-negative finite number");
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



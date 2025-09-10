// dev mode (tsx)
import { buildGraph, sssp } from "../src/index.js";
import { fmt } from "../src/utils/pretty.js";


// Option A: edge list
const G1 = buildGraph({
  n: 4,
  edges: [
    { u: 0, v: 1, w: 2 },
    { u: 0, v: 3, w: 1 },
    { u: 1, v: 2, w: 1 },
    { u: 3, v: 2, w: 5 },
  ],
});

// Option B: adjacency list (should produce same CSR)
const G2 = buildGraph({
  n: 4,
  adj: [
    [ { v: 1, w: 2 }, { v: 3, w: 1 } ], // from 0
    [ { v: 2, w: 1 } ],                 // from 1
    [ { v: 2, w: 0 } ],                 // from 2 (self-loop zero for fun)
    [ { v: 2, w: 5 } ],                 // from 3
  ]
});

const { dist: d1 } = sssp(G1, { source: 0, returnPredecessors: true });
const { dist: d2 } = sssp(G2, { source: 0 });

console.log("G1 dist:", fmt(d1)); // -> [0, 2, 3, 1]
console.log("G2 dist:", fmt(d2)); // -> [0, 2, 3, 1]

// Peek at CSR slices to understand structure
console.log("\nCSR slices (G1):");
for (let u = 0; u < G1.n; u++) {
  const L = G1.rowPtr[u], R = G1.rowPtr[u + 1];
  const slice = Array.from({ length: R - L }, (_, i) => {
    const k = L + i;
    return `${u}->${G1.cols[k]}(w=${G1.weights[k]})`;
  });
  console.log(`u=${u} : ${slice.length ? slice.join(", ") : "[no outgoing]"}`);
}

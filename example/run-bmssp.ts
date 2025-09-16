import { buildGraph, dijkstraSSSP, sssp } from "../src/index.js";
import { fmt } from "../src/utils/pretty.js";

const G = buildGraph({
  n: 10,
  edges: [
    { u: 0, v: 1, w: 4 },
    { u: 0, v: 2, w: 3 },
    { u: 1, v: 3, w: 2 },
    { u: 1, v: 4, w: 7 },
    { u: 2, v: 3, w: 5 },
    { u: 2, v: 5, w: 8 },
    { u: 3, v: 6, w: 6 },
    { u: 4, v: 6, w: 1 },
    { u: 5, v: 7, w: 2 },
    { u: 6, v: 8, w: 3 },
    { u: 7, v: 8, w: 4 },
    { u: 8, v: 9, w: 5 },
  ],
});

const oracle = dijkstraSSSP(G, { source: 0 }).dist;
const bm = sssp(G, { source: 0 }).dist;

console.log("Dijkstra:", fmt(oracle));
console.log("BM-SSSP :", fmt(bm));

// quick assert
let ok = true;
for (let i = 0; i < G.n; i++) {
  if (oracle[i] !== bm[i]) {
    ok = false;
    console.log(`Mismatch at v=${i}: dijk=${oracle[i]} bm=${bm[i]}`);
  }
}
console.log(ok ? "✅ Distances match" : "❌ Distances differ");

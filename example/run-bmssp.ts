import { buildGraph, dijkstraSSSP, sssp } from "../src/index.js";
import { fmt } from "../src/utils/pretty.js";

const G = buildGraph({
  n: 6,
  edges: [
    { u: 0, v: 1, w: 2 },
    { u: 0, v: 2, w: 3 },
    { u: 1, v: 3, w: 2 },
    { u: 2, v: 3, w: 2 },
    { u: 3, v: 4, w: 1 },
    { u: 1, v: 5, w: 10 },
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

# 📦 bm-sssp

A **TypeScript library** implementing **Single-Source Shortest Paths (SSSP)** for directed graphs with non-negative edge weights.  

The long-term goal is to provide a practical implementation of the **“Breaking the Sorting Barrier for Directed Single-Source Shortest Paths”** algorithm (Duan, Mao, Mao, Shu, Yin, 2025). This algorithm achieves sub-sorting-barrier complexity for sparse directed graphs, improving over Dijkstra’s classic bound.  

> ⚠️ **Status:** Work in progress. At this stage the library sets up types, a graph builder (CSR format), and API scaffolding. The core BMSSP algorithm is still a stub.

---

## ✨ Features

- **Clean API contract**: `sssp(graph, { source }) → { dist, pred? }`
- **Graph builder**: converts edge list or adjacency list into **Compressed Sparse Row (CSR)** form for efficiency.
- **Typed arrays**: `Float64Array` for distances, `Int32Array` for indices.
- **TypeScript first**: strict typing, `.d.ts` output, ESM-friendly.
- **Safe defaults**: source node validated, non-negative weights enforced.

Planned:
- Full BMSSP algorithm.
- Benchmarks vs Dijkstra.
- Optional Rust→WASM “fast path”.

---

## 🚀 Install

_Not yet published to npm — use local link or build manually._  

When published:
```bash
npm install bm-sssp
```

📖 Usage
Basic example (stubbed distances)
```ts
import { sssp, buildGraph } from "bm-sssp; 

const graph = {
  n: 3,
  edges: [
    { u: 0, v: 1, w: 1 },
    { u: 1, v: 2, w: 2 },
  ],
  directed: true,
};

// convert to CSR and run SSSP
const csr = buildGraph(graph);
console.log(csr.rowPtr, csr.cols, csr.weights);

const { dist, pred } = sssp(graph, { source: 0, returnPredecessors: true });


```

📚 References

- Ran Duan, Jiayi Mao, Xiao Mao, Xinkai Shu, Longhui Yin. Breaking the Sorting Barrier for Directed Single Source Shortest Paths(July 31, 2025).

📜 License
MIT © 2025 Maninder Singh
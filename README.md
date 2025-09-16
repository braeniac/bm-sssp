# bm-sssp

> **Breaking the Sorting Barrier for Directed Single-Source Shortest Path (SSSP)** in TypeScript.  
> Implementation of the 2025 algorithm by Duan, Mao, Mao, Shu, and Yin:  
> [Breaking the Sorting Barrier for Directed SSSP](https://arxiv.org/abs/2504.17033).

[![npm version](https://img.shields.io/npm/v/bm-sssp)](https://www.npmjs.com/package/bm-sssp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## ✨ Features

- **Directed graphs with non-negative weights**
- **CSR graph representation** (compressed sparse row arrays) for cache-efficient traversal
- **BM-SSSP algorithm**:  
  - The first deterministic algorithm to beat Dijkstra’s `O(m + n log n)` on sparse graphs  
  - Runs in `O(m log^(2/3) n)` time in the comparison–addition model
- **Dijkstra oracle included** for validation and comparison
- Written in **TypeScript**, ships **types** and **dual ESM/CJS builds**
- Clean modular design: `core/` (graph + types), `sssp/` (algorithms), `utils/`

---

## 📦 Installation

```bash
npm install bm-sssp
```

---

## 🚀 Usage

### Build a graph

You can build from either an **edge list** or an **adjacency list**.

```ts
import { buildGraph, sssp } from "bm-sssp";

// Edge list
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

// Run BM-SSSP from source = 0
const { dist } = sssp(G, { source: 0 });
console.log(dist);
// Float64Array [0, 2, 3, 4, 5, 12]
```

### Using Dijkstra (for testing)

```ts
import { dijkstraSSSP } from "bm-sssp";

const { dist } = dijkstraSSSP(G, { source: 0 });
```

---

## 📖 API

### `buildGraph(input: GraphInput): GSRGraph`

Convert an edge list or adjacency list into a **CSR graph**.

- **Edge list form:**
  ```ts
  { n: number, edges: { u: Node, v: Node, w: number }[], directed?: boolean }
  ```

- **Adjacency list form:**
  ```ts
  { n: number, adj: Array<Array<{ v: Node, w: number }>>, directed?: boolean }
  ```

### `sssp(graph: GSRGraph, opts: SSSPOptions): SSSPResult`

Run **BM-SSSP** from a given source.

- `opts.source`: index of the source node
- `opts.returnPredecessors?`: if `true`, also return predecessor array

Returns:
```ts
{
  dist: Float64Array;   // shortest distances
  pred?: Int32Array;    // predecessors (if requested)
}
```

### `dijkstraSSSP(graph: GSRGraph, opts: SSSPOptions): SSSPResult`

Reference implementation of Dijkstra’s algorithm, useful for validation.

---

## 🧩 Example Output

For the graph above:

```
Dijkstra: [0, 2, 3, 4, 5, 12]
BM-SSSP : [0, 2, 3, 4, 5, 12]
```

---

## 🏗 Project Structure

```
src/
├─ core/        # Types + graph builder (CSR)
├─ sssp/        # Algorithms
│  ├─ dijkstra.ts
│  └─ bmssp/    # BM-SSSP primitives
│     ├─ baseCase.ts
│     ├─ findPivots.ts
│     ├─ psqueue.ts
│     └─ bmssp.ts
└─ utils/       # Pretty-print helpers
examples/       # Example scripts
```

---

## 📊 Algorithm Overview

- **Problem:** Compute shortest paths from a single source `s` in a directed graph with non-negative weights.
- **Dijkstra’s bottleneck:** Maintains a priority queue of up to `Θ(n)` vertices ⇒ incurs a sorting barrier (`Ω(n log n)`).
- **BM-SSSP idea:**
  - Maintain a frontier `S`, but shrink it using *pivots*.
  - Run `k` relax steps; either:
    - You complete many nodes, or
    - You prove only a few pivots matter (`≤ |U|/k`).
  - Recurse on pivots with a **partial sorting queue** instead of a global heap.
- **Result:** `O(m log^(2/3) n)` runtime in the comparison–addition model.

For full details, see the [paper](https://arxiv.org/abs/2504.17033).

---

## 🛠 Development

Clone and install:

```bash
git clone https://github.com/yourname/bm-sssp.git
cd bm-sssp
npm install
```

Run an example:

```bash
npm run dev
```

Build distributables:

```bash
npm run build
```

---

## 🐛 Known Issues

- Small graphs (`n < ~10`) sometimes expose edge-cases in pivot shrinking (distances may be left at ∞).  
  - Workaround: use `dijkstraSSSP` for oracle comparison.  
  - [Open an issue](https://github.com/yourname/bm-sssp/issues) if you hit mismatches.

---

## 🤝 Contributing

Pull requests welcome! If you spot:
- Incorrect distances,
- Performance regressions,
- Missing features (e.g., negative-weight handling),

Please open an issue with a minimal repro.

---

## 📜 License

MIT © Maninder Singh

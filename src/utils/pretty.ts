// Helper to print arrays of distances more nicely.
export const fmt = (arr: ArrayLike<number>) =>
  "[" + Array.from(arr).map(x => (Number.isFinite(x) ? x : "∞")).join(", ") + "]";

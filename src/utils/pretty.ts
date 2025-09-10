export const fmt = (arr: ArrayLike<number>) =>
  "[" + Array.from(arr).map(x => (Number.isFinite(x) ? x.toFixed(0) : "∞")).join(", ") + "]";

import type { AggregatedQuantity } from "./aggregate";

function trimDecimal(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatQuantity(q: AggregatedQuantity): string {
  switch (q.kind) {
    case "sum":
      if (q.unit === "g") {
        if (q.value >= 1000) return `${trimDecimal(q.value / 1000)} kg`;
        return `${trimDecimal(q.value)} g`;
      }
      if (q.unit === "ml") {
        if (q.value >= 1000) return `${trimDecimal(q.value / 1000)} L`;
        return `${trimDecimal(q.value)} ml`;
      }
      return `${trimDecimal(q.value)} ${q.unit}`;
    case "mixed":
      return q.parts.join(" + ");
    case "free":
      return q.note || "";
  }
}

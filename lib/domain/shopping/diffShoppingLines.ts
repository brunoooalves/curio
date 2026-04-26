import type { AggregatedQuantity, ShoppingLine } from "./aggregate";

export interface ShoppingLineDiff {
  added: ShoppingLine[];
  removed: ShoppingLine[];
  changed: { before: ShoppingLine; after: ShoppingLine }[];
  unchanged: ShoppingLine[];
}

function quantitiesEqual(a: AggregatedQuantity, b: AggregatedQuantity): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "sum" && b.kind === "sum") {
    return a.value === b.value && a.unit === b.unit;
  }
  if (a.kind === "free" && b.kind === "free") {
    return a.note === b.note;
  }
  if (a.kind === "mixed" && b.kind === "mixed") {
    if (a.parts.length !== b.parts.length) return false;
    const sortedA = [...a.parts].sort();
    const sortedB = [...b.parts].sort();
    return sortedA.every((part, i) => part === sortedB[i]);
  }
  return false;
}

export function diffShoppingLines(
  before: ShoppingLine[],
  after: ShoppingLine[],
): ShoppingLineDiff {
  const beforeByName = new Map(before.map((l) => [l.canonicalName, l]));
  const afterByName = new Map(after.map((l) => [l.canonicalName, l]));

  const added: ShoppingLine[] = [];
  const removed: ShoppingLine[] = [];
  const changed: { before: ShoppingLine; after: ShoppingLine }[] = [];
  const unchanged: ShoppingLine[] = [];

  for (const [name, line] of afterByName) {
    const prev = beforeByName.get(name);
    if (!prev) {
      added.push(line);
    } else if (!quantitiesEqual(prev.aggregatedQuantity, line.aggregatedQuantity)) {
      changed.push({ before: prev, after: line });
    } else {
      unchanged.push(line);
    }
  }
  for (const [name, line] of beforeByName) {
    if (!afterByName.has(name)) removed.push(line);
  }

  added.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  removed.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  changed.sort((a, b) => a.before.canonicalName.localeCompare(b.before.canonicalName));
  unchanged.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

  return { added, removed, changed, unchanged };
}

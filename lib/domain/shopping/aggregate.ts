import type { ParsedQuantity } from "@/lib/domain/ingredient/parseQuantity";

export type AggregatedQuantity =
  | { kind: "sum"; value: number; unit: string }
  | { kind: "mixed"; parts: string[] }
  | { kind: "free"; note: string };

export interface AggregateInput {
  canonicalName: string;
  parsed: ParsedQuantity;
  rawText: string;
  recipeId: string;
}

export interface ShoppingLine {
  canonicalName: string;
  aggregatedQuantity: AggregatedQuantity;
  sourceRecipeIds: string[];
}

function partLabel(parsed: ParsedQuantity, raw: string): string {
  switch (parsed.kind) {
    case "numeric":
      return `${formatNum(parsed.value)} ${parsed.unit}`;
    case "unit":
      return `${formatNum(parsed.value)} ${parsed.label}`;
    case "free":
      return parsed.raw || raw;
  }
}

function formatNum(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function aggregateIngredients(inputs: AggregateInput[]): ShoppingLine[] {
  const groups = new Map<string, AggregateInput[]>();
  for (const input of inputs) {
    const key = input.canonicalName;
    const list = groups.get(key);
    if (list) list.push(input);
    else groups.set(key, [input]);
  }

  const out: ShoppingLine[] = [];
  for (const [canonicalName, items] of groups) {
    out.push({
      canonicalName,
      aggregatedQuantity: aggregateGroup(items),
      sourceRecipeIds: dedup(items.map((i) => i.recipeId)),
    });
  }
  out.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  return out;
}

function dedup(values: string[]): string[] {
  return Array.from(new Set(values));
}

function aggregateGroup(items: AggregateInput[]): AggregatedQuantity {
  if (items.length === 0) return { kind: "free", note: "" };

  const free = items.filter((i) => i.parsed.kind === "free");
  const numerics = items.filter(
    (i): i is AggregateInput & { parsed: { kind: "numeric"; value: number; unit: "g" | "ml" } } =>
      i.parsed.kind === "numeric",
  );
  const units = items.filter(
    (i): i is AggregateInput & { parsed: { kind: "unit"; value: number; label: string } } =>
      i.parsed.kind === "unit",
  );

  // Tudo free com mesma nota: junta numa só.
  if (numerics.length === 0 && units.length === 0) {
    const notes = dedup(free.map((f) => f.parsed.kind === "free" ? f.parsed.raw || f.rawText : ""));
    return notes.length === 1
      ? { kind: "free", note: notes[0] ?? "a gosto" }
      : { kind: "mixed", parts: notes };
  }

  // Tudo numerico mesma unidade: soma.
  if (free.length === 0 && units.length === 0 && numerics.length > 0) {
    const unit = numerics[0]!.parsed.unit;
    const sameUnit = numerics.every((n) => n.parsed.unit === unit);
    if (sameUnit) {
      const total = numerics.reduce((acc, n) => acc + n.parsed.value, 0);
      return { kind: "sum", value: total, unit };
    }
  }

  // Tudo unit com mesmo label: soma como unit.
  if (free.length === 0 && numerics.length === 0 && units.length > 0) {
    const label = units[0]!.parsed.label;
    const sameLabel = units.every((u) => u.parsed.label === label);
    if (sameLabel) {
      const total = units.reduce((acc, u) => acc + u.parsed.value, 0);
      return { kind: "sum", value: total, unit: label };
    }
  }

  // Caso geral: mixed.
  const parts = items.map((i) => partLabel(i.parsed, i.rawText));
  return { kind: "mixed", parts: dedup(parts) };
}

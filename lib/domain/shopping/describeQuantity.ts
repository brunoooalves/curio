import type { AggregatedQuantity } from "./aggregate";

/**
 * Display-time conversion of common cooking units to mL.
 * Keys are pre-normalized (lowercase, trimmed, accents allowed).
 * Used for the "~150 ml" hint shown alongside the literal sum.
 */
const COOKING_UNIT_TO_ML: Record<string, number> = {
  "colher de sopa": 15,
  "colheres de sopa": 15,
  "colher de chá": 5,
  "colher de cha": 5,
  "colheres de chá": 5,
  "colheres de cha": 5,
  xícara: 240,
  xicara: 240,
  xícaras: 240,
  xicaras: 240,
  copo: 240,
  copos: 240,
};

const PIECE_UNITS = new Set([
  "unidade",
  "unidades",
  "dente",
  "dentes",
  "fatia",
  "fatias",
  "ramo",
  "ramos",
  "maço",
  "macos",
  "maços",
  "pé",
  "pe",
  "talo",
  "talos",
  "folha",
  "folhas",
]);

export interface DescribedQuantity {
  /** Primary, market-friendly label. Always present. */
  display: string;
  /** Literal aggregated form if different from display; otherwise null. */
  raw: string | null;
  /** Suggested packaging size, or null when not applicable. */
  packaging: string | null;
}

function trimDecimal(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function roundForDisplay(ml: number): number {
  if (ml < 50) return Math.round(ml / 5) * 5;
  if (ml < 200) return Math.round(ml / 10) * 10;
  return Math.round(ml / 50) * 50;
}

function packagingForMl(ml: number): string | null {
  if (ml < 100) return null;
  if (ml < 300) return "1 garrafa pequena";
  if (ml < 800) return "1 garrafa";
  if (ml < 1500) return "1 litro";
  return `${trimDecimal(ml / 1000)} litros`;
}

function packagingForGrams(g: number): string | null {
  if (g < 250) return null;
  if (g < 600) return "1 pacote pequeno";
  if (g < 1200) return "1 pacote (1 kg)";
  return `${trimDecimal(g / 1000)} kg`;
}

function formatGrams(g: number): string {
  if (g >= 1000) return `${trimDecimal(g / 1000)} kg`;
  return `${trimDecimal(g)} g`;
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${trimDecimal(ml / 1000)} L`;
  return `${trimDecimal(ml)} ml`;
}

export function describeQuantity(q: AggregatedQuantity): DescribedQuantity {
  switch (q.kind) {
    case "sum": {
      const unitLower = q.unit.toLowerCase();

      if (unitLower === "g" || unitLower === "kg") {
        const grams = unitLower === "kg" ? q.value * 1000 : q.value;
        return {
          display: formatGrams(grams),
          raw: null,
          packaging: packagingForGrams(grams),
        };
      }

      if (unitLower === "ml" || unitLower === "l") {
        const ml = unitLower === "l" ? q.value * 1000 : q.value;
        return {
          display: formatMl(ml),
          raw: null,
          packaging: packagingForMl(ml),
        };
      }

      if (PIECE_UNITS.has(unitLower)) {
        const pluralized =
          q.value === 1
            ? unitLower
            : unitLower.endsWith("s")
              ? unitLower
              : unitLower.endsWith("ã") || unitLower.endsWith("ção")
                ? `${unitLower}s`
                : `${unitLower}s`;
        return {
          display: `${trimDecimal(q.value)} ${pluralized}`,
          raw: null,
          packaging: null,
        };
      }

      const factor = COOKING_UNIT_TO_ML[unitLower];
      if (factor !== undefined) {
        const totalMl = roundForDisplay(q.value * factor);
        return {
          display: `~${formatMl(totalMl)}`,
          raw: `${trimDecimal(q.value)} ${q.unit}`,
          packaging: packagingForMl(totalMl),
        };
      }

      return {
        display: `${trimDecimal(q.value)} ${q.unit}`,
        raw: null,
        packaging: null,
      };
    }
    case "mixed":
      return { display: q.parts.join(" + "), raw: null, packaging: null };
    case "free":
      return { display: q.note || "", raw: null, packaging: null };
  }
}

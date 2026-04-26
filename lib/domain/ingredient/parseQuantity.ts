export type ParsedQuantity =
  | { kind: "numeric"; value: number; unit: "g" | "ml" }
  | { kind: "unit"; value: number; label: string }
  | { kind: "free"; raw: string };

const FREE_PATTERNS = [/^a\s+gosto$/i, /^qb$/i, /^q\.?b\.?$/i];

const NUMERIC_RE = /^([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|l|ml)$/i;
const COUNT_UNIT_RE = /^([0-9]+(?:[.,][0-9]+)?)\s+([a-zà-ÿ].*)$/i;

function parseNumber(s: string): number {
  return Number.parseFloat(s.replace(",", "."));
}

export function parseQuantity(raw: string, defaultUnit: string | null): ParsedQuantity {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "free", raw: trimmed };
  if (FREE_PATTERNS.some((re) => re.test(trimmed))) return { kind: "free", raw: trimmed };

  const numeric = NUMERIC_RE.exec(trimmed);
  if (numeric) {
    const value = parseNumber(numeric[1]!);
    const unit = numeric[2]!.toLowerCase();
    if (unit === "kg") return { kind: "numeric", value: value * 1000, unit: "g" };
    if (unit === "g") return { kind: "numeric", value, unit: "g" };
    if (unit === "l") return { kind: "numeric", value: value * 1000, unit: "ml" };
    return { kind: "numeric", value, unit: "ml" };
  }

  const count = COUNT_UNIT_RE.exec(trimmed);
  if (count) {
    const value = parseNumber(count[1]!);
    const label = count[2]!.trim().toLowerCase();
    if (Number.isFinite(value) && value > 0) {
      return { kind: "unit", value, label };
    }
  }

  if (defaultUnit) {
    const onlyNumber = /^([0-9]+(?:[.,][0-9]+)?)$/.exec(trimmed);
    if (onlyNumber) {
      const value = parseNumber(onlyNumber[1]!);
      const lower = defaultUnit.toLowerCase();
      if (lower === "g" || lower === "ml") {
        return { kind: "numeric", value, unit: lower };
      }
      return { kind: "unit", value, label: defaultUnit };
    }
  }

  return { kind: "free", raw: trimmed };
}

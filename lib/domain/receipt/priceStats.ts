export interface PriceObservation {
  purchaseDate: string;
  unitPrice: number | null;
  totalPrice: number;
  rawQuantity: string | null;
}

export type PriceTrend = "up" | "down" | "stable" | "unknown";

export interface PriceStat {
  canonicalName: string;
  observationCount: number;
  lastObservation: PriceObservation;
  avgUnitPrice: number | null;
  minUnitPrice: number | null;
  maxUnitPrice: number | null;
  trend: PriceTrend;
}

const TREND_THRESHOLD = 0.05;
const MIN_OBSERVATIONS_FOR_TREND = 4;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function deriveTrend(sortedDesc: PriceObservation[]): PriceTrend {
  if (sortedDesc.length < MIN_OBSERVATIONS_FOR_TREND) return "unknown";
  const withPrice = sortedDesc.filter((o) => o.unitPrice !== null) as Array<
    PriceObservation & { unitPrice: number }
  >;
  if (withPrice.length < MIN_OBSERVATIONS_FOR_TREND) return "unknown";

  const recent = withPrice.slice(0, 3).map((o) => o.unitPrice);
  const older = withPrice.slice(3).map((o) => o.unitPrice);
  if (older.length === 0) return "unknown";

  const recentAvg = average(recent);
  const olderAvg = average(older);
  if (recentAvg === null || olderAvg === null || olderAvg === 0) return "unknown";

  const diff = (recentAvg - olderAvg) / olderAvg;
  if (diff > TREND_THRESHOLD) return "up";
  if (diff < -TREND_THRESHOLD) return "down";
  return "stable";
}

export function computePriceStats(
  canonicalName: string,
  observations: PriceObservation[],
): PriceStat {
  if (observations.length === 0) {
    throw new Error("computePriceStats requer pelo menos uma observacao.");
  }
  const sorted = [...observations].sort((a, b) =>
    a.purchaseDate < b.purchaseDate ? 1 : a.purchaseDate > b.purchaseDate ? -1 : 0,
  );
  const last = sorted[0]!;

  const unitPrices = sorted
    .map((o) => o.unitPrice)
    .filter((p): p is number => p !== null);

  const avg = unitPrices.length > 0 ? average(unitPrices) : null;
  const min = unitPrices.length > 0 ? Math.min(...unitPrices) : null;
  const max = unitPrices.length > 0 ? Math.max(...unitPrices) : null;

  return {
    canonicalName,
    observationCount: sorted.length,
    lastObservation: last,
    avgUnitPrice: avg,
    minUnitPrice: min,
    maxUnitPrice: max,
    trend: deriveTrend(sorted),
  };
}

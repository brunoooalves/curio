import type { ReceiptRepository } from "@/lib/persistence/repositories/receiptRepository";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";
import {
  computePriceStats,
  type PriceObservation,
  type PriceStat,
} from "./priceStats";

export interface PriceServiceDeps {
  receiptRepository: ReceiptRepository;
}

export interface EstimateLine {
  canonicalName: string;
  estimated: number | null;
  basis: "last" | "avg" | "unknown";
}

export interface EstimateSummary {
  total: number;
  perLine: EstimateLine[];
}

async function statsForName(
  deps: PriceServiceDeps,
  canonicalName: string,
): Promise<PriceStat | null> {
  const obs = await deps.receiptRepository.listItemsByCanonicalName(canonicalName);
  if (obs.length === 0) return null;
  const observations: PriceObservation[] = obs.map(({ item, receipt }) => ({
    purchaseDate: receipt.purchaseDate,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    rawQuantity: item.rawQuantity,
  }));
  return computePriceStats(canonicalName, observations);
}

export async function getStats(
  deps: PriceServiceDeps,
  canonicalName: string,
): Promise<PriceStat | null> {
  return statsForName(deps, canonicalName);
}

export async function listAllStats(deps: PriceServiceDeps): Promise<PriceStat[]> {
  const recent = await deps.receiptRepository.list({ limit: 200 });
  const names = new Set<string>();
  for (const r of recent) {
    for (const item of r.items) {
      if (item.canonicalName) names.add(item.canonicalName);
    }
  }
  const out: PriceStat[] = [];
  for (const name of names) {
    const stat = await statsForName(deps, name);
    if (stat) out.push(stat);
  }
  out.sort((a, b) =>
    a.lastObservation.purchaseDate < b.lastObservation.purchaseDate ? 1 : -1,
  );
  return out;
}

export async function estimateCostForLines(
  deps: PriceServiceDeps,
  lines: ShoppingLine[],
): Promise<EstimateSummary> {
  let total = 0;
  const perLine: EstimateLine[] = [];

  for (const line of lines) {
    if (line.aggregatedQuantity.kind !== "sum") {
      perLine.push({
        canonicalName: line.canonicalName,
        estimated: null,
        basis: "unknown",
      });
      continue;
    }

    const stat = await statsForName(deps, line.canonicalName);
    if (!stat) {
      perLine.push({
        canonicalName: line.canonicalName,
        estimated: null,
        basis: "unknown",
      });
      continue;
    }

    if (stat.lastObservation.unitPrice !== null) {
      const estimated = stat.lastObservation.unitPrice;
      total += estimated;
      perLine.push({ canonicalName: line.canonicalName, estimated, basis: "last" });
      continue;
    }

    if (stat.avgUnitPrice !== null) {
      const estimated = Math.round(stat.avgUnitPrice);
      total += estimated;
      perLine.push({ canonicalName: line.canonicalName, estimated, basis: "avg" });
      continue;
    }

    perLine.push({
      canonicalName: line.canonicalName,
      estimated: null,
      basis: "unknown",
    });
  }

  return { total, perLine };
}

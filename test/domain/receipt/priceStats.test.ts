import { describe, it, expect } from "vitest";
import {
  computePriceStats,
  type PriceObservation,
} from "@/lib/domain/receipt/priceStats";

function obs(date: string, unitPrice: number | null, totalPrice = 599): PriceObservation {
  return { purchaseDate: date, unitPrice, totalPrice, rawQuantity: null };
}

describe("computePriceStats", () => {
  it("throws when there are no observations", () => {
    expect(() => computePriceStats("Tomate", [])).toThrowError(/pelo menos uma/);
  });

  it("returns avg/min/max ignoring null unitPrice", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 500),
      obs("2026-02-01", null),
      obs("2026-03-01", 700),
    ]);
    expect(stat.avgUnitPrice).toBe(600);
    expect(stat.minUnitPrice).toBe(500);
    expect(stat.maxUnitPrice).toBe(700);
    expect(stat.observationCount).toBe(3);
  });

  it("returns null avg/min/max when no observation has unitPrice", () => {
    const stat = computePriceStats("Tomate", [obs("2026-01-01", null), obs("2026-02-01", null)]);
    expect(stat.avgUnitPrice).toBeNull();
    expect(stat.minUnitPrice).toBeNull();
    expect(stat.maxUnitPrice).toBeNull();
  });

  it("lastObservation is the most recent by purchaseDate", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 500),
      obs("2026-03-01", 700),
      obs("2026-02-01", 600),
    ]);
    expect(stat.lastObservation.purchaseDate).toBe("2026-03-01");
    expect(stat.lastObservation.unitPrice).toBe(700);
  });

  it("trend is 'unknown' with fewer than 4 observations", () => {
    expect(
      computePriceStats("Tomate", [
        obs("2026-01-01", 500),
        obs("2026-02-01", 600),
        obs("2026-03-01", 700),
      ]).trend,
    ).toBe("unknown");
  });

  it("trend is 'up' when recent 3 average is >5% above older", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 500),
      obs("2026-01-15", 500),
      obs("2026-02-01", 700),
      obs("2026-02-15", 700),
      obs("2026-03-01", 700),
    ]);
    expect(stat.trend).toBe("up");
  });

  it("trend is 'down' when recent 3 average is >5% below older", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 700),
      obs("2026-01-15", 700),
      obs("2026-02-01", 500),
      obs("2026-02-15", 500),
      obs("2026-03-01", 500),
    ]);
    expect(stat.trend).toBe("down");
  });

  it("trend is 'stable' when within +/-5%", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 500),
      obs("2026-01-15", 510),
      obs("2026-02-01", 495),
      obs("2026-02-15", 505),
      obs("2026-03-01", 500),
    ]);
    expect(stat.trend).toBe("stable");
  });

  it("trend is 'unknown' when fewer than 4 observations have unitPrice", () => {
    const stat = computePriceStats("Tomate", [
      obs("2026-01-01", 500),
      obs("2026-01-15", null),
      obs("2026-02-01", null),
      obs("2026-02-15", null),
      obs("2026-03-01", 700),
    ]);
    expect(stat.trend).toBe("unknown");
  });
});

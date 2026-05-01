import { describe, it, expect } from "vitest";
import { formatCents, parseCents } from "@/lib/domain/format/money";

describe("formatCents", () => {
  it("formats positive values with two decimals", () => {
    expect(formatCents(599)).toBe("R$ 5,99");
    expect(formatCents(0)).toBe("R$ 0,00");
    expect(formatCents(50)).toBe("R$ 0,50");
    expect(formatCents(100)).toBe("R$ 1,00");
  });

  it("inserts thousand separators with dot", () => {
    expect(formatCents(123456)).toBe("R$ 1.234,56");
    expect(formatCents(1000000)).toBe("R$ 10.000,00");
  });

  it("handles negative values", () => {
    expect(formatCents(-599)).toBe("-R$ 5,99");
  });

  it("returns R$ — for non-finite", () => {
    expect(formatCents(Number.NaN)).toBe("R$ —");
    expect(formatCents(Number.POSITIVE_INFINITY)).toBe("R$ —");
  });
});

describe("parseCents", () => {
  it("parses BRL strings with prefix and decimal comma", () => {
    expect(parseCents("R$ 5,99")).toBe(599);
    expect(parseCents("5,99")).toBe(599);
    expect(parseCents("R$ 0,50")).toBe(50);
  });

  it("parses BRL with thousand-separator dots", () => {
    expect(parseCents("R$ 1.234,56")).toBe(123456);
    expect(parseCents("1.234,56")).toBe(123456);
  });

  it("parses dot-decimal forms", () => {
    expect(parseCents("5.99")).toBe(599);
    expect(parseCents("1,234.56")).toBe(123456);
  });

  it("treats integer-only values as whole reais", () => {
    expect(parseCents("5")).toBe(500);
    expect(parseCents("R$ 12")).toBe(1200);
  });

  it("handles negatives", () => {
    expect(parseCents("-5,99")).toBe(-599);
  });

  it("rejects empty or unparseable input", () => {
    expect(() => parseCents("")).toThrowError(/vazia/);
    expect(() => parseCents("  ")).toThrowError(/vazia/);
    expect(() => parseCents("abc")).toThrowError(/interpretar/);
    expect(() => parseCents("5,9999")).toThrowError(/interpretar/);
  });
});

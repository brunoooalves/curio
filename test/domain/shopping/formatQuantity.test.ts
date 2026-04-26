import { describe, it, expect } from "vitest";
import { formatQuantity } from "@/lib/domain/shopping/formatQuantity";

describe("formatQuantity", () => {
  it("formats grams under 1000 as g and >=1000 as kg", () => {
    expect(formatQuantity({ kind: "sum", value: 200, unit: "g" })).toBe("200 g");
    expect(formatQuantity({ kind: "sum", value: 1000, unit: "g" })).toBe("1 kg");
    expect(formatQuantity({ kind: "sum", value: 1500, unit: "g" })).toBe("1.5 kg");
    expect(formatQuantity({ kind: "sum", value: 1234, unit: "g" })).toBe("1.23 kg");
  });

  it("formats ml under 1000 as ml and >=1000 as L", () => {
    expect(formatQuantity({ kind: "sum", value: 300, unit: "ml" })).toBe("300 ml");
    expect(formatQuantity({ kind: "sum", value: 1500, unit: "ml" })).toBe("1.5 L");
  });

  it("formats unit-labelled quantities verbatim", () => {
    expect(formatQuantity({ kind: "sum", value: 5, unit: "unidade" })).toBe("5 unidade");
    expect(formatQuantity({ kind: "sum", value: 1, unit: "colher de sopa" })).toBe(
      "1 colher de sopa",
    );
  });

  it("joins mixed parts with ' + '", () => {
    expect(
      formatQuantity({ kind: "mixed", parts: ["200 g", "1 colher de sopa"] }),
    ).toBe("200 g + 1 colher de sopa");
  });

  it("returns the free note as-is", () => {
    expect(formatQuantity({ kind: "free", note: "a gosto" })).toBe("a gosto");
    expect(formatQuantity({ kind: "free", note: "" })).toBe("");
  });
});

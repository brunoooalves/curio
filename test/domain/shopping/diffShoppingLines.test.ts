import { describe, it, expect } from "vitest";
import { diffShoppingLines } from "@/lib/domain/shopping/diffShoppingLines";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";

function line(name: string, qty: ShoppingLine["aggregatedQuantity"], ids: string[] = []): ShoppingLine {
  return { canonicalName: name, aggregatedQuantity: qty, sourceRecipeIds: ids };
}

describe("diffShoppingLines", () => {
  it("detects added items", () => {
    const out = diffShoppingLines([], [line("Tomate", { kind: "sum", value: 200, unit: "g" })]);
    expect(out.added).toHaveLength(1);
    expect(out.removed).toHaveLength(0);
    expect(out.changed).toHaveLength(0);
  });

  it("detects removed items", () => {
    const out = diffShoppingLines([line("Tomate", { kind: "sum", value: 200, unit: "g" })], []);
    expect(out.removed).toHaveLength(1);
  });

  it("detects changed quantities (numeric)", () => {
    const before = [line("Tomate", { kind: "sum", value: 200, unit: "g" })];
    const after = [line("Tomate", { kind: "sum", value: 500, unit: "g" })];
    const out = diffShoppingLines(before, after);
    expect(out.changed).toHaveLength(1);
    expect(out.unchanged).toHaveLength(0);
    expect(out.changed[0]?.before.aggregatedQuantity).toEqual({
      kind: "sum",
      value: 200,
      unit: "g",
    });
  });

  it("detects unchanged when quantities equal exactly", () => {
    const before = [line("Tomate", { kind: "sum", value: 200, unit: "g" })];
    const after = [line("Tomate", { kind: "sum", value: 200, unit: "g" })];
    const out = diffShoppingLines(before, after);
    expect(out.unchanged).toHaveLength(1);
    expect(out.changed).toHaveLength(0);
  });

  it("detects changed when kind differs", () => {
    const before = [line("Sal", { kind: "sum", value: 5, unit: "g" })];
    const after = [line("Sal", { kind: "free", note: "a gosto" })];
    const out = diffShoppingLines(before, after);
    expect(out.changed).toHaveLength(1);
  });

  it("compares mixed quantities by sorted parts", () => {
    const before = [
      line("Tomate", { kind: "mixed", parts: ["200 g", "1 colher"] }),
    ];
    const after = [
      line("Tomate", { kind: "mixed", parts: ["1 colher", "200 g"] }),
    ];
    const out = diffShoppingLines(before, after);
    expect(out.unchanged).toHaveLength(1);
  });

  it("handles full mixed scenario (added/removed/changed/unchanged)", () => {
    const before = [
      line("Tomate", { kind: "sum", value: 200, unit: "g" }),
      line("Sal", { kind: "free", note: "a gosto" }),
      line("Cebola", { kind: "sum", value: 1, unit: "unidade" }),
    ];
    const after = [
      line("Tomate", { kind: "sum", value: 500, unit: "g" }), // changed
      line("Sal", { kind: "free", note: "a gosto" }), // unchanged
      line("Manjericao", { kind: "free", note: "a gosto" }), // added
      // Cebola removed
    ];
    const out = diffShoppingLines(before, after);
    expect(out.added.map((l) => l.canonicalName)).toEqual(["Manjericao"]);
    expect(out.removed.map((l) => l.canonicalName)).toEqual(["Cebola"]);
    expect(out.changed.map((c) => c.after.canonicalName)).toEqual(["Tomate"]);
    expect(out.unchanged.map((l) => l.canonicalName)).toEqual(["Sal"]);
  });
});

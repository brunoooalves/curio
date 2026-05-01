import { describe, it, expect } from "vitest";
import { buildExtractReceiptPrompt } from "@/lib/llm/prompts/extractReceipt";

describe("buildExtractReceiptPrompt", () => {
  const prompt = buildExtractReceiptPrompt();

  it("instructs cents-as-integers conversion", () => {
    expect(prompt).toMatch(/centavos inteiros/);
    expect(prompt).toMatch(/4780/);
  });

  it("forbids subtotals/discounts/totals as items", () => {
    expect(prompt).toMatch(/subtotal/i);
    expect(prompt).toMatch(/desconto/i);
    expect(prompt).toMatch(/total geral/i);
    expect(prompt).toMatch(/imposto/i);
  });

  it("requires ISO date or null", () => {
    expect(prompt).toMatch(/YYYY-MM-DD/);
    expect(prompt).toMatch(/null/);
  });

  it("describes item fields", () => {
    expect(prompt).toMatch(/rawName/);
    expect(prompt).toMatch(/rawQuantity/);
    expect(prompt).toMatch(/unitPrice/);
    expect(prompt).toMatch(/totalPrice/);
  });

  it("mentions the store field", () => {
    expect(prompt).toMatch(/mercado/i);
  });
});

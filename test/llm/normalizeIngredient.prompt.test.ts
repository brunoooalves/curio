import { describe, it, expect } from "vitest";
import { buildNormalizeIngredientsPrompt } from "@/lib/llm/prompts/normalizeIngredient";

describe("buildNormalizeIngredientsPrompt", () => {
  it("includes input names with explicit numbering", () => {
    const out = buildNormalizeIngredientsPrompt(["tomate cereja", "manjericao"]);
    expect(out).toContain("1. tomate cereja");
    expect(out).toContain("2. manjericao");
    expect(out).toContain("(2 ingredientes)");
  });

  it("instructs the model to keep order identical", () => {
    const out = buildNormalizeIngredientsPrompt(["sal"]);
    expect(out).toContain("ordem da resposta DEVE ser idêntica");
  });

  it("biases toward market-friendly units (ml/g/unidade)", () => {
    const out = buildNormalizeIngredientsPrompt(["azeite"]);
    expect(out).toMatch(/MERCADO/);
    expect(out).toMatch(/Prefira "ml" e "g"/);
    expect(out).toMatch(/Líquidos.*"ml"/);
    expect(out).toMatch(/contáveis no mercado/);
  });
});

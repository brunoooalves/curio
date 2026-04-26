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
    expect(out).toContain("ordem da resposta DEVE ser identica");
  });

  it("hints the unit selection rules", () => {
    const out = buildNormalizeIngredientsPrompt(["coentro"]);
    expect(out).toMatch(/tempero\/erva/);
    expect(out).toMatch(/liquido/);
  });
});

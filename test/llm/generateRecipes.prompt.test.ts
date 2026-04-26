import { describe, it, expect } from "vitest";
import { buildGenerateRecipesPrompt } from "@/lib/llm/prompts/generateRecipes";
import type { Module } from "@/lib/domain/curriculum/types";
import type { GenerationContext } from "@/lib/domain/generation/types";

const mod: Module = {
  id: "m1",
  weekNumber: 1,
  title: "Cortes e mise en place",
  description: "Semana 1.",
  prerequisites: [],
  concepts: [
    { id: "c1.1", title: "Mise en place", description: "Organizar antes", difficulty: 1 },
  ],
};

function emptyCtx(overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    restrictions: [],
    dislikes: [],
    preferences: [],
    abundantIngredients: [],
    servings: 2,
    ...overrides,
  };
}

describe("buildGenerateRecipesPrompt", () => {
  it("includes module info, count, and servings", () => {
    const out = buildGenerateRecipesPrompt(mod, 4, emptyCtx());
    expect(out).toContain("Semana 1 — Cortes e mise en place");
    expect(out).toContain("gere 4 receitas");
    expect(out).toContain("Porcoes: 2.");
    expect(out).toContain("c1.1");
  });

  it("omits empty sections (restrictions/dislikes/preferences/abundant)", () => {
    const out = buildGenerateRecipesPrompt(mod, 4, emptyCtx());
    expect(out).not.toContain("Restricoes alimentares");
    expect(out).not.toContain("Aversoes");
    expect(out).not.toContain("Preferencias");
    expect(out).not.toContain("Ingredientes em abundancia");
  });

  it("includes restrictions when present", () => {
    const out = buildGenerateRecipesPrompt(
      mod,
      4,
      emptyCtx({ restrictions: ["sem gluten", "lactose"] }),
    );
    expect(out).toContain("Restricoes alimentares");
    expect(out).toContain("- sem gluten");
    expect(out).toContain("- lactose");
  });

  it("includes dislikes, preferences, and abundant ingredients when present", () => {
    const out = buildGenerateRecipesPrompt(
      mod,
      2,
      emptyCtx({
        dislikes: ["coentro"],
        preferences: ["picante"],
        abundantIngredients: ["abobrinha"],
      }),
    );
    expect(out).toContain("Aversoes");
    expect(out).toContain("- coentro");
    expect(out).toContain("Preferencias");
    expect(out).toContain("- picante");
    expect(out).toContain("Ingredientes em abundancia");
    expect(out).toContain("- abobrinha");
  });

  it("propagates servings into both summary and rules", () => {
    const out = buildGenerateRecipesPrompt(mod, 1, emptyCtx({ servings: 6 }));
    expect(out).toContain("Porcoes: 6.");
    expect(out).toContain('"servings" deve ser 6.');
  });
});

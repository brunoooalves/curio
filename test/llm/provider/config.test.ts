import { describe, it, expect } from "vitest";
import {
  MODELS_BY_PROVIDER,
  UnknownLlmProviderError,
  modelIdFor,
  resolveProvider,
} from "@/lib/llm/provider/config";

describe("resolveProvider", () => {
  it("defaults to openai when LLM_PROVIDER is unset", () => {
    expect(resolveProvider({})).toBe("openai");
    expect(resolveProvider({ LLM_PROVIDER: "" })).toBe("openai");
    expect(resolveProvider({ LLM_PROVIDER: "   " })).toBe("openai");
  });

  it("accepts 'openai' and 'anthropic' (case-insensitive, trimmed)", () => {
    expect(resolveProvider({ LLM_PROVIDER: "openai" })).toBe("openai");
    expect(resolveProvider({ LLM_PROVIDER: "Anthropic" })).toBe(
      "anthropic",
    );
    expect(resolveProvider({ LLM_PROVIDER: "  ANTHROPIC  " })).toBe(
      "anthropic",
    );
  });

  it("throws a readable error on unknown provider", () => {
    expect(() =>
      resolveProvider({ LLM_PROVIDER: "gemini" }),
    ).toThrowError(UnknownLlmProviderError);
    expect(() =>
      resolveProvider({ LLM_PROVIDER: "gemini" }),
    ).toThrowError(/openai.*anthropic/i);
  });
});

describe("modelIdFor", () => {
  it("maps each task for openai", () => {
    expect(modelIdFor("openai", "recipe_generation")).toBe("gpt-4.1");
    expect(modelIdFor("openai", "ingredient_normalization")).toBe("gpt-4.1-mini");
    expect(modelIdFor("openai", "receipt_vision")).toBe("gpt-4.1");
  });

  it("maps each task for anthropic", () => {
    expect(modelIdFor("anthropic", "recipe_generation")).toBe("claude-sonnet-4-5");
    expect(modelIdFor("anthropic", "ingredient_normalization")).toBe(
      "claude-haiku-4-5",
    );
    expect(modelIdFor("anthropic", "receipt_vision")).toBe("claude-sonnet-4-5");
  });

  it("MODELS_BY_PROVIDER covers all task names for both providers", () => {
    const tasks = ["recipe_generation", "ingredient_normalization", "receipt_vision"] as const;
    for (const provider of ["openai", "anthropic"] as const) {
      for (const task of tasks) {
        expect(typeof MODELS_BY_PROVIDER[provider][task]).toBe("string");
      }
    }
  });
});

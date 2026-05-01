import { z } from "zod";
import type { LlmTaskName, ProviderName } from "./types";

export const DEFAULT_PROVIDER: ProviderName = "openai";

export const MODELS_BY_PROVIDER: Record<ProviderName, Record<LlmTaskName, string>> = {
  openai: {
    recipe_generation: "gpt-4.1",
    ingredient_normalization: "gpt-4.1-mini",
    receipt_vision: "gpt-4.1",
  },
  anthropic: {
    recipe_generation: "claude-sonnet-4-5",
    ingredient_normalization: "claude-haiku-4-5",
    receipt_vision: "claude-sonnet-4-5",
  },
};

const providerSchema = z.enum(["openai", "anthropic"]);

export class UnknownLlmProviderError extends Error {
  constructor(received: string) {
    super(
      `LLM_PROVIDER invalido: "${received}". Use "openai" ou "anthropic".`,
    );
    this.name = "UnknownLlmProviderError";
  }
}

export type EnvLike = Partial<Record<string, string | undefined>>;

export function resolveProvider(env: EnvLike): ProviderName {
  const raw = env.LLM_PROVIDER?.toLowerCase().trim();
  if (!raw) return DEFAULT_PROVIDER;
  const result = providerSchema.safeParse(raw);
  if (!result.success) {
    throw new UnknownLlmProviderError(raw);
  }
  return result.data;
}

export function modelIdFor(provider: ProviderName, task: LlmTaskName): string {
  return MODELS_BY_PROVIDER[provider][task];
}

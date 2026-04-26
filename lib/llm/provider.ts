import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type LlmProvider = "openai" | "anthropic";

const DEFAULT_PROVIDER: LlmProvider = "openai";

const DEFAULT_MODELS: Record<LlmProvider, { rich: string; light: string }> = {
  openai: { rich: "gpt-4o", light: "gpt-4o-mini" },
  anthropic: { rich: "claude-sonnet-4-5", light: "claude-haiku-4-5" },
};

function resolveProvider(): LlmProvider {
  const raw = process.env.LLM_PROVIDER?.toLowerCase().trim();
  if (raw === "openai" || raw === "anthropic") return raw;
  return DEFAULT_PROVIDER;
}

export function getRichModel(): LanguageModel {
  const provider = resolveProvider();
  const modelId = DEFAULT_MODELS[provider].rich;
  return provider === "openai" ? openai(modelId) : anthropic(modelId);
}

export function getLightModel(): LanguageModel {
  const provider = resolveProvider();
  const modelId = DEFAULT_MODELS[provider].light;
  return provider === "openai" ? openai(modelId) : anthropic(modelId);
}

export function getActiveProvider(): LlmProvider {
  return resolveProvider();
}

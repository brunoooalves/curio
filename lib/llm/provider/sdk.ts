import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { modelIdFor, resolveProvider } from "./config";
import type { LlmTaskName, ProviderName } from "./types";

const cache = new Map<string, LanguageModel>();

function instantiate(provider: ProviderName, modelId: string): LanguageModel {
  return provider === "openai" ? openai(modelId) : anthropic(modelId);
}

export function getModel(task: LlmTaskName): LanguageModel {
  const provider = resolveProvider(process.env);
  const modelId = modelIdFor(provider, task);
  const key = `${provider}/${modelId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const fresh = instantiate(provider, modelId);
  cache.set(key, fresh);
  return fresh;
}

export function getCurrentProviderTag(task: LlmTaskName): string {
  const provider = resolveProvider(process.env);
  return `${provider}/${modelIdFor(provider, task)}`;
}

export function getActiveProvider(): ProviderName {
  return resolveProvider(process.env);
}

import { z } from "zod";
import { generateObject } from "ai";
import { getModel } from "@/lib/llm/provider/sdk";
import type { IngredientRepository } from "@/lib/persistence/repositories/ingredientRepository";
import { buildNormalizeIngredientsPrompt } from "@/lib/llm/prompts/normalizeIngredient";

export interface NormalizedResult {
  canonical: string;
  defaultUnit: string | null;
}

const responseSchema = z.object({
  ingredients: z.array(
    z.object({
      canonicalName: z.string().min(1),
      defaultUnit: z.string().min(1).nullable(),
    }),
  ),
});

export type NormalizeIngredientsFn = (
  rawNames: string[],
) => Promise<Map<string, NormalizedResult>>;

export function createNormalizer(repository: IngredientRepository): NormalizeIngredientsFn {
  return async function normalizeIngredients(rawNames: string[]) {
    const result = new Map<string, NormalizedResult>();
    const seen = new Set<string>();
    const queue: string[] = [];

    for (const raw of rawNames) {
      const trimmed = raw.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      const cached = await repository.findByAlias(trimmed);
      if (cached) {
        result.set(trimmed, {
          canonical: cached.canonicalName,
          defaultUnit: cached.defaultUnit,
        });
      } else {
        queue.push(trimmed);
      }
    }

    if (queue.length === 0) return result;

    const prompt = buildNormalizeIngredientsPrompt(queue);
    const { object } = await generateObject({
      model: getModel("ingredient_normalization"),
      schema: responseSchema,
      prompt,
    });

    const responses = object.ingredients;
    if (responses.length !== queue.length) {
      throw new Error(
        `LLM retornou ${responses.length} normalizacoes, esperado ${queue.length}.`,
      );
    }

    for (let i = 0; i < queue.length; i++) {
      const raw = queue[i]!;
      const out = responses[i]!;
      const persisted = await repository.upsert(out.canonicalName, [raw], out.defaultUnit);
      result.set(raw, {
        canonical: persisted.canonicalName,
        defaultUnit: persisted.defaultUnit,
      });
    }

    return result;
  };
}

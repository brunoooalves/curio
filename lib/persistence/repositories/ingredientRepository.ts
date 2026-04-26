import type { NormalizedIngredient } from "@/lib/domain/ingredient/types";

export interface IngredientRepository {
  findByAlias(alias: string): Promise<NormalizedIngredient | null>;
  findByCanonical(canonicalName: string): Promise<NormalizedIngredient | null>;
  upsert(
    canonicalName: string,
    aliasesToAdd: string[],
    defaultUnit?: string | null,
  ): Promise<NormalizedIngredient>;
  list(): Promise<NormalizedIngredient[]>;
}

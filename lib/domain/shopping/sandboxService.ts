import type { Batch } from "@/lib/domain/batch/types";
import type { MealType, Recipe } from "@/lib/domain/recipe/types";
import type { GenerationContext } from "@/lib/domain/generation/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import { computeShoppingLines, type NormalizeFn } from "./computeShoppingLines";
import { diffShoppingLines, type ShoppingLineDiff } from "./diffShoppingLines";
import type { ShoppingLine } from "./aggregate";
import {
  createBatch as batchServiceCreateBatch,
  type BatchServiceDeps,
} from "@/lib/domain/batch/batchService";

export interface SandboxDeps {
  batchRepository: BatchRepository;
  recipeRepository: RecipeRepository;
  normalize: NormalizeFn;
}

async function loadRecipes(
  repo: RecipeRepository,
  ids: string[],
): Promise<Recipe[]> {
  const out: Recipe[] = [];
  for (const id of ids) {
    const r = await repo.findById(id);
    if (r) out.push(r);
  }
  return out;
}

export async function previewShoppingList(
  deps: Pick<SandboxDeps, "recipeRepository" | "normalize">,
  recipeIds: string[],
): Promise<ShoppingLine[]> {
  const recipes = await loadRecipes(deps.recipeRepository, recipeIds);
  return computeShoppingLines(recipes, deps.normalize);
}

const NO_OP_GENERATOR = {
  async generateRecipesForModule() {
    return [];
  },
};

export interface ApplyAsBatchDeps extends BatchServiceDeps {
  recipeRepository: RecipeRepository;
}

export async function applyAsBatch(
  deps: ApplyAsBatchDeps,
  recipeIds: string[],
  generationContext: GenerationContext,
): Promise<Batch> {
  const recipes = await loadRecipes(deps.recipeRepository, recipeIds);
  if (recipes.length === 0) {
    throw new Error("Selecione ao menos uma receita para aplicar como plano.");
  }
  const mealsByType: Record<MealType, number> = {
    cafe: 0,
    almoco: 0,
    jantar: 0,
    lanche: 0,
  };
  for (const r of recipes) mealsByType[r.mealType]++;

  return batchServiceCreateBatch(
    {
      ...deps,
      recipeGenerator: NO_OP_GENERATOR,
      currentModuleId: deps.currentModuleId,
      completedModuleIds: deps.completedModuleIds,
    },
    {
      mealsByType,
      generationContext,
    },
  );
}

export interface PreviewReplacementResult {
  before: ShoppingLine[];
  after: ShoppingLine[];
  diff: ShoppingLineDiff;
}

export async function previewReplacement(
  deps: SandboxDeps,
  batchId: string,
  itemId: string,
  candidateRecipeId: string,
): Promise<PreviewReplacementResult> {
  const batch = await deps.batchRepository.findById(batchId);
  if (!batch) throw new Error(`Plano "${batchId}" não encontrado.`);
  const item = batch.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item "${itemId}" não encontrado no plano.`);

  const pendingRecipeIds = batch.items
    .filter((i) => i.status === "pending")
    .map((i) => i.recipeId);
  const beforeRecipes = await loadRecipes(deps.recipeRepository, pendingRecipeIds);

  const candidate = await deps.recipeRepository.findById(candidateRecipeId);
  if (!candidate) {
    throw new Error(`Receita "${candidateRecipeId}" nao encontrada.`);
  }

  const afterRecipes = beforeRecipes.map((r) => (r.id === item.recipeId ? candidate : r));
  if (item.status !== "pending") {
    afterRecipes.push(candidate);
  }

  const before = await computeShoppingLines(beforeRecipes, deps.normalize);
  const after = await computeShoppingLines(afterRecipes, deps.normalize);
  return { before, after, diff: diffShoppingLines(before, after) };
}

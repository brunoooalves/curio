import Link from "next/link";
import {
  getBatchRepository,
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { SandboxView } from "@/components/sandbox-view";
import type { Recipe } from "@/lib/domain/recipe/types";

export const dynamic = "force-dynamic";

interface RecipeOption {
  id: string;
  title: string;
  mealType: Recipe["mealType"];
  difficulty: number;
  estimatedMinutes: number;
}

function toOption(recipe: Recipe): RecipeOption {
  return {
    id: recipe.id,
    title: recipe.title,
    mealType: recipe.mealType,
    difficulty: recipe.difficulty,
    estimatedMinutes: recipe.estimatedMinutes,
  };
}

export default async function SimularPage({
  searchParams,
}: {
  searchParams: Promise<{ fromBatch?: string }>;
}) {
  const { fromBatch } = await searchParams;
  const recipeRepo = await getRecipeRepository();
  const userRepo = await getUserStateRepository();
  const batchRepo = await getBatchRepository();
  const state = await getCurrentState(userRepo);

  const moduleIds = Array.from(
    new Set([state.currentModuleId, ...state.completedModuleIds]),
  );

  const recipes: Recipe[] = [];
  for (const moduleId of moduleIds) {
    const list = await recipeRepo.findByModuleId(moduleId, {
      excludeStatuses: ["rejeitada"],
    });
    recipes.push(...list);
  }

  let initialSelection: string[] = [];
  if (fromBatch) {
    const batch = await batchRepo.findById(fromBatch);
    if (batch) {
      initialSelection = batch.items
        .filter((i) => i.status === "pending")
        .map((i) => i.recipeId);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/lista" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Simular</h1>
        <p className="text-sm text-muted-foreground">
          Combine receitas e veja a lista resultante. Nada é persistido até aplicar como lote.
        </p>
      </header>
      <SandboxView
        recipes={recipes.map(toOption)}
        initialSelection={initialSelection}
      />
    </main>
  );
}

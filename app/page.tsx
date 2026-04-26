import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  findModuleById,
  getGastronomiaCurriculum,
} from "@/lib/domain/curriculum/loadGastronomia";
import { getRecipesForModule } from "@/lib/domain/recipe/recipeService";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import {
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { GenerateMoreButton } from "@/components/generate-more-button";
import { CompleteModuleButton } from "@/components/complete-module-button";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { Concept, Module } from "@/lib/domain/curriculum/types";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Cafe da manha",
  almoco: "Almoco",
  jantar: "Jantar",
  lanche: "Lanche",
};

export default async function HomePage() {
  const curriculum = getGastronomiaCurriculum();
  const userStateRepo = await getUserStateRepository();
  const userState = await getCurrentState(userStateRepo);

  const mod = findModuleById(curriculum, userState.currentModuleId);
  if (!mod) {
    return (
      <main className="p-6">
        <p>Modulo &quot;{userState.currentModuleId}&quot; nao encontrado no curriculo.</p>
      </main>
    );
  }

  const recipeRepo = await getRecipeRepository();
  const ctx = buildGenerationContext(userState.profile);
  const recipes = await getRecipesForModule(recipeRepo, recipeGenerator, mod, ctx);
  const rejected = await recipeRepo.findByStatus("rejeitada", { moduleId: mod.id });

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6 max-w-2xl mx-auto w-full">
      <ModuleHeader mod={mod} />
      <CompleteModuleButton moduleId={mod.id} />
      <ConceptsList concepts={mod.concepts} />
      <RecipesList recipes={recipes} />
      <GenerateMoreButton moduleId={mod.id} />
      {rejected.length > 0 && (
        <Link
          href="/receitas/rejeitadas"
          className="text-center text-sm text-muted-foreground hover:underline"
        >
          Ver receitas rejeitadas ({rejected.length})
        </Link>
      )}
      <Link
        href="/modulos"
        className="text-center text-sm text-muted-foreground hover:underline"
      >
        Ver todos os modulos →
      </Link>
    </main>
  );
}

function ModuleHeader({ mod }: { mod: Module }) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-sm uppercase tracking-wider text-muted-foreground">
        Semana {mod.weekNumber}
      </p>
      <h1 className="text-3xl font-semibold leading-tight">{mod.title}</h1>
      <p className="text-base text-muted-foreground">{mod.description}</p>
    </header>
  );
}

function ConceptsList({ concepts }: { concepts: Concept[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Conceitos da semana</h2>
      <ul className="flex flex-col gap-3">
        {concepts.map((concept) => (
          <Card key={concept.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-base">{concept.title}</CardTitle>
              <Badge variant="secondary">Dif. {concept.difficulty}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{concept.description}</p>
            </CardContent>
          </Card>
        ))}
      </ul>
    </section>
  );
}

function RecipesList({ recipes }: { recipes: Recipe[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Receitas sugeridas ({recipes.length})</h2>
      {recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda nao ha receitas. Use o botao abaixo para gerar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/receita/${recipe.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <CardTitle className="text-base">{recipe.title}</CardTitle>
                    <Badge variant="outline">Dif. {recipe.difficulty}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{MEAL_LABEL[recipe.mealType]}</Badge>
                    <span>~{recipe.estimatedMinutes} min</span>
                    <span>{recipe.servings} porc.</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
import { GenerateRecipesDialog } from "@/components/generate-recipes-dialog";
import { listContexts } from "@/lib/domain/context/contextService";
import {
  getBatchRepository,
  getDietaryContextRepository,
} from "@/lib/persistence/mongo/factories";
import {
  getActiveBatch,
  nextSuggestion,
} from "@/lib/domain/batch/batchService";
import { CompleteModuleButton } from "@/components/complete-module-button";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { Concept, Module } from "@/lib/domain/curriculum/types";
import type { UserProfile } from "@/lib/domain/user/types";
import { plural } from "@/lib/format/plural";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
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
        <p>Módulo &quot;{userState.currentModuleId}&quot; não encontrado no currículo.</p>
      </main>
    );
  }

  const recipeRepo = await getRecipeRepository();
  const ctxRepo = await getDietaryContextRepository();
  const batchRepo = await getBatchRepository();
  const ctx = buildGenerationContext(userState.profile);
  const recipes = await getRecipesForModule(recipeRepo, recipeGenerator, mod, ctx);
  const rejected = await recipeRepo.findByStatus("rejeitada", { moduleId: mod.id });
  const savedContexts = await listContexts(ctxRepo);
  const activeBatch = await getActiveBatch({ batchRepository: batchRepo });
  const next = activeBatch ? nextSuggestion(activeBatch) : null;
  const nextRecipe = next ? await recipeRepo.findById(next.recipeId) : null;

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6 max-w-2xl mx-auto w-full">
      <ModuleHeader mod={mod} />
      <ProfileSummary profile={userState.profile} contextsCount={savedContexts.length} />
      <BatchSummary
        active={activeBatch !== null}
        nextOrder={next?.suggestedOrder ?? null}
        nextMealType={next?.mealType ?? null}
        nextTitle={nextRecipe?.title ?? null}
      />
      <CompleteModuleButton moduleId={mod.id} />
      <ConceptsList concepts={mod.concepts} />
      <RecipesList recipes={recipes} />
      <GenerateRecipesDialog
        moduleId={mod.id}
        profile={userState.profile}
        contexts={savedContexts}
      />
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
        Ver todos os módulos →
      </Link>
    </main>
  );
}

function ModuleHeader({ mod }: { mod: Module }) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Semana {mod.weekNumber}
      </p>
      <h1 className="text-3xl font-semibold leading-tight">{mod.title}</h1>
      <p className="text-base text-muted-foreground">{mod.description}</p>
    </header>
  );
}

function BatchSummary({
  active,
  nextOrder,
  nextMealType,
  nextTitle,
}: {
  active: boolean;
  nextOrder: number | null;
  nextMealType: Recipe["mealType"] | null;
  nextTitle: string | null;
}) {
  if (!active) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 flex items-center justify-between gap-3">
        <p className="text-sm">Sem lote em andamento.</p>
        <Link href="/lote/novo" className="text-sm font-medium underline">
          Criar lote
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-4 flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Próxima sugestão
      </p>
      {nextOrder !== null && nextTitle ? (
        <p className="text-base">
          #{nextOrder} ·{" "}
          {nextMealType ? MEAL_LABEL[nextMealType] : ""} · {nextTitle}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Lote em andamento sem itens a fazer no momento.
        </p>
      )}
      <div className="flex items-center gap-3">
        <Link href="/lote" className="text-sm font-medium underline">
          Ver lote
        </Link>
      </div>
    </div>
  );
}

function ProfileSummary({
  profile,
  contextsCount,
}: {
  profile: UserProfile;
  contextsCount: number;
}) {
  const totalProfileTags =
    profile.restrictions.length +
    profile.dislikes.length +
    profile.preferences.length +
    profile.abundantIngredients.length;

  if (totalProfileTags === 0 && contextsCount === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground flex flex-col gap-1">
        <p>Sem perfil ou contextos configurados ainda.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/perfil" className="underline">
            Configurar perfil
          </Link>
          <Link href="/contextos" className="underline">
            Criar contexto
          </Link>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        Perfil: {plural(profile.restrictions.length, "restrição", "restrições")},{" "}
        {plural(profile.preferences.length, "preferência", "preferências")}
      </span>
      <Link href="/perfil" className="underline">
        editar
      </Link>
      <span aria-hidden>·</span>
      <Link href="/contextos" className="underline">
        Contextos salvos ({contextsCount})
      </Link>
    </p>
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
                    <span>{plural(recipe.servings, "porção", "porções")}</span>
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

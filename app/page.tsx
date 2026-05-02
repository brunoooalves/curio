import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  findModuleById,
  getGastronomiaCurriculum,
} from "@/lib/domain/curriculum/loadGastronomia";
import {
  getRecipeRepository,
  getUserStateRepository,
  getBatchRepository,
  getDietaryContextRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { listContexts } from "@/lib/domain/context/contextService";
import {
  getActiveBatch,
  nextSuggestion,
} from "@/lib/domain/batch/batchService";
import { findNextAvailableModule } from "@/lib/domain/user/progression";
import { AdvanceWeekDialog } from "@/components/advance-week-dialog";
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
  const savedContexts = await listContexts(ctxRepo);
  const activeBatch = await getActiveBatch({ batchRepository: batchRepo });
  const next = activeBatch ? nextSuggestion(activeBatch) : null;
  const nextRecipe = next ? await recipeRepo.findById(next.recipeId) : null;
  const totalItems = activeBatch?.items.length ?? 0;
  const doneItems =
    activeBatch?.items.filter((i) => i.status === "done").length ?? 0;
  const nextModule = findNextAvailableModule(
    userState,
    curriculum,
    mod.weekNumber,
  );

  return (
    <main className="flex flex-1 flex-col gap-7 px-4 py-6 max-w-2xl mx-auto w-full">
      <ModuleHeader mod={mod} />

      {activeBatch && next && nextRecipe ? (
        <ActiveBatchCard
          nextOrder={next.suggestedOrder}
          nextMealType={next.mealType}
          nextRecipe={nextRecipe}
          done={doneItems}
          total={totalItems}
        />
      ) : (
        <EmptyBatchCard />
      )}

      <ConceptsList concepts={mod.concepts} />

      <AdvanceWeekDialog
        moduleId={mod.id}
        weekNumber={mod.weekNumber}
        moduleTitle={mod.title}
        hasNextModule={nextModule !== null}
      />

      <ProfileSummary
        profile={userState.profile}
        contextsCount={savedContexts.length}
      />
    </main>
  );
}

function ModuleHeader({ mod }: { mod: Module }) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        Semana {mod.weekNumber} · Gastronomia
      </p>
      <h1 className="text-3xl font-semibold leading-tight">{mod.title}</h1>
      <p className="text-base text-muted-foreground">{mod.description}</p>
    </header>
  );
}

function EmptyBatchCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>🥕</span>
          <div className="flex flex-col">
            <p className="font-medium">Comece um plano desta semana</p>
            <p className="text-sm text-muted-foreground">
              Diga quantas refeições; o app monta a lista de compras.
            </p>
          </div>
        </div>
        <Link href="/plano/novo" className="contents">
          <Button type="button" className="w-full">Criar plano</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ActiveBatchCard({
  nextOrder,
  nextMealType,
  nextRecipe,
  done,
  total,
}: {
  nextOrder: number;
  nextMealType: Recipe["mealType"];
  nextRecipe: Recipe;
  done: number;
  total: number;
}) {
  const progress = total > 0 ? (done / total) * 100 : 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Plano em andamento</Badge>
          <span className="text-sm text-muted-foreground">
            {done} de {total} feitos
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Próxima sugestão
          </p>
          <p className="font-medium">
            #{nextOrder} · {MEAL_LABEL[nextMealType]} · {nextRecipe.title}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            <span>⏱ {nextRecipe.estimatedMinutes} min</span>
            <span>
              👥 {nextRecipe.servings}{" "}
              {nextRecipe.servings === 1 ? "porção" : "porções"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/plano" className="flex-1">
            <Button type="button" className="w-full">
              Continuar plano
            </Button>
          </Link>
          <Link href="/lista">
            <Button type="button" variant="outline">
              Lista
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
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
        Perfil:{" "}
        {plural(profile.restrictions.length, "restrição", "restrições")},{" "}
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
    <details className="group" open>
      <summary className="flex cursor-pointer items-center justify-between list-none">
        <h2 className="text-lg font-medium">Conceitos da semana</h2>
        <span className="text-sm text-muted-foreground">
          {concepts.length}{" "}
          <span aria-hidden className="ml-1 transition-transform group-open:rotate-180 inline-block">
            ⌄
          </span>
        </span>
      </summary>
      <ul className="flex flex-col gap-3 mt-3">
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
    </details>
  );
}

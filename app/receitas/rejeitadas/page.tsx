import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { RecipeActions } from "@/components/recipe-actions";
import type { Recipe } from "@/lib/domain/recipe/types";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Cafe da manha",
  almoco: "Almoco",
  jantar: "Jantar",
  lanche: "Lanche",
};

export default async function RejeitadasPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const showAll = all === "true";

  const recipeRepo = await getRecipeRepository();
  const userRepo = await getUserStateRepository();
  const userState = await getCurrentState(userRepo);

  const rejected = await recipeRepo.findByStatus(
    "rejeitada",
    showAll ? {} : { moduleId: userState.currentModuleId },
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Receitas rejeitadas</h1>
        <p className="text-sm text-muted-foreground">
          {showAll
            ? "Todas as receitas que voce rejeitou."
            : "Rejeitadas no modulo atual."}
        </p>
        <ScopeToggle showAll={showAll} />
      </header>

      {rejected.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma receita rejeitada por aqui.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rejected.map((recipe) => (
            <li key={recipe.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    <Link href={`/receita/${recipe.id}`} className="hover:underline">
                      {recipe.title}
                    </Link>
                  </CardTitle>
                  <Badge variant="outline">Dif. {recipe.difficulty}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                    <Badge variant="secondary">{MEAL_LABEL[recipe.mealType]}</Badge>
                    <span>~{recipe.estimatedMinutes} min</span>
                  </div>
                  <RecipeActions recipeId={recipe.id} status={recipe.status} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ScopeToggle({ showAll }: { showAll: boolean }) {
  const href = showAll ? "/receitas/rejeitadas" : "/receitas/rejeitadas?all=true";
  const label = showAll ? "Mostrar so do modulo atual" : "Mostrar de todos os modulos";
  return (
    <Link href={href} className="text-xs text-muted-foreground hover:underline w-fit">
      {label}
    </Link>
  );
}

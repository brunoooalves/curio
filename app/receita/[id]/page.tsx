import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  getPracticeEventRepository,
  getRecipeRepository,
} from "@/lib/persistence/mongo/factories";
import { RecipeActions } from "@/components/recipe-actions";
import { formatRelativeTime } from "@/lib/domain/practice/formatRelativeTime";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { PracticeEvent } from "@/lib/domain/practice/types";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  lanche: "Lanche",
};

const STATUS_LABEL: Record<Recipe["status"], string> = {
  sugerida: "Sugerida",
  feita: "Concluída",
  rejeitada: "Rejeitada",
};

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipeRepo = await getRecipeRepository();
  const recipe = await recipeRepo.findById(id);
  if (!recipe) {
    notFound();
  }

  const eventRepo = await getPracticeEventRepository();
  const events = await eventRepo.listByRecipeId(recipe.id);
  const lastCompletion = events.find((e) => e.type === "completed") ?? null;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold leading-tight">{recipe.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{MEAL_LABEL[recipe.mealType]}</Badge>
          <Badge variant="outline">Dif. {recipe.difficulty}</Badge>
          <Badge variant="outline">~{recipe.estimatedMinutes} min</Badge>
          <Badge variant="outline">
            {recipe.servings} {recipe.servings === 1 ? "porção" : "porções"}
          </Badge>
          <Badge variant={recipe.status === "rejeitada" ? "destructive" : "default"}>
            {STATUS_LABEL[recipe.status]}
          </Badge>
        </div>
        {recipe.status === "feita" && lastCompletion && (
          <CompletionSummary event={lastCompletion} />
        )}
      </header>

      <RecipeActions recipeId={recipe.id} status={recipe.status} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Ingredientes</h2>
        <ul className="flex flex-col gap-2 text-base">
          {recipe.ingredients.map((ing, i) => (
            <li key={`${ing.name}-${i}`} className="flex justify-between gap-4 border-b pb-2">
              <span>{ing.name}</span>
              <span className="text-muted-foreground">{ing.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Modo de preparo</h2>
        <ol className="flex flex-col gap-4 text-base leading-relaxed">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-semibold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function CompletionSummary({ event }: { event: PracticeEvent }) {
  return (
    <div className="rounded-md border border-muted-foreground/20 bg-muted/30 p-3 flex flex-col gap-1">
      <p className="text-sm">
        ✓ Concluída {formatRelativeTime(event.createdAt)}
      </p>
      {event.reflection && (
        <p className="text-sm text-muted-foreground italic">&ldquo;{event.reflection}&rdquo;</p>
      )}
    </div>
  );
}
